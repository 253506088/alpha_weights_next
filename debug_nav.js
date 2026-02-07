
const https = require('https');

const code = '260116';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function test() {
    console.log(`Testing fund ${code}...`);

    // 1. fundgz (Current source)
    // Note: fundgz is http, but node requires http module for http. 
    // The previous code in `src` uses browser fetch or script loading.
    // Let's try to fetch it via https if possible, or use http module if needed.
    // Actually standard valid url is http://fundgz.1234567.com.cn/...

    // I will use a simple implementation that handles both or just valid ones.
    // Let's check pingzhongdata first as it is https.

    try {
        const pingzhongUrl = `https://fund.eastmoney.com/pingzhongdata/${code}.js?rt=${Date.now()}`;
        console.log(`Fetching ${pingzhongUrl}`);
        const pzData = await fetchUrl(pingzhongUrl);

        // Check for Data_netWorthTrend
        // var Data_netWorthTrend = [{"x":1738771200000,"y":3.985,"equityReturn":...,"unitMoney":"..."}...]
        const match = pzData.match(/Data_netWorthTrend\s*=\s*(\[.*?\]);/);
        if (match) {
            const trend = JSON.parse(match[1]);
            const latest = trend[trend.length - 1];
            const prev = trend[trend.length - 2];
            console.log("PingZhong Latest:", new Date(latest.x).toLocaleDateString(), latest.y);
            console.log("PingZhong Prev:", new Date(prev.x).toLocaleDateString(), prev.y);
        } else {
            console.log("PingZhong: Data_netWorthTrend not found");
        }

    } catch (e) {
        console.error("PingZhong Error:", e.message);
    }
}

test();
