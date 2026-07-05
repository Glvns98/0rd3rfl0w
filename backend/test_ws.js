const WebSocket = require('ws');

const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

ws.on('open', () => {
    console.log("Connected");
    ws.send(JSON.stringify({
        "op": "subscribe",
        "args": [
            { "channel": "books", "instId": "BTC-USDT-SWAP" }
        ]
    }));
});

let msgCount = 0;
ws.on('message', (data) => {
    msgCount++;
    console.log(`Msg ${msgCount}:`, data.toString().substring(0, 300));
    if (msgCount > 3) process.exit(0);
});

ws.on('error', (err) => console.error(err));
