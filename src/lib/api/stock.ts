import { loadScript } from './jsonp';

export interface StockData {
    code: string;
    name: string;
    price: number;
    prevClose: number;
    percent: number;
}

/**
 * Validates and formats stock code with prefix (sh/sz).
 * If code is 6 digits, guesses prefix.
 */
export function formatStockCode(code: string): string {
    if (code.length === 6) {
        if (code.startsWith('6')) return `sh${code}`;
        if (code.startsWith('8') || code.startsWith('4')) return `bj${code}`;
        return `sz${code}`;
    }
    return code;
}

export async function fetchStocks(codes: string[]): Promise<Record<string, StockData>> {
    if (codes.length === 0) return {};

    // Deduplicate and format, but keep mapping back to original 6-digit code if possible
    const formattedCodes = Array.from(new Set(codes.map(formatStockCode)));
    const url = `https://hq.sinajs.cn/list=${formattedCodes.join(',')}`;

    try {
        await loadScript(url);

        const results: Record<string, StockData> = {};

        formattedCodes.forEach(fc => {
            const varName = `hq_str_${fc}`;
            // @ts-ignore
            const dataStr = window[varName] as string;

            if (dataStr) {
                const parts = dataStr.split(',');
                if (parts.length > 30) { // Standard Sina response is long
                    const name = parts[0];
                    const open = parseFloat(parts[1]);
                    const prevClose = parseFloat(parts[2]);
                    const current = parseFloat(parts[3]);
                    const price = current > 0 ? current : prevClose;

                    let percent = 0;
                    if (prevClose > 0) {
                        percent = ((price - prevClose) / prevClose) * 100;
                    }

                    // Use raw 6 digit code as key for easier lookup
                    const rawCode = fc.replace(/^(sh|sz|bj)/, '');

                    results[rawCode] = {
                        code: rawCode,
                        name,
                        price,
                        prevClose,
                        percent
                    };
                }
            }
        });

        return results;

    } catch (e) {
        console.error("Failed to fetch stocks", e);
        return {};
    }
}
