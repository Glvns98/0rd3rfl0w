const https = require('https');

https.get('https://www.okx.com/api/v5/public/instruments?instType=SWAP', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const parsed = JSON.parse(data);
        console.log("Total SWAP pairs:", parsed.data.length);
        console.log("First 5:", parsed.data.slice(0, 5).map(i => i.instId));
    });
}).on('error', console.error);
