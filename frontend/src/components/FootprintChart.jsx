import React, { useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';

const FootprintChart = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const { footprint, currentSymbol } = useData();
  const latest = footprint?.current || (footprint?.history && footprint.history.length > 0 ? footprint.history[0] : null);

  // Persistent interaction state
  const stateRef = useRef({
     viewOffsetX: 0,
     viewOffsetY: 0,
     basePrice: 0,
     isTracking: true,
     mouseX: -1,
     mouseY: -1,
     isDragging: false,
     lastX: 0,
     lastY: 0
  });

  // Keep refs for data to avoid resetting the canvas on every tick
  const dataRef = useRef(null);
  useEffect(() => { dataRef.current = footprint; }, [footprint]);
  
  const symbolRef = useRef(null);
  useEffect(() => { 
      if (symbolRef.current !== currentSymbol) {
          stateRef.current.viewOffsetX = 0;
          stateRef.current.viewOffsetY = 0;
          stateRef.current.basePrice = 0;
          stateRef.current.isTracking = true;
          symbolRef.current = currentSymbol;
      }
  }, [currentSymbol]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    // --- CONFIGURATION ---
    const C = {
        TICK_SIZE: 1.0,         
        CANDLE_WIDTH: 80,       // Compressed width for 10-20 candles
        CANDLE_GAP: 4,          
        ROW_HEIGHT: 18,         
        Y_AXIS_W: 80,           
        X_AXIS_H: 24,           
        COLORS: {
            bg: '#080A10',        
            axis: '#080A10',      
            grid: '#121722',      
            textMuted: '#475366', 
            textActive: '#D1D5DB', 
            axisText: '#72839D',  
            ask: '#00E676',       
            bid: '#FF3B69',       
            poc: '#EAB308',       
            vpAskIn: 'rgba(0, 230, 118, 0.25)',  
            vpAskOut: 'rgba(0, 230, 118, 0.05)', 
            vpBidIn: 'rgba(255, 59, 105, 0.25)', 
            vpBidOut: 'rgba(255, 59, 105, 0.05)',
            vpPOC: '#EAB308',    
            vpVaLine: '#EAB308',
            borderLight: '#2C2621'
        }
    };

    let width = 0, height = 0;
    let animationFrameId;

    function resize() {
        width = container.clientWidth;
        height = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }

    function toggleTracking(state) {
        stateRef.current.isTracking = state;
    }

    function draw() {
        if (width === 0 || height === 0) {
            animationFrameId = requestAnimationFrame(draw);
            return;
        }

        const chartW = width - C.Y_AXIS_W;
        const chartH = height - C.X_AXIS_H;
        const s = stateRef.current;

        const currentFootprint = dataRef.current;
        let candles = [];
        if (currentFootprint) {
            candles = currentFootprint.current ? [currentFootprint.current, ...(currentFootprint.history || [])] : (currentFootprint.history || []);
            candles = [...candles].reverse(); // oldest first, newest last
        }

        let livePrice = 0;
        if (candles.length > 0) {
            livePrice = candles[candles.length - 1].close || 0;
            if (s.smoothedLivePrice === undefined) s.smoothedLivePrice = livePrice;
        }

        // Auto-detect TICK_SIZE based on actual data
        if (candles.length > 0 && candles[0].levels) {
            const prices = Object.keys(candles[0].levels).map(Number).sort((a,b)=>a-b);
            if (prices.length > 1) {
                let minDiff = Infinity;
                for(let i=1; i<prices.length; i++) {
                    const diff = prices[i] - prices[i-1];
                    if (diff > 0 && diff < minDiff) minDiff = diff;
                }
                if (minDiff !== Infinity) C.TICK_SIZE = minDiff;
            }
        }

        // Transform backend data to V2 render format
        const renderCandles = candles.map(c => {
            const levelsObj = c.levels || {};
            const levels = Object.values(levelsObj);
            
            const nodes = new Map();
            let maxVol = 0;
            let totalVol = 0;
            let pocLevel = 0;

            levels.forEach(l => {
                const price = parseFloat(l.price);
                const bidVol = l.bid || 0;
                const askVol = l.ask || 0;
                const total = bidVol + askVol;
                const delta = askVol - bidVol;

                nodes.set(price, { bidVol, askVol, total, delta });
                totalVol += total;
                if (total > maxVol) {
                    maxVol = total;
                    pocLevel = price;
                }
            });

            // Calculate Value Area (70%)
            let vahLevel = pocLevel;
            let valLevel = pocLevel;
            if (totalVol > 0 && nodes.has(pocLevel)) {
                const targetVol = totalVol * 0.70;
                let currentVol = nodes.get(pocLevel).total;
                let upperIdx = pocLevel + C.TICK_SIZE;
                let lowerIdx = pocLevel - C.TICK_SIZE;

                const getVol = (p) => {
                   for(let key of nodes.keys()) {
                      if (Math.abs(key - p) < C.TICK_SIZE * 0.1) return nodes.get(key).total;
                   }
                   return -1;
                };

                while (currentVol < targetVol) {
                    let upperVol = getVol(upperIdx);
                    let lowerVol = getVol(lowerIdx);
                    
                    if (upperVol === -1 && lowerVol === -1) break;

                    if (upperVol >= lowerVol) {
                        currentVol += upperVol;
                        vahLevel = upperIdx;
                        upperIdx += C.TICK_SIZE;
                    } else {
                        currentVol += lowerVol;
                        valLevel = lowerIdx;
                        lowerIdx -= C.TICK_SIZE;
                    }
                }
            }

            // Map Imbalances
            const imbalances = new Map();
            (c.imbalances || []).forEach(imb => {
                const p = parseFloat(imb.price);
                if (!imbalances.has(p)) imbalances.set(p, {});
                if (imb.type === 'bid') imbalances.get(p).bidImb = true;
                if (imb.type === 'ask') imbalances.get(p).askImb = true;
            });

            return {
                open: c.open, high: c.high, low: c.low, close: c.close,
                nodes, maxVol, totalVol, pocLevel, vahLevel, valLevel, imbalances
            };
        });


        // 1. Math: Viewport Tracking Interpolation
        if (s.isTracking && livePrice > 0) {
            s.viewOffsetX += (0 - s.viewOffsetX) * 0.15; // Snap X back
            s.viewOffsetY += (0 - s.viewOffsetY) * 0.15; // Snap Y back to perfect center
            s.smoothedLivePrice += (livePrice - s.smoothedLivePrice) * 0.15; // Smooth anchor follow
        } else if (livePrice > 0) {
            // If dragging manually, still let anchor follow live price so grid doesn't move arbitrarily
            s.smoothedLivePrice += (livePrice - s.smoothedLivePrice) * 0.15;
        }

        const centerAnchor = s.smoothedLivePrice || livePrice;

        // 2. Base Clear
        ctx.fillStyle = C.COLORS.bg;
        ctx.fillRect(0, 0, width, height);

        if (centerAnchor === 0) {
            animationFrameId = requestAnimationFrame(draw);
            return;
        }

        // 3. Grid & Setup
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, chartW, chartH);
        ctx.clip();

        // Background subtle grid
        ctx.strokeStyle = C.COLORS.grid;
        ctx.lineWidth = 1;
        
        const O = (chartH / 2) + s.viewOffsetY;
        const startIdx = Math.floor(centerAnchor / C.TICK_SIZE - (chartH - O) / C.ROW_HEIGHT);
        const endIdx = Math.ceil(centerAnchor / C.TICK_SIZE + O / C.ROW_HEIGHT);
        
        ctx.beginPath();
        for(let i = startIdx; i <= endIdx; i++) {
            if (i % 5 === 0) { 
                const y = (chartH / 2) + s.viewOffsetY + (centerAnchor / C.TICK_SIZE - i) * C.ROW_HEIGHT;
                ctx.moveTo(0, y);
                ctx.lineTo(chartW, y);
            }
        }
        ctx.stroke();

        // 4. Draw Footprints
        const startX = chartW - C.CANDLE_WIDTH - 20 - s.viewOffsetX;
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';

        for (let i = renderCandles.length - 1; i >= 0; i--) {
            const candle = renderCandles[i];
            const x = startX - ((renderCandles.length - 1 - i) * (C.CANDLE_WIDTH + C.CANDLE_GAP));
            
            // Culling
            if (x + C.CANDLE_WIDTH < 0) continue;
            if (x > chartW) continue;

            const openY = s.viewOffsetY + ((s.basePrice - candle.open) / C.TICK_SIZE) * C.ROW_HEIGHT + C.ROW_HEIGHT/2;
            const closeY = s.viewOffsetY + ((s.basePrice - candle.close) / C.TICK_SIZE) * C.ROW_HEIGHT + C.ROW_HEIGHT/2;
            const highY = s.viewOffsetY + ((s.basePrice - candle.high) / C.TICK_SIZE) * C.ROW_HEIGHT + C.ROW_HEIGHT/2;
            const lowY = s.viewOffsetY + ((s.basePrice - candle.low) / C.TICK_SIZE) * C.ROW_HEIGHT + C.ROW_HEIGHT/2;
            
            const isBull = candle.close >= candle.open;

            // Wick
            ctx.strokeStyle = C.COLORS.textMuted;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 12, highY);
            ctx.lineTo(x - 12, lowY);
            ctx.stroke();

            // Candle Body
            ctx.fillStyle = isBull ? C.COLORS.ask : C.COLORS.bid;
            ctx.fillRect(x - 14, isBull ? closeY : openY, 5, Math.max(2, Math.abs(closeY - openY)));

            // 1. Draw Profile Area
            for (const [level, node] of candle.nodes.entries()) {
                const y = Math.floor(s.viewOffsetY + ((s.basePrice - level) / C.TICK_SIZE) * C.ROW_HEIGHT);
                if (y < -C.ROW_HEIGHT || y > chartH) continue;

                const isVA = level >= candle.valLevel - (C.TICK_SIZE*0.1) && level <= candle.vahLevel + (C.TICK_SIZE*0.1);
                const wFill = candle.maxVol > 0 ? (node.total / candle.maxVol) * (C.CANDLE_WIDTH - 4) : 0;
                const isAskDom = node.delta >= 0;
                
                if (isAskDom) {
                    ctx.fillStyle = isVA ? C.COLORS.vpAskIn : C.COLORS.vpAskOut;
                } else {
                    ctx.fillStyle = isVA ? C.COLORS.vpBidIn : C.COLORS.vpBidOut;
                }
                
                ctx.fillRect(x + 2, y, wFill, Math.ceil(C.ROW_HEIGHT));
            }

            // 2. Profile Edge Contour
            ctx.strokeStyle = 'rgba(114, 131, 157, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            let isFirstPath = true;
            const sortedLevels = Array.from(candle.nodes.keys()).sort((a, b) => b - a);
            
            for (const level of sortedLevels) {
                const node = candle.nodes.get(level);
                const y = Math.floor(s.viewOffsetY + ((s.basePrice - level) / C.TICK_SIZE) * C.ROW_HEIGHT);
                if (y > chartH + C.ROW_HEIGHT || y < -C.ROW_HEIGHT) continue;

                const wFill = candle.maxVol > 0 ? (node.total / candle.maxVol) * (C.CANDLE_WIDTH - 4) : 0;
                const h = Math.ceil(C.ROW_HEIGHT);

                if (isFirstPath) {
                    ctx.moveTo(x + 2 + wFill, y);
                    ctx.lineTo(x + 2 + wFill, y + h);
                    isFirstPath = false;
                } else {
                    ctx.lineTo(x + 2 + wFill, y); 
                    ctx.lineTo(x + 2 + wFill, y + h); 
                }
            }
            ctx.stroke();

            // 3. Draw Text Numbers
            for (const [level, node] of candle.nodes.entries()) {
                const y = (chartH / 2) + s.viewOffsetY + ((centerAnchor - level) / C.TICK_SIZE) * C.ROW_HEIGHT;
                if (y < -C.ROW_HEIGHT || y > chartH) continue;

                const pMatch = Array.from(candle.imbalances.keys()).find(k => Math.abs(k - level) < C.TICK_SIZE * 0.1);
                const imb = pMatch ? candle.imbalances.get(pMatch) : {};

                const formatVol = (v) => {
                    if (v >= 1000) return (v/1000).toFixed(1) + 'k';
                    if (v === 0) return '0';
                    return v % 1 === 0 ? v.toString() : v.toFixed(1);
                };

                // Bid
                ctx.textAlign = 'right';
                ctx.fillStyle = imb.bidImb ? C.COLORS.bid : (node.bidVol > 0 ? 'rgba(255, 59, 105, 0.8)' : C.COLORS.textMuted);
                ctx.font = imb.bidImb ? 'bold 11px "JetBrains Mono"' : '11px "JetBrains Mono"';
                ctx.fillText(formatVol(node.bidVol), x + (C.CANDLE_WIDTH/2) - 6, y + C.ROW_HEIGHT/2 + 1);

                // Divider
                ctx.textAlign = 'center';
                ctx.fillStyle = C.COLORS.borderLight;
                ctx.font = '10px "JetBrains Mono"';
                ctx.fillText('|', x + (C.CANDLE_WIDTH/2), y + C.ROW_HEIGHT/2 + 1);

                // Ask
                ctx.textAlign = 'left';
                ctx.fillStyle = imb.askImb ? C.COLORS.ask : (node.askVol > 0 ? 'rgba(0, 230, 118, 0.8)' : C.COLORS.textMuted);
                ctx.font = imb.askImb ? 'bold 11px "JetBrains Mono"' : '11px "JetBrains Mono"';
                ctx.fillText(formatVol(node.askVol), x + (C.CANDLE_WIDTH/2) + 6, y + C.ROW_HEIGHT/2 + 1);
            }
        }
        ctx.restore();

        // 5. Y-Axis
        ctx.fillStyle = C.COLORS.axis;
        ctx.fillRect(chartW, 0, C.Y_AXIS_W, chartH);

        ctx.fillStyle = C.COLORS.axisText;
        ctx.font = '11px "JetBrains Mono"';
        ctx.textAlign = 'right';

        for (let i = startIdx; i <= endIdx; i++) {
            const y = (chartH / 2) + s.viewOffsetY + (centerAnchor / C.TICK_SIZE - i) * C.ROW_HEIGHT + C.ROW_HEIGHT/2;
            if (y > 0 && y < chartH) {
                ctx.fillText((i * C.TICK_SIZE).toFixed(2), chartW + C.Y_AXIS_W - 8, y + 1);
            }
        }

        // 6. X-Axis
        ctx.fillStyle = C.COLORS.axis;
        ctx.fillRect(0, chartH, width, C.X_AXIS_H);
        ctx.strokeStyle = C.COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(0, chartH);
        ctx.lineTo(width, chartH);
        ctx.stroke();

        // 7. Live Price Tracking Line
        const liveY = (chartH / 2) + s.viewOffsetY + ((centerAnchor - livePrice) / C.TICK_SIZE) * C.ROW_HEIGHT + C.ROW_HEIGHT/2;
        if (liveY > 0 && liveY < chartH) {
            ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, liveY);
            ctx.lineTo(chartW, liveY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#1A2436';
            ctx.fillRect(chartW, liveY - 10, C.Y_AXIS_W, 20);
            ctx.fillStyle = '#00E676';
            ctx.font = 'bold 11px "JetBrains Mono"';
            ctx.textAlign = 'right';
            ctx.fillText(livePrice.toFixed(2), chartW + C.Y_AXIS_W - 8, liveY + 1);
        }

        // 8. Crosshair Interaction
        if (s.mouseX > 0 && s.mouseX < chartW && s.mouseY > 0 && s.mouseY < chartH && !s.isDragging) {
            ctx.strokeStyle = 'rgba(114, 131, 157, 0.2)'; 
            ctx.beginPath();
            ctx.moveTo(s.mouseX, 0); ctx.lineTo(s.mouseX, chartH);
            ctx.moveTo(0, s.mouseY); ctx.lineTo(chartW, s.mouseY);
            ctx.stroke();

            const hPriceIdx = Math.floor(centerAnchor / C.TICK_SIZE - (s.mouseY - (chartH / 2) - s.viewOffsetY) / C.ROW_HEIGHT);
            const hPrice = hPriceIdx * C.TICK_SIZE;
            
            ctx.fillStyle = '#1A2436';
            ctx.fillRect(chartW, s.mouseY - 10, C.Y_AXIS_W, 20);
            ctx.fillStyle = '#E8E2DA';
            ctx.textAlign = 'right';
            ctx.fillText(hPrice.toFixed(2), chartW + C.Y_AXIS_W - 8, s.mouseY + 1);
        }

        animationFrameId = requestAnimationFrame(draw);
    }

    // --- EVENT LISTENERS ---
    const handleResize = () => { resize(); };
    window.addEventListener('resize', handleResize);
    
    const triggerInteraction = () => {
        stateRef.current.isTracking = false;
        if (stateRef.current.timeoutId) clearTimeout(stateRef.current.timeoutId);
        stateRef.current.timeoutId = setTimeout(() => {
            stateRef.current.isTracking = true;
        }, 3000); // Auto-recenter after 3 seconds of inactivity
    };
    
    const handleMouseDown = (e) => {
        stateRef.current.isDragging = true;
        stateRef.current.lastX = e.clientX;
        stateRef.current.lastY = e.clientY;
        canvas.style.cursor = 'grabbing';
        triggerInteraction();
    };

    const handleMouseUp = () => {
        stateRef.current.isDragging = false;
        canvas.style.cursor = 'crosshair';
    };

    const handleMouseMove = (e) => {
        const rect = canvas.getBoundingClientRect();
        stateRef.current.mouseX = e.clientX - rect.left;
        stateRef.current.mouseY = e.clientY - rect.top;

        if (stateRef.current.isDragging) {
            stateRef.current.viewOffsetX -= (e.clientX - stateRef.current.lastX);
            stateRef.current.viewOffsetY += (e.clientY - stateRef.current.lastY);
            stateRef.current.lastX = e.clientX;
            stateRef.current.lastY = e.clientY;
            triggerInteraction();
        }
    };

    const handleWheel = (e) => {
        e.preventDefault();
        triggerInteraction();
        stateRef.current.viewOffsetX += e.deltaX;
        stateRef.current.viewOffsetY -= e.deltaY;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Bootstrap
    resize();
    draw();

    return () => {
        window.removeEventListener('resize', handleResize);
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('wheel', handleWheel);
        cancelAnimationFrame(animationFrameId);
    };
  }, []); 

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#080C11]">
      {/* HUD Panel */}
      <div className="absolute top-0 left-0 w-full h-10 flex items-center px-4 gap-6 text-[11px] font-mono z-10 pointer-events-none tracking-tight bg-gradient-to-b from-[#05080C] to-transparent">
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">O:</span>
            <span className="text-[#E4E8EE] font-medium">{latest?.open?.toFixed(2) || '---'}</span>
         </div>
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">H:</span>
            <span className="text-[#E4E8EE] font-medium">{latest?.high?.toFixed(2) || '---'}</span>
         </div>
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">L:</span>
            <span className="text-[#E4E8EE] font-medium">{latest?.low?.toFixed(2) || '---'}</span>
         </div>
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">C:</span>
            <span className="text-[#E4E8EE] font-medium">{latest?.close?.toFixed(2) || '---'}</span>
         </div>
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">Δ:</span>
            <span className={latest?.delta >= 0 ? "text-[#00C853] font-medium" : "text-[#FF3B69] font-medium"}>
              {latest?.delta > 0 ? '+' : ''}{latest?.delta?.toFixed(2) || '---'}
            </span>
         </div>
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">%Δ:</span>
            <span className={latest?.delta >= 0 ? "text-[#00C853] font-medium" : "text-[#FF3B69] font-medium"}>
              {latest?.delta > 0 ? '+' : ''}{latest ? ((latest.delta / (latest.volume || 1)) * 100).toFixed(2) : '---'}%
            </span>
         </div>
         <div className="flex gap-1.5">
            <span className="text-[#5A6B7C]">V:</span>
            <span className="text-[#E4E8EE] font-medium">{latest?.volume?.toFixed(2) || '---'}</span>
         </div>
         {/* Live Auto-Center Button */}
         <div className="flex gap-1.5 ml-auto pointer-events-auto">
             <button onClick={() => { stateRef.current.isTracking = true; }} className="text-[#5A6B7C] hover:text-[#E4E8EE] bg-[#1A222C] px-3 py-1 rounded text-[10px] uppercase transition-colors cursor-pointer">
                 Recenter View
             </button>
         </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full block absolute inset-0" />
    </div>
  );
};

export default FootprintChart;
