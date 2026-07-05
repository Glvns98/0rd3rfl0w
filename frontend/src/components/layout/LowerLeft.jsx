import React from 'react';
import { useData } from '../../context/DataContext';

const LowerLeft = () => {
  const { trades } = useData();

  const formatTime = (ts) => {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#080B10] text-[#A0AAB5] font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-[#1E252D] bg-[#05080C] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white uppercase text-[10px] tracking-wider">Time & Sales <span className="text-[7px]">▼</span></span>
          <div className="bg-[#0E1218] border border-[#262B33] rounded px-1.5 py-0.5 text-[#E4E8EE] flex items-center gap-1 cursor-pointer text-[10px]">
            All <span className="text-[7px]">▼</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#7B8B9E]">
          <span className="cursor-pointer hover:text-white text-[10px]">🔍</span>
          <span className="cursor-pointer hover:text-white text-[12px]">⚙</span>
          <span className="cursor-pointer hover:text-white text-[12px]">↗</span>
        </div>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_40px] px-3 py-1 border-b border-[#1E252D] text-[10px] text-[#7B8B9E] shrink-0">
         <div>Time</div>
         <div className="text-right">Price</div>
         <div className="text-right">Size</div>
         <div className="text-right">Delta</div>
         <div className="text-right">Aggressor</div>
         <div className="text-right">Exchange</div>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-hidden flex flex-col pt-1 text-[10px] font-mono">
         {trades.map((tr, i) => {
            const isBuy = tr.side === 'buy';
            const color = isBuy ? '#00C853' : '#D50000';
            const size = parseFloat(tr.size);
            const isLarge = size > 1; // Assuming size is in BTC
            const bg = isLarge ? (isBuy ? 'rgba(0, 200, 83, 0.1)' : 'rgba(213, 0, 0, 0.1)') : 'transparent';
            
            return (
              <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_40px] px-3 py-[2px] items-center hover:bg-[#1A222C]" style={{ backgroundColor: bg }}>
                 <div className="text-[#A0AAB5]">{formatTime(tr.ts)}</div>
                 <div className="text-right" style={{ color: color }}>{parseFloat(tr.price).toFixed(2)}</div>
                 <div className="text-right text-[#E4E8EE]">{size}</div>
                 <div className="text-right" style={{ color: color }}>{isBuy ? '+' : '-'}{size}</div>
                 <div className="text-right uppercase" style={{ color: color }}>{tr.side}</div>
                 <div className="text-right text-[#5A6B7C] font-sans text-[9px]">OKX</div>
              </div>
            );
         })}
      </div>

    </div>
  );
};

export default LowerLeft;
