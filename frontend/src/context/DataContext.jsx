import React, { createContext, useContext, useEffect, useState, useRef } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({
    availableSymbols: [],
    currentSymbol: 'BTC-USDT-SWAP',
    trades: [],
    orderbook: { bids: [], asks: [] },
    footprint: { current: null, history: [] },
    stats: {
      cumulativeDelta: 0,
      sessionDelta: 0,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      maxDelta: 0,
      minDelta: 0,
      open: null,
      high: null,
      low: null,
      close: null,
      largeLots: 0,
      hftCount: 0,
      imbalanceRatio: 0,
      momentum: "Neutral",
      absorption: "Normal"
    },
    volumeProfile: { poc: null, vah: null, val: null, profile: [] },
    connected: false
  });

  const wsRef = useRef(null);

  const setSymbol = (symbol) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_symbol', symbol }));
      setData(prev => ({ ...prev, currentSymbol: symbol }));
    }
  };

  useEffect(() => {
    let reconnectTimer;

    const connect = () => {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to local Data Engine.');
        setData(prev => ({ ...prev, connected: true }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'SNAPSHOT') {
            setData(prev => ({
              ...prev,
              availableSymbols: payload.data.availableSymbols || prev.availableSymbols,
              currentSymbol: payload.data.currentSymbol || prev.currentSymbol,
              trades: payload.data.trades || [],
              orderbook: payload.data.orderbook || { bids: [], asks: [] },
              footprint: payload.data.footprint || { current: null, history: [] },
              stats: payload.data.stats || prev.stats,
              volumeProfile: payload.data.volumeProfile || { poc: null, vah: null, val: null, profile: [] }
            }));
          } else if (payload.type === 'UPDATE') {
            if (payload.data.currentSymbol && payload.data.currentSymbol !== wsRef.current?.symbolSent) {
               // Optional: ensure payload matches what we requested.
            }
            setData(prev => ({
              ...prev,
              currentSymbol: payload.data.currentSymbol || prev.currentSymbol,
              trades: payload.data.trades || [],
              orderbook: payload.data.orderbook || { bids: [], asks: [] },
              footprint: payload.data.footprint || { current: null, history: [] },
              stats: payload.data.stats || prev.stats,
              volumeProfile: payload.data.volumeProfile || { poc: null, vah: null, val: null, profile: [] }
            }));
          }
        } catch (err) {
          console.error("Error parsing websocket message", err);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from Data Engine. Reconnecting...');
        setData(prev => ({ ...prev, connected: false }));
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <DataContext.Provider value={{ ...data, setSymbol }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
