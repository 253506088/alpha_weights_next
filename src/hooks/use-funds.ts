"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { StorageManager, StoredFund } from "@/lib/storage";
import { fetchStocks, StockData } from "@/lib/api/stock";
import { fetchFundHoldings } from "@/lib/api/fund";
import { log, logGroup } from "@/lib/logger";

export interface FundWithEstimate extends StoredFund {
    estimate: number;
    lastPriceTime: string;
    estimatedNav?: number; // 预估净值 = dwjz * (1 + estimate/100)
    correction: number; // 修正涨跌幅
    correctionNav?: number; // 修正预估净值
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
                            stockRatio: info.stockRatio, // Update Stock Ratio
                            lastUpdate: Date.now()
                        };
                    }
                    return f;
                }));

                // Detailed Log
                const details = [
                    `基金名称: ${info.name} (${code})`,
                    `股票总仓位: ${info.stockRatio ?? '未获取'}%`,
                    `前十大持仓列表:`,
                    ...info.holdings.map((h, i) =>
                        `  ${i + 1}. [${h.code}] ${h.name} : ${(h.ratio * 100).toFixed(2)}%`
                    )
                ];
                logGroup("Action", `已更新持仓: ${code}`, details);
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
        checkDailyRefresh(loaded);
    }, []);

    const checkDailyRefresh = async (currentFunds: StoredFund[]) => {
        const now = new Date();
        const hour = now.getHours();
        const todayStr = now.toDateString();

        // Check if it's past 9:00 AM
        if (hour >= 9) {
            let needsRefresh = false;
            for (const f of currentFunds) {
                const lastUpdateDate = f.lastUpdate ? new Date(f.lastUpdate).toDateString() : "";
                if (lastUpdateDate !== todayStr) {
                    needsRefresh = true;
                    log("AutoUpdate", `基金 ${f.name} 数据已过期 (${lastUpdateDate} vs ${todayStr})，正在更新...`);
                }
            }

            if (needsRefresh) {
                // Refresh all one by one (or could be parallel but let's be safe)
                // We reuse updateFundHoldings but calling it in loop might trigger multiple state updates
                // Better to simple iterate and update.
                for (const f of currentFunds) {
                    const lastUpdateDate = f.lastUpdate ? new Date(f.lastUpdate).toDateString() : "";
                    if (lastUpdateDate !== todayStr) {
                        await updateFundHoldings(f.code);
                    }
                }
            }
        }
    };

    // Periodic daily check (every minute)
    useEffect(() => {
        const timer = setInterval(() => {
            checkDailyRefresh(funds);
        }, 60 * 1000);
        return () => clearInterval(timer);
    }, [funds]);

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

    // Helper: Check if current time is within trading hours
    const isTradingTime = () => {
        const now = new Date();
        const day = now.getDay();
        if (day === 0 || day === 6) return false; // Weekends

        const h = now.getHours();
        const m = now.getMinutes();
        const t = h * 100 + m;
        // 09:15 ~ 11:30
        // 13:00 ~ 15:30
        return (t >= 915 && t <= 1130) || (t >= 1300 && t <= 1530);
    };

    // Helper: Get effective timestamp for history (Map 11:31-12:59 -> 11:30, >15:30 -> 15:30)
    const getEffectiveTimestamp = () => {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const t = h * 100 + m;

        // 11:31 ~ 12:59 -> 11:30
        if (t > 1130 && t < 1300) {
            const d = new Date(now);
            d.setHours(11, 30, 0, 0);
            return d.getTime();
        }

        // > 15:30 -> 15:30
        if (t > 1530) {
            const d = new Date(now);
            d.setHours(15, 30, 0, 0);
            return d.getTime();
        }

        return now.getTime();
    };

    // Polling Logic
    const fetchAllPrices = useCallback(async (force?: boolean | unknown) => {
        if (funds.length === 0) return;

        // Force refresh if 'force' is true or an object (Event from click)
        const isForce = force === true || (typeof force === 'object' && force !== null);
        const trading = isTradingTime();

        // Skip if not trading time AND not forced
        if (!trading && !isForce) {
            return;
        }

        // Collect all stock codes
        const allCodes = new Set<string>();
        funds.forEach(f => {
            f.holdings.forEach(h => allCodes.add(h.code));
        });

        if (allCodes.size === 0) return;

        log("Polling", `正在获取 ${allCodes.size} 只股票行情 (${isForce ? "强制" : "自动"})`);
        const newPrices = await fetchStocks(Array.from(allCodes));
        setPrices(prev => ({ ...prev, ...newPrices }));

        // Record History loop
        const effectiveTime = getEffectiveTimestamp();

        funds.forEach(f => {
            let weightedChange = 0;
            const snapshot: any[] = [];

            f.holdings.forEach(h => {
                const stock = newPrices[h.code] || pricesRef.current[h.code];
                if (stock) {
                    weightedChange += stock.percent * h.ratio;
                    snapshot.push({
                        code: h.code,
                        // name: h.name, // Removed to save storage space
                        ratio: h.ratio,
                        percent: stock.percent,
                        price: stock.price
                    });
                }
            });
            StorageManager.appendFundHistory(f.code, weightedChange, snapshot, effectiveTime);
        });

    }, [funds]); // Removed prices dependency to prevent infinite loop

    useEffect(() => {
        fetchAllPrices(true); // Initial fetch on funds change (Force)

        const id = setInterval(() => fetchAllPrices(false), refreshInterval * 1000);
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
                    stockRatio: info.stockRatio, // Add stock ratio
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

    const updateConfig = (newInterval: number) => {
        if (newInterval < 30) newInterval = 30;
        setRefreshInterval(newInterval);
        StorageManager.saveConfig({ refreshInterval: newInterval });
        log("Config", `刷新间隔已设置为 ${newInterval}秒`);
    };

    const updateStockRatio = (code: string, ratio: number) => {
        setFunds(prev => {
            const newFunds = prev.map(f => f.code === code ? { ...f, stockRatio: ratio } : f);
            StorageManager.saveFunds(newFunds);
            return newFunds;
        });
        log("Action", `已修改基金 ${code} 仓位为 ${ratio}%`);
    };

    // Calculate Estimates
    const fundsWithEstimates: FundWithEstimate[] = funds.map(f => {
        let weightedChange = 0;
        let totalRatio = 0;

        f.holdings.forEach(h => {
            const stock = prices[h.code];
            if (stock) {
                weightedChange += stock.percent * h.ratio;
            }
            totalRatio += h.ratio;
        });

        // 预估净值 (Original)
        const estimatedNav = f.dwjz && f.dwjz > 0
            ? f.dwjz * (1 + weightedChange / 100)
            : undefined;

        // 修正估值 Calculation
        // Formula: (Estimate / Top10Ratio) * StockRatio
        let correction = 0;
        if (totalRatio > 0) {
            // Average change of the top 10 holdings
            const avgChange = weightedChange / totalRatio;

            // Apply stock position ratio (default 95% if missing)
            // f.stockRatio is e.g. 95 (meaning 95%) or 84.42
            // If user hasn't set it, default to 95
            const ratio = (f.stockRatio !== undefined && f.stockRatio !== null) ? f.stockRatio : 95;

            // Since avgChange is percent (e.g. -1.90), result is percent
            // avgChange * 0.95
            correction = avgChange * (ratio / 100);
        } else {
            // If no holdings or ratio 0, assume correction is same as estimate (0) or handle edge case
            correction = weightedChange;
        }

        const correctionNav = f.dwjz && f.dwjz > 0
            ? f.dwjz * (1 + correction / 100)
            : undefined;

        return {
            ...f,
            estimate: weightedChange,
            estimatedNav,
            correction,
            correctionNav,
            lastPriceTime: new Date().toLocaleTimeString()
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
        updateStockRatio,
        forceRefresh: fetchAllPrices
    };
}
