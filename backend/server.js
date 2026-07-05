const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the compiled React static files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Routes can go here...

// Catch-all route to serve the React app for any undefined routes (supports React Router)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

// --- TICK CONFIGURATION ---
const CANDLE_INTERVAL_MS = 60000; // 1-minute candles
const MAX_TRADES = 100;

// --- STATE MANAGEMENT ---
let markets = {}; // { [instId]: { recentTrades, orderbook, footprintCandles, currentCandle, sessionStats, sessionProfile } }
let availableSymbols = [];

function initMarketState(instId) {
    if (!markets[instId]) {
        markets[instId] = {
            recentTrades: [],
            orderbook: { bids: [], asks: [] },
            footprintCandles: [],
            currentCandle: null,
            sessionStats: {
                cumulativeDelta: 0, sessionDelta: 0, buyVolume: 0, sellVolume: 0,
                totalVolume: 0, maxDelta: 0, minDelta: 0, open: null,
                high: -Infinity, low: Infinity, close: null, largeLots: 0,
                hftCount: 0, imbalanceRatio: 0, momentum: "Neutral", absorption: "Normal"
            },
            sessionProfile: {}
        };
    }
}

// Helper: Round to nearest tick size
function roundToTick(price, tick) {
    return (Math.round(price / tick) * tick).toFixed(4); // some alts need more decimals
}

function processTrade(trade, instId) {
    const market = markets[instId];
    if (!market) return;

    const rawPrice = parseFloat(trade.px);
    let tickSize = 0.50;
    if (rawPrice < 10) tickSize = 0.001;
    else if (rawPrice < 100) tickSize = 0.01;
    else if (rawPrice < 1000) tickSize = 0.1;
    
    const size = parseFloat(trade.sz);
    const side = trade.side; // 'buy' or 'sell'
    const ts = parseInt(trade.ts);
    
    const priceFloat = Math.round(rawPrice / tickSize) * tickSize;
    // Format to appropriate decimal places based on tickSize
    const decPlaces = tickSize < 1 ? tickSize.toString().split('.')[1].length : 0;
    const priceStr = priceFloat.toFixed(decPlaces);

    // 1. Update Tape
    market.recentTrades.unshift({ price: rawPrice.toFixed(decPlaces + 1), size, side, ts });
    if (market.recentTrades.length > MAX_TRADES) market.recentTrades.pop();

    // 2. Update Session Stats
    const stats = market.sessionStats;
    if (stats.open === null) stats.open = priceFloat;
    stats.close = priceFloat;
    if (priceFloat > stats.high) stats.high = priceFloat;
    if (priceFloat < stats.low) stats.low = priceFloat;

    stats.totalVolume += size;
    if (side === 'buy') {
        stats.buyVolume += size;
        stats.sessionDelta += size;
        stats.cumulativeDelta += size;
    } else {
        stats.sellVolume += size;
        stats.sessionDelta -= size;
        stats.cumulativeDelta -= size;
    }
    
    if (stats.sessionDelta > stats.maxDelta) stats.maxDelta = stats.sessionDelta;
    if (stats.sessionDelta < stats.minDelta) stats.minDelta = stats.sessionDelta;

    if (size > (10000 / rawPrice)) stats.largeLots += 1; // Approx $10k+ order
    if (ts - (market.recentTrades[1]?.ts || ts) < 50) stats.hftCount += 1; 
    
    stats.imbalanceRatio = stats.totalVolume > 0 ? (Math.abs(stats.sessionDelta) / stats.totalVolume) * 100 : 0;
    
    const recentDeltaSum = market.recentTrades.slice(0, 10).reduce((acc, t) => acc + (t.side === 'buy' ? t.size : -t.size), 0);
    if (recentDeltaSum > 0 && stats.sessionDelta < 0) stats.absorption = "Buy Absorb";
    else if (recentDeltaSum < 0 && stats.sessionDelta > 0) stats.absorption = "Sell Absorb";
    else stats.absorption = "Normal";

    stats.momentum = recentDeltaSum > 0 ? "Bullish" : (recentDeltaSum < 0 ? "Bearish" : "Neutral");

    // 3. Update Session Profile
    if (!market.sessionProfile[priceStr]) market.sessionProfile[priceStr] = 0;
    market.sessionProfile[priceStr] += size;

    // 4. Update Footprint
    if (!market.currentCandle || ts - market.currentCandle.startTime >= CANDLE_INTERVAL_MS) {
        if (market.currentCandle) {
            market.footprintCandles.unshift(market.currentCandle);
            if (market.footprintCandles.length > 50) market.footprintCandles.pop();
        }
        market.currentCandle = {
            startTime: ts, open: priceFloat, high: priceFloat, low: priceFloat,
            close: priceFloat, volume: 0, delta: 0, levels: {}
        };
    }

    const candle = market.currentCandle;
    candle.close = priceFloat;
    if (priceFloat > candle.high) candle.high = priceFloat;
    if (priceFloat < candle.low) candle.low = priceFloat;
    candle.volume += size;
    
    if (side === 'buy') candle.delta += size;
    else candle.delta -= size;

    if (!candle.levels[priceStr]) candle.levels[priceStr] = { price: priceStr, bid: 0, ask: 0, volume: 0 };
    
    candle.levels[priceStr].volume += size;
    if (side === 'buy') candle.levels[priceStr].ask += size;
    else candle.levels[priceStr].bid += size;
}

function calculateValueArea(instId) {
    const market = markets[instId];
    if (!market) return { vah: null, poc: null, val: null, profile: [] };

    let pocPrice = null;
    let maxVol = -1;
    let totalVol = 0;
    
    const sortedLevels = Object.keys(market.sessionProfile).sort((a, b) => parseFloat(b) - parseFloat(a));
    if (sortedLevels.length === 0) return { vah: null, poc: null, val: null, profile: [] };

    const profileArr = [];

    sortedLevels.forEach(p => {
        const vol = market.sessionProfile[p];
        totalVol += vol;
        profileArr.push({ price: parseFloat(p), volume: vol });
        if (vol > maxVol) {
            maxVol = vol;
            pocPrice = parseFloat(p);
        }
    });

    const targetVol = totalVol * 0.70;
    let currentVol = maxVol;
    
    let pocIndex = profileArr.findIndex(l => l.price === pocPrice);
    let upIdx = pocIndex - 1; 
    let downIdx = pocIndex + 1; 
    
    while (currentVol < targetVol && (upIdx >= 0 || downIdx < profileArr.length)) {
        let upVol = upIdx >= 0 ? profileArr[upIdx].volume : -1;
        let downVol = downIdx < profileArr.length ? profileArr[downIdx].volume : -1;
        
        if (upVol >= downVol && upVol !== -1) {
            currentVol += upVol;
            upIdx--;
        } else if (downVol !== -1) {
            currentVol += downVol;
            downIdx++;
        } else {
            break;
        }
    }

    const vahIdx = Math.max(0, upIdx + 1);
    const valIdx = Math.min(profileArr.length - 1, downIdx - 1);

    return {
        poc: pocPrice,
        vah: profileArr[vahIdx]?.price || null,
        val: profileArr[valIdx]?.price || null,
        profile: profileArr
    };
}

function processOrderbook(data, action, instId) {
    const market = markets[instId];
    if (!market || !data || data.length === 0) return;
    
    if (action === 'snapshot') {
        market.orderbook.bids = data[0].bids.map(b => ({ price: b[0], size: parseFloat(b[1]) }));
        market.orderbook.asks = data[0].asks.map(a => ({ price: a[0], size: parseFloat(a[1]) }));
    } else if (action === 'update') {
        const mergeBook = (current, updates) => {
            let map = new Map(current.map(item => [item.price, item.size]));
            updates.forEach(u => {
                if (parseFloat(u[1]) === 0) {
                    map.delete(u[0]);
                } else {
                    map.set(u[0], parseFloat(u[1]));
                }
            });
            return Array.from(map.entries())
                .map(([price, size]) => ({ price, size }));
        };
        
        market.orderbook.bids = mergeBook(market.orderbook.bids, data[0].bids).sort((a,b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 100);
        market.orderbook.asks = mergeBook(market.orderbook.asks, data[0].asks).sort((a,b) => parseFloat(a.price) - parseFloat(b.price)).slice(0, 100);
    }
}

// --- INITIALIZATION ---
function initializeBackend() {
    console.log("Fetching OKX Instruments...");
    https.get('https://www.okx.com/api/v5/public/instruments?instType=SWAP', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                const usdtSwaps = parsed.data.filter(i => i.instId.endsWith('-USDT-SWAP')).map(i => i.instId);
                availableSymbols = usdtSwaps;
                
                console.log(`Found ${usdtSwaps.length} USDT-SWAP pairs. Initializing markets...`);
                usdtSwaps.forEach(instId => initMarketState(instId));
                
                connectOKX(usdtSwaps);
            } catch(e) {
                console.error("Failed to parse instruments", e);
            }
        });
    }).on('error', console.error);
}

// --- OKX WEBSOCKET CONNECTION ---
function connectOKX(symbols) {
    console.log(`Connecting to OKX WebSocket and subscribing to ${symbols.length} pairs...`);
    const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

    ws.on('open', () => {
        console.log("OKX Connected. Batch subscribing...");
        
        // Chunk subscriptions to avoid hitting max payload limits per message
        const chunkSize = 50; // 50 pairs = 100 args per request (OKX max)
        let delay = 0;
        for (let i = 0; i < symbols.length; i += chunkSize) {
            const chunk = symbols.slice(i, i + chunkSize);
            const args = [];
            chunk.forEach(sym => {
                args.push({ "channel": "trades", "instId": sym });
                args.push({ "channel": "books", "instId": sym });
            });
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ "op": "subscribe", "args": args }));
                }
            }, delay);
            delay += 250; // stagger requests by 250ms
        }
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.event === 'subscribe' || !msg.arg) return;

            const instId = msg.arg.instId;
            if (msg.arg.channel === 'trades' && msg.data) {
                msg.data.forEach(trade => processTrade(trade, instId));
            } else if (msg.arg.channel === 'books' && msg.data) {
                processOrderbook(msg.data, msg.action, instId);
            }
        } catch (e) {
            // console.error("Error parsing message");
        }
    });

    ws.on('close', () => {
        console.log("OKX WebSocket closed. Reconnecting...");
        setTimeout(() => connectOKX(symbols), 3000);
    });
    ws.on('error', (err) => {
        console.error("OKX WebSocket error:", err);
        ws.close();
    });
}

// --- FRONTEND WEBSOCKET SERVER ---
wss.on('connection', (ws) => {
    // Default symbol
    ws.currentSymbol = 'BTC-USDT-SWAP';

    const sendSnapshot = () => {
        const market = markets[ws.currentSymbol];
        if (!market) return;
        ws.send(JSON.stringify({
            type: 'SNAPSHOT',
            data: {
                availableSymbols,
                currentSymbol: ws.currentSymbol,
                trades: market.recentTrades,
                orderbook: market.orderbook,
                footprint: { current: market.currentCandle, history: market.footprintCandles },
                stats: market.sessionStats,
                volumeProfile: calculateValueArea(ws.currentSymbol)
            }
        }));
    };

    // Send immediately on connect. Symbols might not be fetched yet, but wait, if it's not ready, market is undefined.
    // It's safer to send what we have, the interval will catch up.
    sendSnapshot();

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.action === 'set_symbol' && msg.symbol && markets[msg.symbol]) {
                ws.currentSymbol = msg.symbol;
                sendSnapshot();
            }
        } catch(e) {}
    });
});

// Throttle broadcasts to 10 FPS (100ms)
setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.currentSymbol) {
            const market = markets[client.currentSymbol];
            if (market) {
                const payload = JSON.stringify({
                    type: 'UPDATE',
                    data: {
                        currentSymbol: client.currentSymbol,
                        trades: market.recentTrades.slice(0, 50),
                        orderbook: market.orderbook,
                        footprint: { current: market.currentCandle, history: market.footprintCandles },
                        stats: market.sessionStats,
                        volumeProfile: calculateValueArea(client.currentSymbol)
                    }
                });
                client.send(payload);
            }
        }
    });
}, 100);

initializeBackend();

server.listen(PORT, () => {
    console.log(`Backend API and WebSocket server running on http://localhost:${PORT}`);
});
