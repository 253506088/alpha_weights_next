const https = require('https');

const url = "https://timor.tech/api/holiday/year/2026";

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log("Code:", json.code);
            const holidays = json.holiday;
            // Print 02-17 specifically
            if (holidays['02-17']) {
                console.log("02-17 Data:", holidays['02-17']);
            } else {
                console.log("02-17 is missing!");
            }
        } catch (e) {
            console.error("Parse Error:", e.message);
        }
    });
}).on('error', (e) => {
    console.error("Error:", e.message);
});
