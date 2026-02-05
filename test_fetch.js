
const http = require('http');

const url = "http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=161217&topline=10";

const options = {
    headers: {
        'Referer': 'http://fundf10.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

http.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Extract content from "var apidata = { content: ... }"
        // It's usually eval-able or JSON-like
        console.log(data);
    });
}).on('error', err => {
    console.error(err);
});

