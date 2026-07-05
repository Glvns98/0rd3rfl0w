import React, { useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';

const LowerCenter = () => {
  const { footprint, stats, volumeProfile } = useData();
  
  const mainCanvasRef = useRef(null);
  const vpCanvasRef = useRef(null);
  const divCanvasRef = useRef(null);

  // Maintain refs for fast access in rAF loop without triggering React renders
  const dataRef = useRef({ footprint, volumeProfile });
  useEffect(() => { dataRef.current = { footprint, volumeProfile }; }, [footprint, volumeProfile]);

  useEffect(() => {
    let animationId;
    const ctxMain = mainCanvasRef.current?.getContext('2d', { alpha: false });
    const ctxVp = vpCanvasRef.current?.getContext('2d', { alpha: false });
    const ctxDiv = divCanvasRef.current?.getContext('2d', { alpha: false });

    const resize = () => {
       const dpr = window.devicePixelRatio || 1;
       const resizeCanvas = (canvas) => {
           if (!canvas) return;
           const rect = canvas.parentElement.getBoundingClientRect();
           canvas.width = rect.width * dpr;
           canvas.height = rect.height * dpr;
           const ctx = canvas.getContext('2d');
           ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
       };
       resizeCanvas(mainCanvasRef.current);
       resizeCanvas(vpCanvasRef.current);
       resizeCanvas(divCanvasRef.current);
    };

    window.addEventListener('resize', resize);
    setTimeout(resize, 50); // Ensure layout bounds are set before first resize

    const C = {
        bg: '#080B10',
        grid: '#1A222C',
        bull: '#00C853',
        bear: '#D50000',
        bullMuted: 'rgba(0, 200, 83, 0.25)',
        bearMuted: 'rgba(213, 0, 0, 0.25)',
        poc: '#EAB308',
    };

    const draw = () => {
       if (!mainCanvasRef.current || mainCanvasRef.current.width === 0) {
           animationId = requestAnimationFrame(draw);
           return;
       }

       const { footprint, volumeProfile } = dataRef.current;
       
       // Data Prep
       const candles = footprint?.current ? [footprint.current, ...(footprint.history || [])] : (footprint?.history || []);
       const chronological = [...candles].reverse();
       
       let cumDelta = 0;
       let fastEma = 0;
       let slowEma = 0;
       const fastK = 2 / (5 + 1);
       const slowK = 2 / (10 + 1);

       const chartData = chronological.map((c, i) => {
           let delta = c.delta || 0;
           cumDelta += delta;
           
           if (i === 0) {
               fastEma = cumDelta;
               slowEma = cumDelta;
           } else {
               fastEma = (cumDelta - fastEma) * fastK + fastEma;
               slowEma = (cumDelta - slowEma) * slowK + slowEma;
           }
           const cvdMacd = fastEma - slowEma;

           return { delta, cumDelta, cvdMacd };
       });

       const maxCum = Math.max(...chartData.map(d => d.cumDelta), 1);
       const minCum = Math.min(...chartData.map(d => d.cumDelta), -1);
       const rangeCum = Math.max(maxCum - minCum, 1);
       const maxD = Math.max(...chartData.map(d => Math.abs(d.delta)), 1);

       // 1. DRAW MAIN CHART (Delta & Cum Delta)
       if (ctxMain) {
           const w = mainCanvasRef.current.width / (window.devicePixelRatio || 1);
           const h = mainCanvasRef.current.height / (window.devicePixelRatio || 1);
           
           ctxMain.fillStyle = C.bg;
           ctxMain.fillRect(0, 0, w, h);
           
           // Grid
           ctxMain.strokeStyle = C.grid;
           ctxMain.lineWidth = 1;
           ctxMain.beginPath();
           ctxMain.moveTo(0, h * 0.75);
           ctxMain.lineTo(w, h * 0.75);
           ctxMain.setLineDash([4, 4]);
           ctxMain.stroke();
           ctxMain.setLineDash([]);

           if (chartData.length > 0) {
               const step = w / Math.max(chartData.length - 1, 50);
               const histBaseline = h * 0.75;
               const histMaxH = h * 0.25;

               // Histogram
               chartData.forEach((d, i) => {
                   const x = i * step;
                   const val = (d.delta / maxD) * histMaxH;
                   ctxMain.fillStyle = d.delta >= 0 ? C.bull : C.bear;
                   ctxMain.fillRect(x - (step*0.4), d.delta >= 0 ? histBaseline - val : histBaseline, Math.max(step * 0.8, 1), Math.abs(val));
               });

               // Area Chart Points
               const points = chartData.map((d, i) => {
                   const x = i * step;
                   const y = (h * 0.75) - (((d.cumDelta - minCum) / rangeCum) * (h * 0.65));
                   return {x, y};
               });
               
               // Gradient Area Fill
               ctxMain.beginPath();
               ctxMain.moveTo(0, h * 0.75);
               points.forEach(p => ctxMain.lineTo(p.x, p.y));
               ctxMain.lineTo(w, h * 0.75);
               
               const grad = ctxMain.createLinearGradient(0, 0, 0, h * 0.75);
               grad.addColorStop(0, 'rgba(0, 200, 83, 0.5)');
               grad.addColorStop(1, 'rgba(0, 200, 83, 0.0)');
               ctxMain.fillStyle = grad;
               ctxMain.fill();
               
               // Area Chart Line Outline
               ctxMain.beginPath();
               points.forEach((p, i) => {
                   if (i===0) ctxMain.moveTo(p.x, p.y);
                   else ctxMain.lineTo(p.x, p.y);
               });
               ctxMain.strokeStyle = C.bull;
               ctxMain.lineWidth = 1.5;
               ctxMain.lineJoin = 'round';
               ctxMain.stroke();
           }
       }

       // 2. DRAW VOLUME PROFILE
       if (ctxVp && volumeProfile?.profile?.length > 0) {
           const w = vpCanvasRef.current.width / (window.devicePixelRatio || 1);
           const h = vpCanvasRef.current.height / (window.devicePixelRatio || 1);
           
           ctxVp.fillStyle = '#05080C';
           ctxVp.fillRect(0, 0, w, h);
           
           const prof = volumeProfile.profile;
           const maxP = Math.max(...prof.map(p => p.price));
           const minP = Math.min(...prof.map(p => p.price));
           const rangeP = maxP - minP || 1;
           const maxV = Math.max(...prof.map(p => p.volume), 1);

           const valLow = volumeProfile.val || minP;
           const valHigh = volumeProfile.vah || maxP;
           const poc = volumeProfile.poc || minP;

           prof.forEach(p => {
               const isVA = p.price >= valLow && p.price <= valHigh;
               const y = h - (((p.price - minP) / rangeP) * h);
               const barW = (p.volume / maxV) * w * 0.85; 
               const rowH = Math.max(h / prof.length, 1);

               const bidVol = p.bidVol || p.volume * 0.5;
               const askVol = p.askVol || p.volume * 0.5;
               const bidW = (bidVol / p.volume) * barW;
               const askW = (askVol / p.volume) * barW;

               // Ask (drawn rightwards from the end of Bid)
               ctxVp.fillStyle = isVA ? C.bear : C.bearMuted;
               ctxVp.fillRect(w - askW, y - rowH/2, askW, rowH - 0.5);
               
               // Bid (drawn leftwards from the edge)
               ctxVp.fillStyle = isVA ? C.bull : C.bullMuted;
               ctxVp.fillRect(w - barW, y - rowH/2, bidW, rowH - 0.5);
           });
       }

       // 3. DRAW DIVERGENCE CHART
       if (ctxDiv) {
           const w = divCanvasRef.current.width / (window.devicePixelRatio || 1);
           const h = divCanvasRef.current.height / (window.devicePixelRatio || 1);
           
           ctxDiv.fillStyle = C.bg;
           ctxDiv.fillRect(0, 0, w, h);
           
           ctxDiv.strokeStyle = C.grid;
           ctxDiv.lineWidth = 1;
           ctxDiv.setLineDash([4, 4]);
           ctxDiv.beginPath();
           ctxDiv.moveTo(0, h * 0.3); ctxDiv.lineTo(w, h * 0.3);
           ctxDiv.moveTo(0, h * 0.7); ctxDiv.lineTo(w, h * 0.7);
           ctxDiv.stroke();
           ctxDiv.setLineDash([]);

           if (chartData.length > 0) {
               const step = w / Math.max(chartData.length - 1, 50);
               const maxMacd = Math.max(...chartData.map(d => Math.abs(d.cvdMacd)), 1);
               
               ctxDiv.beginPath();
               chartData.forEach((d, i) => {
                   const x = i * step;
                   // CVD Momentum normalized to 10-90% of chart height
                   const rsiVal = 50 - ((d.cvdMacd / maxMacd) * 40);
                   const y = (rsiVal / 100) * h;
                   if (i===0) ctxDiv.moveTo(x, y);
                   else ctxDiv.lineTo(x, y);
               });
               ctxDiv.strokeStyle = '#C4D0DB';
               ctxDiv.lineWidth = 1.5;
               ctxDiv.lineJoin = 'round';
               ctxDiv.stroke();
           }
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
    <div className="flex flex-col h-full bg-[#080B10] text-[#A0AAB5] font-sans">
      
      {/* 1. DELTA & CUMULATIVE DELTA CHART */}
      <div className="flex-[3] flex flex-col border-b border-[#1E252D] relative">
         
         <div className="flex justify-between items-center px-3 py-1 border-b border-[#1A222C] bg-[#05080C] shrink-0">
           <div className="font-bold text-[#E4E8EE] uppercase text-[10px] tracking-wider">Delta & Cumulative Delta</div>
           <div className="flex items-center gap-3 text-[#7B8B9E]">
             <span className="cursor-pointer hover:text-white text-[10px]">⏱</span>
             <span className="cursor-pointer hover:text-white text-[10px]">☆</span>
             <span className="cursor-pointer hover:text-white text-[12px]">⚙</span>
             <span className="cursor-pointer hover:text-white text-[12px]">↗</span>
           </div>
         </div>

         <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 relative">
               <div className="absolute top-2 left-3 flex gap-4 text-[9px] font-bold z-10 bg-[#080B10]/80 px-2 py-0.5 rounded pointer-events-none">
                 <div className="flex items-center gap-1">
                   <div className="w-2 h-2 bg-[#00C853]"></div>
                   <span className="text-[#A0AAB5] font-normal">Cumulative Delta</span>
                   <span className={stats.cumulativeDelta >= 0 ? "text-[#00C853]" : "text-[#D50000]"}>{stats.cumulativeDelta?.toFixed(0) || 0}</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="w-2 h-2 bg-[#1E88E5]"></div>
                   <span className="text-[#A0AAB5] font-normal">Session Delta</span>
                   <span className={stats.sessionDelta >= 0 ? "text-[#1E88E5]" : "text-[#D50000]"}>{stats.sessionDelta?.toFixed(0) || 0}</span>
                 </div>
               </div>

               <div className="absolute inset-0 w-full h-full pb-5">
                  <canvas ref={mainCanvasRef} className="w-full h-full block" />
               </div>

               <div className="absolute bottom-0 w-full h-5 flex justify-between items-center px-8 text-[#7B8B9E] text-[9px] font-mono border-t border-[#1A222C] bg-[#080B10]">
                  <span>09:30</span><span>10:00</span><span>10:30</span><span>11:00</span><span>11:30</span><span>12:00</span><span>12:30</span><span>13:00</span>
               </div>
            </div>

            <div className="w-24 border-l border-[#1A222C] flex flex-col relative bg-[#05080C] overflow-hidden shrink-0">
               <canvas ref={vpCanvasRef} className="w-full h-full block absolute inset-0" />
               <div className="absolute top-1 left-1 text-[8px] font-mono text-[#EAB308] font-bold pointer-events-none bg-black/50 px-1 rounded">
                 POC: {volumeProfile?.poc?.toFixed(2) || '---'}
               </div>
            </div>
         </div>
      </div>

      {/* 2. DELTA DIVERGENCE CHART */}
      <div className="flex-[1.5] flex flex-col relative">
         <div className="flex items-center px-3 py-1 border-b border-[#1A222C] shrink-0 gap-6 bg-[#05080C]">
           <div className="font-bold text-[#E4E8EE] uppercase text-[10px] tracking-wider">Delta Divergence</div>
           <div className="flex gap-4 text-[9px]">
              <div className="flex items-center gap-1">
                 <div className="text-[#00C853]">▲</div>
                 <span className="text-[#00C853]">Regular Bullish Divergence</span>
              </div>
              <div className="flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-[#D50000]"></div>
                 <span className="text-[#D50000]">Hidden Bearish Divergence</span>
              </div>
           </div>
         </div>

         <div className="flex-1 relative overflow-hidden">
             <div className="absolute right-2 h-full flex flex-col justify-around py-4 text-[#7B8B9E] text-[9px] font-mono pointer-events-none z-10">
               <span>70%</span>
               <span>30%</span>
             </div>
             <canvas ref={divCanvasRef} className="w-full h-full block absolute inset-0" />
         </div>
      </div>

    </div>
  );
};

export default LowerCenter;
