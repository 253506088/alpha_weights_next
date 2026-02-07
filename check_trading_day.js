
const https = require('https');

// Helper to fetch data
function fetchUrl(url, encoding = 'utf-8') {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = Buffer.alloc(0);
            res.on('data', chunk => data = Buffer.concat([data, chunk]));
            res.on('end', () => {
                resolve(data.toString()); // Simple conversion, might need iconv-lite for GBK if needed
            });
        }).on('error', err => reject(err));
    });
}

async function checkIndexDate() {
    // 1. Eastmoney Index Quote (qtimg) - JSONP style
    // http://push2.eastmoney.com/api/qt/stock/get?secid=1.000001&fields=f57,f58,f59,f107,f86
    // f57: code, f58: name, f59: preClose?, f86: time?, f107: date?
    // Let's use a known endpoint for simplicity

    // Using sina for simplicity as it's very standard: hq.sinajs.cn/list=s_sh000001
    // but eastmoney has: https://push2.eastmoney.com/api/qt/stock/get?secid=1.000001&ut=fa5fd1943c7b386f172d6893dbfba10b&fields=f86
    // f86 is usually the timestamp of the quote

    // Let's try Eastmoney K-line interface for the latest day
    const klineUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.000001&fields1=f1&fields2=f51&klt=101&fqt=1&end=20500101&lmt=1`;
    // klt=101 (daily), lmt=1 (limit 1)

    console.log(`Fetching ${klineUrl}...`);
    try {
        const raw = await fetchUrl(klineUrl);
        const data = JSON.parse(raw);
        if (data && data.data && data.data.klines) {
            const lastLine = data.data.klines[0]; // "2026-02-06,..."
            const dateStr = lastLine.split(',')[0];
            console.log("Index (000001) Last Trading Day:", dateStr);
        } else {
            console.log("Failed to parse kline data", raw);
        }
    } catch (e) {
        console.error("Error fetching kline:", e.message);
    }
}

checkIndexDate();
