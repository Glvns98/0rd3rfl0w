import React from 'react';
import { useData } from '../../context/DataContext';

const RightSidebar = () => {
  const { orderbook, stats } = useData();

  // Get 30 levels for side-by-side orderbook
  const asksList = (orderbook?.asks || []).slice(0, 30);
  const bidsList = (orderbook?.bids || []).slice(0, 30);
  
  // Calculate max sizes for the horizontal bars
  const maxBidSize = Math.max(...bidsList.map(b => parseFloat(b.size) || 0), 1);
  const maxAskSize = Math.max(...asksList.map(a => parseFloat(a.size) || 0), 1);

  // Align rows (in case one side has fewer levels)
  const rowCount = Math.max(asksList.length, bidsList.length);

  return (
    <div className="flex flex-col h-full bg-[#080C11] text-[11px] text-[#C4D0DB] border-l border-[#1A222C]">
      {/* DOM PANEL */}
      <div className="flex-1 flex flex-col border-b border-[#1A222C] bg-[#000000]">
        
        {/* Header */}
        <div className="h-11 flex items-center justify-between px-4 shrink-0 bg-[#06080A] border-b border-[#1A222C] uppercase tracking-widest">
          <div className="flex flex-col justify-center">
             <span className="text-white font-semibold text-[11px]">Market Depth</span>
             <span className="text-[#5A6B7C] text-[8px] tracking-normal font-medium leading-none mt-1">Split View</span>
          </div>
          <div className="flex gap-3 text-[#5A6B7C]">
            <span className="cursor-pointer hover:text-white transition-colors">⛶</span>
            <span className="cursor-pointer hover:text-white transition-colors">⚙</span>
            <span className="cursor-pointer hover:text-white transition-colors">✕</span>
          </div>
        </div>
        
        {/* Column Headers */}
        <div className="flex text-[#5A6B7C] bg-[#06080A] text-[10px] border-b border-[#1A222C] tracking-widest uppercase shadow-md z-10">
          <div className="flex-1 flex justify-between py-1.5 px-2 border-r border-[#1A222C]">
             <span>Size</span>
             <span>Bid</span>
          </div>
          <div className="flex-1 flex justify-between py-1.5 px-2">
             <span>Ask</span>
             <span>Size</span>
          </div>
        </div>

        {/* Orderbook Rows */}
        <div className="flex-1 overflow-y-auto scrollbar-hide bg-[#000000]">
            <div className="flex flex-col w-full font-mono text-[10px]">
               {Array.from({ length: rowCount }).map((_, i) => {
                  const bid = bidsList[i];
                  const ask = asksList[i];
                  
                  const bidSize = bid ? parseFloat(bid.size) : 0;
                  const askSize = ask ? parseFloat(ask.size) : 0;
                  
                  const bidPct = (bidSize / maxBidSize) * 100;
                  const askPct = (askSize / maxAskSize) * 100;

                  return (
                      <div key={i} className="flex h-5 border-b border-[#0A0E14] hover:bg-[#111820] cursor-pointer">
                          
                          {/* BID SIDE (Left half) */}
                          <div className="flex-1 flex items-center justify-between px-2 relative border-r border-[#1A222C] group">
                             {bid && (
                                <>
                                  {/* Bid Horizontal Bar (Anchored Right) */}
                                  <div 
                                     className="absolute right-0 inset-y-0 bg-[rgba(0,200,83,0.2)] transition-all duration-300"
                                     style={{ width: `${bidPct}%` }}
                                  ></div>
                                  <span className="text-[#E4E8EE] z-10">{bidSize.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}</span>
                                  <span className="text-[#00C853] font-bold z-10">{parseFloat(bid.price).toFixed(2)}</span>
                                </>
                             )}
                          </div>

                          {/* ASK SIDE (Right half) */}
                          <div className="flex-1 flex items-center justify-between px-2 relative group">
                             {ask && (
                                <>
                                  {/* Ask Horizontal Bar (Anchored Left) */}
                                  <div 
                                     className="absolute left-0 inset-y-0 bg-[rgba(213,0,0,0.2)] transition-all duration-300"
                                     style={{ width: `${askPct}%` }}
                                  ></div>
                                  <span className="text-[#D50000] font-bold z-10">{parseFloat(ask.price).toFixed(2)}</span>
                                  <span className="text-[#E4E8EE] z-10">{askSize.toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})}</span>
                                </>
                             )}
                          </div>

                      </div>
                  );
               })}
            </div>
        </div>
      </div>
      
      {/* DELTA STATISTICS */}
      <div className="flex flex-col bg-black flex-1 overflow-hidden relative border-t border-[#1A222C]">
        
        {/* Header */}
        <div className="h-8 flex items-center justify-between px-3 text-white font-semibold text-[11px] shrink-0 bg-[#0C121A] border-b border-[#1A222C] uppercase tracking-widest">
          <span className="text-[#E4E8EE]">Delta Statistics</span>
          <span className="cursor-pointer hover:text-white transition-colors text-[#5A6B7C]">✕</span>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex overflow-hidden bg-black">
          
          {/* Data List (Left) */}
          <div className="flex-1 flex flex-col p-3 overflow-y-auto scrollbar-hide text-[11px] font-mono gap-1 border-r border-[#1A222C]">
            
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Cumulative Delta</span>
              <span className={stats.cumulativeDelta >= 0 ? "text-[#00E676] font-medium" : "text-[#FF3B30] font-medium"}>
                {stats.cumulativeDelta > 0 ? '+' : ''}{stats.cumulativeDelta?.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Session Delta</span>
              <span className={stats.sessionDelta >= 0 ? "text-[#00E676] font-medium" : "text-[#FF3B30] font-medium"}>
                {stats.sessionDelta > 0 ? '+' : ''}{stats.sessionDelta?.toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Delta/Volume</span>
              <span className="text-[#E4E8EE] font-medium">
                {stats.totalVolume > 0 ? (stats.sessionDelta / stats.totalVolume)?.toFixed(2) : '0.00'}
              </span>
            </div>
            
            <div className="h-px bg-[#1A222C] my-1 opacity-50"></div>
            
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Buy Volume</span>
              <span className="text-[#E4E8EE] font-medium">{stats.buyVolume?.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Sell Volume</span>
              <span className="text-[#E4E8EE] font-medium">{stats.sellVolume?.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight font-medium">Total Volume</span>
              <span className="text-white font-medium">{stats.totalVolume?.toFixed(0)}</span>
            </div>
            
            <div className="h-px bg-[#1A222C] my-1 opacity-50"></div>
            
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Buy %</span>
              <span className="text-[#00E676] font-medium">
                {stats.totalVolume > 0 ? ((stats.buyVolume / stats.totalVolume) * 100)?.toFixed(1) : '50.0'}%
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Sell %</span>
              <span className="text-[#FF3B30] font-medium">
                {stats.totalVolume > 0 ? ((stats.sellVolume / stats.totalVolume) * 100)?.toFixed(1) : '50.0'}%
              </span>
            </div>
            
            <div className="h-px bg-[#1A222C] my-1 opacity-50"></div>
            
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Max Delta</span>
              <span className="text-[#00E676] font-medium">+{stats.maxDelta?.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Min Delta</span>
              <span className="text-[#FF3B30] font-medium">{stats.minDelta?.toFixed(0)}</span>
            </div>
            
            <div className="h-px bg-[#1A222C] my-1 opacity-50"></div>
            
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Delta Momentum</span>
              <span className={stats.momentum === "Bullish" ? "text-[#00C853] font-medium" : (stats.momentum === "Bearish" ? "text-[#D50000] font-medium" : "text-[#E4E8EE] font-medium")}>{stats.momentum}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Imbalance Ratio</span>
              <span className="text-[#00C853] font-medium">{stats.imbalanceRatio?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Absorption</span>
              <span className={stats.absorption.includes("Absorb") ? "text-[#FFA500] font-medium" : "text-[#00C853] font-medium"}>{stats.absorption}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">Large Lot Activity</span>
              <span className="text-[#00C853] font-medium">{stats.largeLots}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-[#8B9CAC] tracking-tight">HFT Activity</span>
              <span className="text-[#00C853] font-medium">{stats.hftCount}</span>
            </div>
          </div>

          {/* Donut Chart Area (Right) */}
          <div className="w-[140px] shrink-0 flex flex-col items-center justify-center p-4 bg-[#0A0E14] border-l border-[#1A222C]">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {/* Background Track */}
                <circle cx="50" cy="50" r="42" stroke="#1A222C" strokeWidth="8" fill="none" />
                
                {/* Red portion (baseline) */}
                <circle cx="50" cy="50" r="42" stroke="#FF3B30" strokeWidth="6" fill="none" />
                
                {/* Green portion (overlays red, dasharray circumference = 2 * PI * 42 = 263.89) */}
                <circle cx="50" cy="50" r="42" stroke="#00E676" strokeWidth="6" fill="none" strokeDasharray="263.89" strokeDashoffset={263.89 * (1 - (stats.totalVolume > 0 ? stats.buyVolume / stats.totalVolume : 0.5))} />
                
                {/* Inner tick marks */}
                <circle cx="50" cy="50" r="35" stroke="#334155" strokeWidth="2" strokeDasharray="1 3" fill="none" />
              </svg>
              
              {/* Inner Text */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-1">
                <span className="text-[#00E676] font-mono font-medium text-[13px] tracking-tight">
                  {stats.totalVolume > 0 ? ((stats.buyVolume / stats.totalVolume) * 100)?.toFixed(1) : '50.0'}%
                </span>
                <span className="text-[#00E676] text-[9px] tracking-widest mt-0.5">BUY</span>
              </div>
            </div>
            
            {/* Outer Text Below */}
            <div className="mt-4 flex flex-col items-center justify-center">
               <span className="text-[#FF3B30] font-mono font-medium text-[13px] tracking-tight">
                 {stats.totalVolume > 0 ? ((stats.sellVolume / stats.totalVolume) * 100)?.toFixed(1) : '50.0'}%
               </span>
               <span className="text-[#FF3B30] text-[9px] tracking-widest mt-0.5">SELL</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
