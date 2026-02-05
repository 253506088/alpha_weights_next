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

async function fetchFundName(code: string): Promise<string> {
    const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;
    return new Promise((resolve) => {
        const callbackName = 'jsonpgz';
        // @ts-ignore
        window[callbackName] = (data: any) => {
            if (data && data.name) {
                resolve(data.name);
            } else {
                resolve(`基金${code}`);
            }
        };

        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            resolve(`基金${code}`);
        };
        document.body.appendChild(script);
        // Clean up handled by specific implementation or simple append
        // For simplicity and since these are small requests, we let them append
        // But better to remove:
        script.onload = () => {
            document.body.removeChild(script);
        };
    });
}

async function _fetchFundInternal(fundCode: string): Promise<FundInfo | null> {
    // Parallel fetch: Name and Holdings
    // Note: fundgz also gives realtime estimate, but we calculate it ourselves.

    const namePromise = fetchFundName(fundCode);

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

    const fundName = await namePromise;

    if (holdings.length === 0 && fundName.startsWith("基金")) {
        // If both failed, return null
        return null;
    }

    return {
        code: fundCode,
        name: fundName,
        holdings
    };
}
