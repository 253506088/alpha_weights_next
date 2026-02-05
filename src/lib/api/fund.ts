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

async function _fetchFundInternal(fundCode: string): Promise<FundInfo | null> {
    // Reset global apidata
    // @ts-ignore
    window.apidata = undefined;

    const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${fundCode}&topline=10&year=&month=&rt=${Date.now()}`;

    try {
        await loadScript(url);

        // @ts-ignore
        const data = window.apidata;
        if (!data || !data.content) {
            console.warn(`No data for fund ${fundCode}`);
            return null;
        }

        const content = data.content as string;

        // Parse HTML content using DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        const rows = doc.querySelectorAll('tr');
        const holdings: FundHolding[] = [];

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].querySelectorAll('td');
            if (cols.length < 3) continue;

            // Eastmoney format changes sometimes, but usually:
            // Code is in a link <a>code</a>
            // Name is text
            // Ratio is text like "5.23%"

            // Try to find code, likely 6 digits
            const codeText = cols[1]?.textContent?.trim() || "";
            const nameText = cols[2]?.textContent?.trim() || "";
            const ratioText = cols[6]?.textContent?.trim() || ""; // Originally idx 6 often

            // Simple validation
            if (codeText && ratioText.includes('%')) {
                holdings.push({
                    code: codeText,
                    name: nameText,
                    ratio: parseFloat(ratioText.replace('%', '')) / 100
                });
            }
        }

        // Since this API doesn't give clean Fund Name, we might need another way or just generic
        // Actually the page title or content might have it
        // "<h4>[易方达优质精选混合(QDII)](...)"
        let fundName = `基金${fundCode}`;
        const titleHeader = doc.querySelector('h4');
        if (titleHeader) {
            // Extract "易方达优质精选..." from "<h4>[Name](link)..."
            const match = titleHeader.textContent?.match(/\[(.*?)\]/);
            if (match) fundName = match[1];
        }

        return {
            code: fundCode,
            name: fundName,
            holdings
        };

    } catch (e) {
        console.error(`Failed to fetch fund ${fundCode}`, e);
        return null;
    }
}
