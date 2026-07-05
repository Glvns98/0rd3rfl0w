import React, { useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';

const LeftSidebar = () => {
  const { trades, stats, volumeProfile, currentSymbol, availableSymbols, setSymbol } = useData();

  const totalVol = stats?.totalVolume || 1;
  const buyPct = stats ? (stats.buyVolume / totalVol) * 100 : 50;
  const sellPct = stats ? (stats.sellVolume / totalVol) * 100 : 50;
  const deltaRatio = stats ? (stats.sessionDelta / totalVol) : 0;

  const gauge = { buy: buyPct, sell: sellPct, delta: deltaRatio };

  const vpCanvasRef = useRef(null);
  const dataRef = useRef({ volumeProfile });

  useEffect(() => {
    dataRef.current = { volumeProfile };
  }, [volumeProfile]);

  useEffect(() => {
    let animationId;
    const canvas = vpCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener('resize', resize);
    setTimeout(resize, 50);

    const C = {
        bull: '#00C853',
        bear: '#D50000',
        bullMuted: 'rgba(0, 200, 83, 0.25)',
        bearMuted: 'rgba(213, 0, 0, 0.25)',
        poc: '#EAB308',
        bg: '#080C11'
    };

    const draw = () => {
        if (!vpCanvasRef.current || vpCanvasRef.current.width === 0) {
            animationId = requestAnimationFrame(draw);
            return;
        }

        const { volumeProfile } = dataRef.current;
        const w = vpCanvasRef.current.width / (window.devicePixelRatio || 1);
        const h = vpCanvasRef.current.height / (window.devicePixelRatio || 1);

        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, w, h);

        if (volumeProfile?.profile?.length > 0) {
            const prof = volumeProfile.profile;
            const maxP = Math.max(...prof.map(p => p.price));
            const minP = Math.min(...prof.map(p => p.price));
            const rangeP = maxP - minP || 1;
            const maxV = Math.max(...prof.map(p => p.volume), 1);

            const valLow = volumeProfile.val || minP;
            const valHigh = volumeProfile.vah || maxP;
            const poc = volumeProfile.poc || minP;

            const yAxisW = 45;
            const chartW = w - yAxisW;

            prof.forEach(p => {
               const isVA = p.price >= valLow && p.price <= valHigh;
               const y = h - (((p.price - minP) / rangeP) * h);
               const barW = (p.volume / maxV) * chartW * 0.95; 
               const rowH = Math.max(h / prof.length, 1);

               const bidVol = p.bidVol || p.volume * 0.5;
               const askVol = p.askVol || p.volume * 0.5;
               const bidW = (bidVol / p.volume) * barW;
               const askW = (askVol / p.volume) * barW;

               ctx.fillStyle = isVA ? C.bear : C.bearMuted;
               ctx.fillRect(bidW, y - rowH/2, askW, rowH - 0.5);
               
               ctx.fillStyle = isVA ? C.bull : C.bullMuted;
               ctx.fillRect(0, y - rowH/2, bidW, rowH - 0.5);
            });

            ctx.strokeStyle = C.poc;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, h - (((poc - minP) / rangeP) * h));
            ctx.lineTo(w, h - (((poc - minP) / rangeP) * h));
            ctx.stroke();

            ctx.fillStyle = '#5A6B7C';
            ctx.font = '9px "JetBrains Mono"';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            prof.filter((_, i) => i % Math.max(1, Math.floor(prof.length/10)) === 0).forEach(p => {
                const y = h - (((p.price - minP) / rangeP) * h);
                ctx.fillText(p.price.toFixed(2), w - 4, y);
            });
            
            ctx.fillStyle = C.poc;
            ctx.font = 'bold 9px "JetBrains Mono"';
            ctx.textAlign = 'left';
            ctx.fillText(`POC ${poc.toFixed(2)}`, 4, h - (((poc - minP) / rangeP) * h) - 6);
        }

        animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#080C11] text-[11px] text-[#A0AAB5] border-r border-[#1A222C] font-sans w-72 shrink-0">
      
      {/* 1. MARKET SELECTOR (Searchable) */}
      <div className="h-12 border-b border-[#1A222C] flex items-center px-3 shrink-0 bg-[#06080A]">
        <div className="relative w-full flex items-center bg-[#0A0E14] border border-[#1A222C] rounded p-1 focus-within:border-[#2D3748] transition-colors">
          <input 
            type="text"
            className="bg-transparent text-[#E4E8EE] text-[13px] font-bold tracking-wider outline-none w-full uppercase pl-2 placeholder-[#5A6B7C]"
            placeholder="Search Symbol (e.g. SOL, PAXG)"
            value={currentSymbol ? currentSymbol.replace('-SWAP', '') : ''}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setSymbol(val + '-SWAP'); // Temporarily set it so input updates, backend will ignore if invalid
            }}
            onBlur={(e) => {
              // If they delete everything, revert to BTC
              if (!e.target.value) setSymbol('BTC-USDT-SWAP');
            }}
            list="symbols-list"
          />
          <datalist id="symbols-list">
            {(availableSymbols?.length > 0 ? availableSymbols : ['BTC-USDT-SWAP']).map(sym => (
              <option key={sym} value={sym.replace('-SWAP', '')} />
            ))}
          </datalist>
          <div className="text-[#5A6B7C] pointer-events-none pr-2">🔍</div>
        </div>
      </div>
      
      {/* 2. VOLUME PROFILE */}
      <div className="flex flex-col h-[40%] border-b border-[#1A222C]">
        {/* Header */}
        <div className="px-3 py-2 shrink-0">
          <span className="font-bold text-white text-[11px] uppercase tracking-widest">Volume Profile</span>
        </div>

        {/* Chart Area */}
        <div className="flex-1 flex overflow-hidden relative pb-2 w-full">
           <canvas ref={vpCanvasRef} className="w-full h-full block absolute inset-0" />
        </div>
      </div>
      
      {/* 3. SESSION STATISTICS */}
      <div className="flex flex-col border-b border-[#1A222C] py-2 px-3">
        <div className="font-bold text-[#E4E8EE] uppercase text-[10px] mb-2 tracking-widest">Session Statistics</div>
        <div className="grid grid-cols-[80px_1fr] gap-y-[3px] font-sans text-[10px]">
          <div className="text-[#A0AAB5]">Session</div><div className="text-left pl-4 text-[#A0AAB5]">LIVE</div>
          <div className="text-[#A0AAB5]">Open</div><div className="text-left pl-4 text-[#E4E8EE]">{stats?.open != null ? stats.open.toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">High</div><div className="text-left pl-4 text-[#E4E8EE]">{stats?.high != null && stats.high !== -Infinity ? stats.high.toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">Low</div><div className="text-left pl-4 text-[#E4E8EE]">{stats?.low != null && stats.low !== Infinity ? stats.low.toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">Close</div><div className="text-left pl-4 text-[#E4E8EE]">{stats?.close != null ? stats.close.toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">Range</div><div className="text-left pl-4 text-[#E4E8EE]">{(stats?.high != null && stats?.low != null && stats.high !== -Infinity && stats.low !== Infinity) ? (stats.high - stats.low).toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">Volume</div><div className="text-left pl-4 text-[#E4E8EE]">{stats?.totalVolume != null ? stats.totalVolume.toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">Trades</div><div className="text-left pl-4 text-[#E4E8EE]">{trades?.length || 0}+</div>
          <div className="text-[#A0AAB5]">Avg. Size</div><div className="text-left pl-4 text-[#E4E8EE]">{stats?.totalVolume != null ? (stats.totalVolume / (trades?.length || 1)).toFixed(2) : 'N/A'}</div>
          <div className="text-[#A0AAB5]">Value</div><div className="text-left pl-4 text-[#E4E8EE]">-</div>
          <div className="text-[#A0AAB5]">Vol/Min</div><div className="text-left pl-4 text-[#E4E8EE]">-</div>
          <div className="text-[#A0AAB5]">Buy %</div><div className="text-left pl-4 text-[#00C853] font-bold">{gauge.buy?.toFixed(1)}%</div>
          <div className="text-[#A0AAB5]">Sell %</div><div className="text-left pl-4 text-[#D50000] font-bold">{gauge.sell?.toFixed(1)}%</div>
        </div>
        
        {/* Bull/Bear Row */}
        <div className="grid grid-cols-[80px_1fr] items-end mt-[3px]">
           <div className="text-[#A0AAB5] text-[10px] mb-[2px]">Bull/Bear</div>
           <div className="flex flex-col gap-1 pl-4">
              <div className="text-center font-bold text-[10px] leading-none">
                <span className="text-[#00C853]">{gauge.buy?.toFixed(0)}%</span>
                <span className="text-[#A0AAB5] mx-1">/</span>
                <span className="text-[#D50000]">{gauge.sell?.toFixed(0)}%</span>
              </div>
              <div className="flex w-full h-1.5 rounded-sm overflow-hidden bg-[#1A222C]">
                 <div className="h-full bg-[#00C853]" style={{width: `${gauge.buy}%`}}></div>
                 <div className="h-full bg-[#D50000]" style={{width: `${gauge.sell}%`}}></div>
              </div>
           </div>
        </div>
      </div>
      
      {/* 4. ORDER FLOW IMBALANCE */}
      <div className="flex-1 flex flex-col py-2 px-3 bg-[#080C11]">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-[#E4E8EE] uppercase text-[10px] tracking-widest">Order Flow Imbalance</div>
          <span className="cursor-pointer text-[#5A6B7C] hover:text-white text-[12px]">✕</span>
        </div>
        
        {/* Gauge Section */}
        <div className="flex items-center justify-between mb-4 relative h-24">
          
          <div className="flex flex-col w-16 text-center z-10">
            <span className="text-[#00C853] text-[9px] uppercase tracking-wider mb-1">Buy Imb.</span>
            <span className="text-[#00C853] text-[14px] font-bold">{gauge.buy?.toFixed(1)}%</span>
          </div>

          <div className="flex-1 flex justify-center items-center relative h-full">
             {/* Circular Gauge SVG */}
             <svg className="absolute w-[110px] h-[110px] -rotate-90 top-[-5px]">
                <circle cx="55" cy="55" r="45" fill="none" stroke="#1A222C" strokeWidth="6" />
                <circle cx="55" cy="55" r="45" fill="none" stroke="#00C853" strokeWidth="6" strokeDasharray="141 282" strokeDashoffset={141 * (1 - (gauge.buy/100))} />
                <circle cx="55" cy="55" r="45" fill="none" stroke="#D50000" strokeWidth="6" strokeDasharray="141 282" strokeDashoffset={141 * (1 - (gauge.sell/100))} />
                
                <g stroke="#334155" strokeWidth="1">
                  <line x1="55" y1="5" x2="55" y2="10" />
                  <line x1="20" y1="20" x2="23" y2="23" />
                  <line x1="5" y1="55" x2="10" y2="55" />
                  <line x1="20" y1="90" x2="23" y2="87" />
                  <line x1="55" y1="100" x2="55" y2="105" />
                  <line x1="90" y1="90" x2="87" y2="87" />
                  <line x1="100" y1="55" x2="105" y2="55" />
                  <line x1="90" y1="20" x2="87" y2="23" />
                </g>
             </svg>
             <div className="flex flex-col items-center justify-center relative z-10 mt-1">
               <span className="text-[#A0AAB5] text-[8px] uppercase tracking-wider">Imbalance</span>
               <span className={gauge.delta >= 0 ? "text-[#00C853] text-[18px] font-bold leading-none mt-1" : "text-[#D50000] text-[18px] font-bold leading-none mt-1"}>
                 {gauge.delta > 0 ? '+' : ''}{gauge.delta?.toFixed(2)}
               </span>
             </div>
          </div>
          
          <div className="flex flex-col w-16 text-center z-10">
            <span className="text-[#D50000] text-[9px] uppercase tracking-wider mb-1">Sell Imb.</span>
            <span className="text-[#D50000] text-[14px] font-bold">{gauge.sell?.toFixed(1)}%</span>
          </div>

        </div>
        
        {/* Detailed 4-Column Stats */}
        <div className="flex flex-col gap-2 font-sans text-[10px] mt-2">
          
          <div className="grid grid-cols-[70px_15px_1fr_75px] items-start border-b border-[#1A222C] pb-2 min-h-[32px]">
            <div className="text-[#A0AAB5] uppercase">Delta/Vol</div>
            <div className="text-[#00C853] text-[8px] mt-[1px]">▲</div>
            <div className="text-[#A0AAB5] uppercase pl-2">Absorption</div>
            <div className={stats?.absorption.includes("Absorb") ? "text-right text-[#FFA500] font-bold whitespace-nowrap" : "text-right text-[#E4E8EE] font-bold whitespace-nowrap"}>{stats?.absorption}</div>
          </div>
          
          <div className="grid grid-cols-[70px_15px_1fr_75px] items-start border-b border-[#1A222C] pb-2 min-h-[32px]">
            <div className="text-[#A0AAB5] uppercase">Volatility</div>
            <div className="text-[#D50000] text-[8px] mt-[1px]">▼</div>
            <div className="text-[#A0AAB5] uppercase leading-tight pl-2">Iceberg<br/>Detected</div>
            <div className="text-right text-[#4A90E2] font-bold pt-1 whitespace-nowrap">Normal</div>
          </div>
          
          <div className="grid grid-cols-[70px_15px_1fr_75px] items-center border-b border-[#1A222C] pb-2 min-h-[32px]">
            <div className="text-[#A0AAB5] uppercase">Large Lots</div>
            <div className="text-[#E4E8EE] font-bold text-center">{stats?.largeLots}</div>
            <div></div>
            <div className="text-right text-[#E4E8EE] font-bold">0</div>
          </div>

          <div className="grid grid-cols-[70px_15px_1fr_75px] items-center pt-1 min-h-[32px]">
            <div className="text-[#A0AAB5] uppercase">HFT Activity</div>
            <div className="text-[#D50000] text-[8px] font-bold text-center">◁</div>
            <div className="flex items-center px-2">
              <div className="flex w-full h-1.5 rounded-sm overflow-hidden bg-[#1A222C]">
                 <div className="h-full bg-[#00C853]" style={{width: `${gauge.buy}%`}}></div>
                 <div className="h-full bg-[#D50000]" style={{width: `${gauge.sell}%`}}></div>
              </div>
            </div>
            <div className="text-right text-[#00C853] font-bold">{stats?.hftCount}</div>
          </div>

        </div>
      </div>

      {/* 5. FOOTER CONNECTION */}
      <div className="px-3 py-2 border-t border-[#1A222C] flex items-center text-[10px] shrink-0 bg-[#06080A]">
        <span className="text-[#5A6B7C]">Data: <span className="text-white">OKX</span></span>
        <div className="flex items-center gap-1.5 ml-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00C853]"></div>
          <span className="text-[#5A6B7C]">Connected</span>
        </div>
      </div>

    </div>
  );
};

export default LeftSidebar;
