import { loadScript } from './jsonp';

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
interface FundBasicInfo {
    name: string;
    dwjz: number | null; // 昨日净值
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
                    dwjz: isNaN(dwjz as number) ? null : dwjz
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
    // Parallel fetch: Name and Holdings
    // Note: fundgz also gives realtime estimate, but we calculate it ourselves.

    const basicInfoPromise = fetchFundBasicInfo(fundCode);

    // Reset global apidata for holdings fetch
    // @ts-ignore
    window.apidata = undefined;
    const holdingsUrl = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${fundCode}&topline=10&year=&month=&rt=${Date.now()}`;

    // Load holdings script
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

                    // Eastmoney Format:
                    // Col 1: Code (in <a>)
                    // Col 2: Name (text)
                    // Col 3+: Possible Ratio

                    const codeText = cols[1]?.textContent?.trim() || "";
                    const nameText = cols[2]?.textContent?.trim() || "";

                    // Ratio usually at index 6 or last. 
                    // Let's iterate to find '%'
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
                                name: nameText,
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

    // Fetch Stock Ratio from pingzhongdata
    // This file defines 'var Data_fundSharesPositions = [...]'
    // We are already inside a queue lock, so it's safe to use globals
    let stockRatio: number | undefined = undefined;
    try {
        // @ts-ignore
        window.Data_fundSharesPositions = undefined;
        // Use https to avoid mixed content
        await loadScript(`https://fund.eastmoney.com/pingzhongdata/${fundCode}.js`);

        // @ts-ignore
        const positions = window.Data_fundSharesPositions;
        if (Array.isArray(positions) && positions.length > 0) {
            const latest = positions[positions.length - 1];
            // Format: [timestamp, ratio] e.g. [1770134400000, 84.42]
            if (Array.isArray(latest) && typeof latest[1] === 'number') {
                stockRatio = latest[1];
            }
        }
    } catch (e) {
        console.warn("Failed to fetch stock ratio", e);
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
