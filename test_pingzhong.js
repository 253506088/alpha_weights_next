
const http = require('http');

const url = "http://fund.eastmoney.com/pingzhongdata/161217.js";

http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // 1. Analyze Stock Position Dates
        const match = data.match(/var Data_fundSharesPositions = (\[.*?\]\]);/);
        if (match && match[1]) {
            try {
                const positions = JSON.parse(match[1]);
                console.log("--- Stock Positions (Last 3) ---");
                const last3 = positions.slice(-3);
                last3.forEach(p => {
                    const date = new Date(p[0]);
                    console.log(`Date: ${date.toLocaleDateString()} (${p[0]}), Ratio: ${p[1]}%`);
                });
            } catch (e) {
                console.error("Parse error positions", e);
            }
        }

        // 2. Overview of other fields
        console.log("\n--- Other Available Fields ---");
        const keys = [
            "fS_name", "fS_code", "fund_sourceRate", "fund_Rate",
            "stockCodes", "syl_1n", "syl_6y", "syl_3y", "syl_1y"
        ];

        keys.forEach(key => {
            const regex = new RegExp(`var ${key}\\s*=\\s*(.*?);`);
            const m = data.match(regex);
            if (m) console.log(`${key}: ${m[1]}`);
        });

    });
}).on('error', err => {
    console.error(err);
});
