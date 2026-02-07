
const https = require('https');
const code = '260116';
const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`;

console.log(`Fetching ${url}...`);
https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
}).on('error', err => console.error(err));
