import { loadScript } from './jsonp';
import { HolidayManager } from './holiday';
import { log } from '../logger';


export interface FundHolding {
    code: string;
    name: string;
    ratio: number; // 0.05 for 5%
}

export interface FundInfo {
    code: string;
    name: string;
    holdings: FundHolding[];
    lastUpdate?: string;
    dwjz?: number; // 昨日净值 (单位净值)
    stockRatio?: number; // 股票仓位 (0-100)
}

// 基金基本信息（从估算接口获取）
// 基金基本信息（从估算接口获取）
interface FundBasicInfo {
    name: string;
    dwjz: number | null; // 昨日净值
    date?: string; // 净值日期
}

// Global variable lock to prevent race conditions since Eastmoney uses a single 'apidata' variable
let isFetchingLine = false;
const queue: (() => Promise<void>)[] = [];

async function processQueue() {
    if (isFetchingLine) return;
    const next = queue.shift();
    if (next) {
        isFetchingLine = true;
        try {
            await next();
        } finally {
            isFetchingLine = false;
            processQueue();
        }
    }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        queue.push(async () => {
            try {
                const res = await task();
                resolve(res);
            } catch (e) {
                reject(e);
            }
        });
        processQueue();
    });
}

export async function fetchFundHoldings(fundCode: string): Promise<FundInfo | null> {
    // We must queue this because they all write to 'window.apidata'
    return enqueue(() => _fetchFundInternal(fundCode));
}

// 获取基金基本信息：名称和昨日净值
async function fetchFundBasicInfo(code: string): Promise<FundBasicInfo> {
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
    return new Promise((resolve) => {
        const callbackName = 'jsonpgz';
        // @ts-ignore
        window[callbackName] = (data: any) => {
            if (data) {
                const dwjz = data.dwjz ? parseFloat(data.dwjz) : null;
                resolve({
                    name: data.name || `基金${code}`,
                    dwjz: isNaN(dwjz as number) ? null : dwjz,
                    date: data.jzrq // 2026-02-05
                });
            } else {
                resolve({ name: `基金${code}`, dwjz: null });
            }
        };

        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            resolve({ name: `基金${code}`, dwjz: null });
        };
        document.body.appendChild(script);
        script.onload = () => {
            document.body.removeChild(script);
        };
    });
}

async function _fetchFundInternal(fundCode: string): Promise<FundInfo | null> {

    // 1. Holiday Check & Target Date Calculation
    await HolidayManager.checkAndCacheHolidays();

    const today = new Date();
    const targetDate = HolidayManager.getLastTradingDay(today);

    const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const targetDateStr = formatDate(targetDate);

    const isTodayTrading = HolidayManager.isTradingDay(today);
    if (!isTodayTrading) {
        // Just log, we still fetch best available data
        log("FundAPI", `今天是 ${formatDate(today)} (非交易日/节假日)，目标数据日期: ${targetDateStr}`);
    }

    const basicInfoPromise = fetchFundBasicInfo(fundCode);

    // 2. Fetch Holdings
    // Reset global apidata for holdings fetch
    // @ts-ignore
    window.apidata = undefined;
    const holdingsUrl = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${fundCode}&topline=10&year=&month=&rt=${Date.now()}`;

    let holdings: FundHolding[] = [];
    try {
        await loadScript(holdingsUrl);
        // @ts-ignore
        const data = window.apidata;
        if (data && data.content) {
            const content = data.content as string;
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            // Fix: Only select the first table (latest data) to avoid duplicates from historical tables
            const firstTable = doc.querySelector('table');

            if (firstTable) {
                const rows = firstTable.querySelectorAll('tr');

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].querySelectorAll('td');
                    if (cols.length < 3) continue;

                    const codeText = cols[1]?.textContent?.trim() || "";
                    const nameText = cols[2]?.textContent?.trim() || "";

                    // Ratio usually at index 6 or last. 
                    let ratioText = "";
                    for (let j = 3; j < cols.length; j++) {
                        if (cols[j].textContent?.includes('%')) {
                            ratioText = cols[j].textContent || "";
                            break;
                        }
                    }

                    if (codeText && ratioText.includes('%')) {
                        const ratioVal = parseFloat(ratioText.replace('%', ''));
                        if (!isNaN(ratioVal)) {
                            holdings.push({
                                code: codeText,
                                name: nameText, // Assuming simple text name
                                ratio: ratioVal / 100
                            });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Error fetching holdings", e);
    }

    const basicInfo = await basicInfoPromise;

    // 3. Fetch Stock Ratio & PingZhong Data (NAV Correction)
    let stockRatio: number | undefined = undefined;

    try {
        // @ts-ignore
        window.Data_fundSharesPositions = undefined;
        // @ts-ignore
        window.Data_netWorthTrend = undefined;

        // Use https to avoid mixed content
        await loadScript(`https://fund.eastmoney.com/pingzhongdata/${fundCode}.js`);

        // 3.1 Stock Ratio
        // @ts-ignore
        const positions = window.Data_fundSharesPositions;
        if (Array.isArray(positions) && positions.length > 0) {
            const latest = positions[positions.length - 1];
            // Format: [timestamp, ratio] e.g. [1770134400000, 84.42]
            if (Array.isArray(latest) && typeof latest[1] === 'number') {
                stockRatio = latest[1];
            }
        }

        // 3.2 NAV Correction (The Fix)
        // @ts-ignore
        const trend = window.Data_netWorthTrend;
        if (Array.isArray(trend) && trend.length > 0) {
            const latestTrend = trend[trend.length - 1];
            // Format: {x: timestamp, y: netValue, ...}
            if (latestTrend && typeof latestTrend.y === 'number') {
                const trendDate = new Date(latestTrend.x);
                const trendDateStr = formatDate(trendDate);

                // Compare with basicInfo date
                // Priority:
                // 1. If basicInfo (Realtime) date >= targetDate -> Use basicInfo (It is up to date).
                // 2. Else if basicInfo date < targetDate:
                //    - Check Trend (PingZhong).
                //    - If Trend date > basicInfo date -> Use Trend.
                //    - If Trend date == basicInfo date -> Use Trend (PingZhong is confirmed close, fundgz might be estimate? dwjz is usually confirmed though. But user said fundgz is old.)

                const basicDateStr = basicInfo.date; // "2026-02-05"

                if (basicDateStr) {
                    if (basicDateStr < targetDateStr) {
                        // Fundgz is stale (older than target logic)
                        if (trendDateStr > basicDateStr) {
                            // Trend is newer!
                            if (basicInfo.dwjz !== latestTrend.y) {
                                log("FundAPI", `纠正净值 (${fundCode}): ${basicInfo.dwjz} (${basicDateStr}) -> ${latestTrend.y} (${trendDateStr})`);
                                basicInfo.dwjz = latestTrend.y;
                            }
                        } else if (trendDateStr === basicDateStr) {
                            // Both are same date.
                            // User experience: PingZhong (3.985) vs Fundgz (3.982). Date same?
                            // In step 76 log: fundgz said "jzrq":"2026-02-05","dwjz":"3.9820".
                            // In step 46 log: pingzhong said 2026/2/6 3.985.
                            // So PingZhong date (02-06) > Fundgz date (02-05).
                            // So the logic `trendDateStr > basicDateStr` will catch it.
                        }
                    } else {
                        // basicInfo is up to date (>= target). 
                        // Keep it.
                    }
                } else {
                    // No date in basic info? Fallback to PingZhong if available.
                    basicInfo.dwjz = latestTrend.y;
                }
            }
        }
    } catch (e) {
        console.warn("Failed to fetch pingzhong data", e);
    }

    if (holdings.length === 0 && basicInfo.name.startsWith("基金")) {
        // If both failed, return null
        return null;
    }

    return {
        code: fundCode,
        name: basicInfo.name,
        holdings,
        dwjz: basicInfo.dwjz ?? undefined,
        stockRatio
    };
}
