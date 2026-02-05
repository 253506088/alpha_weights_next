"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { StorageManager, StoredFund } from "@/lib/storage";
import { fetchStocks, StockData } from "@/lib/api/stock";
import { fetchFundHoldings } from "@/lib/api/fund";
import { log } from "@/lib/logger";

export interface FundWithEstimate extends StoredFund {
    estimate: number;
    lastPriceTime: string;
    estimatedNav?: number; // 预估净值 = dwjz * (1 + estimate/100)
}

export function useFunds() {
    const [funds, setFunds] = useState<StoredFund[]>([]);
    const [prices, setPrices] = useState<Record<string, StockData>>({});
    const [loading, setLoading] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(60);

    const updateFundHoldings = async (code: string) => {
        setLoading(true);
        try {
            const info = await fetchFundHoldings(code);
            if (info) {
                setFunds(prev => prev.map(f => {
                    if (f.code === code) {
                        return {
                            ...f,
                            name: info.name,
                            holdings: info.holdings,
                            dwjz: info.dwjz ?? f.dwjz,
                            lastUpdate: Date.now()
                        };
                    }
                    return f;
                }));
                log("Action", `已更新持仓: ${code}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        const loaded = StorageManager.getFunds();
        const config = StorageManager.getConfig();
        setFunds(loaded);
        setRefreshInterval(config.refreshInterval);

        // Auto-update check: if lastUpdate is not today, update it
        const todayStr = new Date().toDateString();
        loaded.forEach(f => {
            const lastUpdateDate = f.lastUpdate ? new Date(f.lastUpdate).toDateString() : "";
            if (lastUpdateDate !== todayStr) {
                // Trigger update
                // We use the function logic but direct call since state might not be ready if we used the wrapper relying on 'funds' state? 
                // Actually the wrapper uses functional SetState (prev => ...), so it is safe to call even if 'funds' state in this scope is empty?
                // Yes, functional setState is safe.
                log("AutoUpdate", `基金 ${f.name} 数据已过期，正在更新...`);
                updateFundHoldings(f.code);
            }
        });
    }, []);

    // Save when funds change
    useEffect(() => {
        if (funds.length > 0) {
            StorageManager.saveFunds(funds);
        }
    }, [funds]);

    // Use Ref to access latest prices in callback without adding as dependency
    const pricesRef = useRef(prices);
    useEffect(() => {
        pricesRef.current = prices;
    }, [prices]);

    // Polling Logic
    const fetchAllPrices = useCallback(async () => {
        if (funds.length === 0) return;

        // Collect all stock codes
        const allCodes = new Set<string>();
        funds.forEach(f => {
            f.holdings.forEach(h => allCodes.add(h.code));
        });

        if (allCodes.size === 0) return;

        log("Polling", `正在获取 ${allCodes.size} 只股票行情`);
        const newPrices = await fetchStocks(Array.from(allCodes));
        setPrices(prev => ({ ...prev, ...newPrices }));

        // Record History loop
        const now = Date.now();
        // Throttle history saving? (Already throttled by refreshInterval >= 30s)

        funds.forEach(f => {
            let weightedChange = 0;
            const snapshot: any[] = [];

            f.holdings.forEach(h => {
                // Use newPrices first, fallback to ref
                const stock = newPrices[h.code] || pricesRef.current[h.code];
                if (stock) {
                    weightedChange += stock.percent * h.ratio;
                    snapshot.push({
                        code: h.code,
                        name: h.name,
                        ratio: h.ratio,
                        percent: stock.percent,
                        price: stock.price
                    });
                }
            });
            StorageManager.appendFundHistory(f.code, weightedChange, snapshot);
        });

    }, [funds]); // Removed prices dependency to prevent infinite loop

    useEffect(() => {
        fetchAllPrices(); // Initial fetch on funds change

        const id = setInterval(fetchAllPrices, refreshInterval * 1000);
        return () => clearInterval(id);
    }, [funds, refreshInterval, fetchAllPrices]);

    // Actions
    const addFund = async (code: string) => {
        if (funds.find(f => f.code === code)) {
            alert("基金已存在");
            return;
        }

        setLoading(true);
        log("Action", `正在添加基金 ${code}`);
        try {
            const info = await fetchFundHoldings(code);
            if (info) {
                const newFund: StoredFund = {
                    code: info.code,
                    name: info.name,
                    holdings: info.holdings,
                    dwjz: info.dwjz,
                    lastUpdate: Date.now()
                };
                setFunds(prev => [...prev, newFund]);
                log("Action", `基金添加成功: ${info.name}`);
            } else {
                alert("获取基金数据失败，请检查代码");
            }
        } catch (e) {
            console.error(e);
            alert("添加失败");
        } finally {
            setLoading(false);
        }
    };

    const removeFund = (code: string) => {
        if (confirm("确定删除该基金吗？")) {
            setFunds(prev => prev.filter(f => f.code !== code));
            log("Action", `已删除基金 ${code}`);
        }
    };

    // updateFundHoldings moved up

    const updateConfig = (newInterval: number) => {
        if (newInterval < 30) newInterval = 30;
        setRefreshInterval(newInterval);
        StorageManager.saveConfig({ refreshInterval: newInterval });
        log("Config", `刷新间隔已设置为 ${newInterval}秒`);
    };

    // Calculate Estimates
    const fundsWithEstimates: FundWithEstimate[] = funds.map(f => {
        let weightedChange = 0;
        let totalRatio = 0;

        f.holdings.forEach(h => {
            const stock = prices[h.code];
            // Note: h.ratio is 0.05 for 5%
            // stock.percent is 1.23 for 1.23%
            // contribution = 1.23 * 0.05
            if (stock) {
                weightedChange += stock.percent * h.ratio;
            }
            totalRatio += h.ratio;
        });

        // 计算预估净值
        const estimatedNav = f.dwjz && f.dwjz > 0
            ? f.dwjz * (1 + weightedChange / 100)
            : undefined;

        return {
            ...f,
            estimate: weightedChange,
            estimatedNav,
            lastPriceTime: new Date().toLocaleTimeString() // This is rough, ideally comes from stock data
        };
    });

    return {
        funds: fundsWithEstimates,
        stockPrices: prices,
        loading,
        addFund,
        removeFund,
        updateFundHoldings,
        refreshInterval,
        updateConfig,
        forceRefresh: fetchAllPrices
    };
}
