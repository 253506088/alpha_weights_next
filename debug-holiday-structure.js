const https = require('https');

const url = "https://timor.tech/api/holiday/info/2026-01-01"; // Check New Year 2026

console.log(`Fetching ${url}...`);

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("Response:");
        console.log(data);
    });
}).on('error', e => console.error(e));
