"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { StorageManager, StoredFund } from "@/lib/storage";
import { fetchStocks, StockData } from "@/lib/api/stock";
import { fetchFundHoldings } from "@/lib/api/fund";
import { log } from "@/lib/logger";

export interface FundWithEstimate extends StoredFund {
    estimate: number;
    lastPriceTime: string;
}

export function useFunds() {
    const [funds, setFunds] = useState<StoredFund[]>([]);
    const [prices, setPrices] = useState<Record<string, StockData>>({});
    const [loading, setLoading] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(60);

    // Initial load
    useEffect(() => {
        const loaded = StorageManager.getFunds();
        const config = StorageManager.getConfig();
        setFunds(loaded);
        setRefreshInterval(config.refreshInterval);
    }, []);

    // Save when funds change
    useEffect(() => {
        if (funds.length > 0) {
            StorageManager.saveFunds(funds);
        }
    }, [funds]);

    // Polling Logic
    const fetchAllPrices = useCallback(async () => {
        if (funds.length === 0) return;

        // Collect all stock codes
        const allCodes = new Set<string>();
        funds.forEach(f => {
            f.holdings.forEach(h => allCodes.add(h.code));
        });

        if (allCodes.size === 0) return;

        log("Polling", `Fetching prices for ${allCodes.size} stocks`);
        const newPrices = await fetchStocks(Array.from(allCodes));
        setPrices(prev => ({ ...prev, ...newPrices }));

        // Record History loop
        const now = Date.now();
        // Throttle history saving? (Already throttled by refreshInterval >= 30s)

        funds.forEach(f => {
            let weightedChange = 0;
            f.holdings.forEach(h => {
                const stock = newPrices[h.code] || prices[h.code];
                if (stock) {
                    weightedChange += stock.percent * h.ratio;
                }
            });
            StorageManager.appendFundHistory(f.code, weightedChange);
        });

    }, [funds, prices]); // Added prices dependency to ensure we have fallback data? Actually fetchStocks returns newPrices.

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
        log("Action", `Adding fund ${code}`);
        try {
            const info = await fetchFundHoldings(code);
            if (info) {
                const newFund: StoredFund = {
                    code: info.code,
                    name: info.name,
                    holdings: info.holdings,
                    lastUpdate: Date.now()
                };
                setFunds(prev => [...prev, newFund]);
                log("Action", `Fund added: ${info.name}`);
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
            log("Action", `Removed fund ${code}`);
        }
    };

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
                            lastUpdate: Date.now()
                        };
                    }
                    return f;
                }));
                log("Action", `Updated holdings for ${code}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = (newInterval: number) => {
        if (newInterval < 30) newInterval = 30;
        setRefreshInterval(newInterval);
        StorageManager.saveConfig({ refreshInterval: newInterval });
        log("Config", `Interval set to ${newInterval}s`);
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

        return {
            ...f,
            estimate: weightedChange,
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
