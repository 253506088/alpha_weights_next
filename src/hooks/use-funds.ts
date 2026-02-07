"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { StorageManager, StoredFund } from "@/lib/storage";
import { fetchStocks, StockData } from "@/lib/api/stock";
import { fetchFundHoldings } from "@/lib/api/fund";
import { HolidayManager } from "@/lib/api/holiday";
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
                    `昨日净值: ${info.dwjz ?? '未获取'}`,
                    `股票总仓位: ${info.stockRatio ?? '未获取'}%`,
                    `前十大持仓列表:`,
                    ...info.holdings.map((h, i) =>
                        `  ${i + 1}. [${h.code}] ${h.name} : ${(h.ratio * 100).toFixed(2)}%`
                    ),
                    `—————— 原始数据 (Raw Data) ——————`,
                    info
                ];
                logGroup("Action", `已更新持仓: ${code}`, details);
            } else {
                log("Action", `更新失败: 未能获取到基金 ${code} 的数据`);
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

    const isUpdatingAll = useRef(false);

    // Helper: Delay promise
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const updateAllFundHoldings = useCallback(async (force: boolean = false, fundsSource?: StoredFund[]) => {
        if (isUpdatingAll.current) {
            log("AutoUpdate", "Update already in progress, skipping...");
            return;
        }

        const now = new Date();
        const todayStr = now.toDateString();

        const currentFunds = fundsSource || funds;

        // Filter funds that need update
        const fundsToUpdate = force
            ? currentFunds
            : currentFunds.filter(f => {
                const lastUpdateDate = f.lastUpdate ? new Date(f.lastUpdate).toDateString() : "";
                return lastUpdateDate !== todayStr;
            });

        if (fundsToUpdate.length === 0) {
            if (force) alert("没有找到需要更新的基金");
            return;
        }

        isUpdatingAll.current = true;

        try {
            log("AutoUpdate", `开始批量更新 ${fundsToUpdate.length} 个基金...`);

            for (let i = 0; i < fundsToUpdate.length; i++) {
                const f = fundsToUpdate[i];
                log("AutoUpdate", `[${i + 1}/${fundsToUpdate.length}] 正在更新: ${f.name} (${f.code})`);

                try {
                    await updateFundHoldings(f.code);
                } catch (e) {
                    console.error(`Failed to update ${f.code}`, e);
                }

                // Delay 2s to avoid rate limits
                if (i < fundsToUpdate.length - 1) {
                    await delay(2000);
                }
            }
            log("AutoUpdate", "批量更新完成");

            // Trigger one final price fetch after all updates
            fetchAllPrices(true);

            if (force) alert("批量更新全部完成");
        } finally {
            isUpdatingAll.current = false;
        }
    }, [funds]); // Dependencies might need review if updateFundHoldings is stable

    const checkDailyRefresh = async (currentFunds: StoredFund[]) => {
        const now = new Date();
        const hour = now.getHours();

        // Check if it's past 9:00 AM
        if (hour >= 9) {
            // Trigger update all (non-force mode checks dates internally)
            // But we can't call useCallback'd updateAllFundHoldings easily here because of closure staleness if not careful?
            // Actually, checkDailyRefresh is called from useEffect which depends on funds.
            // But updateAllFundHoldings depends on funds too. 
            // We can just call it. But wait, updateAllFundHoldings uses 'funds' state.
            // 'currentFunds' passed here is 'funds'.

            // To be safe, we check condition here quickly to avoid calling the big function unnecessarily
            const todayStr = now.toDateString();
            const needsRefresh = currentFunds.some(f => {
                const lastUpdateDate = f.lastUpdate ? new Date(f.lastUpdate).toDateString() : "";
                return lastUpdateDate !== todayStr;
            });

            if (needsRefresh && !isUpdatingAll.current) {
                // We call the function. Since it effectively iterates 'funds', providing we have latest scope.
                // However, checkDailyRefresh is defined inside component? Yes. 
                // So it can call updateAllFundHoldings.
                updateAllFundHoldings(false, currentFunds);
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

    // 判断今天是否是交易日（使用 HolidayManager 检查节假日）
    const isTodayTradingDay = () => {
        return HolidayManager.isTradingDay(new Date());
    };

    // 判断当前是否在交易时段内
    const isTradingTime = () => {
        // 首先检查今天是否是交易日
        if (!isTodayTradingDay()) return false;

        const now = new Date();
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
        const todayIsTradingDay = isTodayTradingDay();
        const trading = isTradingTime();

        // 非交易日：即使强制刷新也跳过股票行情获取
        if (!todayIsTradingDay) {
            if (isForce) {
                log("Polling", "今天是非交易日，跳过股票行情获取");
            }
            return;
        }

        // 交易日但非交易时段：跳过（除非强制）
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
        // Suppress initial/update fetch if we are in batch update mode
        if (!isUpdatingAll.current) {
            fetchAllPrices(true); // Initial fetch on funds change (Force)
        }

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

                const details = [
                    `基金名称: ${info.name} (${code})`,
                    `昨日净值: ${info.dwjz ?? '未获取'}`,
                    `股票总仓位: ${info.stockRatio ?? '未获取'}%`,
                    `前十大持仓列表:`,
                    ...info.holdings.map((h, i) =>
                        `  ${i + 1}. [${h.code}] ${h.name} : ${(h.ratio * 100).toFixed(2)}%`
                    ),
                    `—————— 原始数据 (Raw Data) ——————`,
                    info
                ];
                logGroup("Action", `基金添加成功: ${info.name}`, details);
            } else {
                const msg = "获取基金数据失败，请检查代码";
                log("Action", msg);
                alert(msg);
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
        forceRefresh: fetchAllPrices,
        updateAllFundHoldings
    };
}
