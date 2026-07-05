import React, { useMemo } from 'react';
import FootprintChart from '../FootprintChart';
import { useData } from '../../context/DataContext';

const CenterPanel = () => {
  const { footprint, currentSymbol } = useData();
  const [timeframe, setTimeframe] = React.useState('1m');

  // Generate synchronized logical footprint statistics data
  const columnsData = useMemo(() => {
    if (!footprint) return [];
    
    // Combine history and current into one array
    const arr = [...(footprint.history || [])];
    if (footprint.current) {
        arr.push(footprint.current);
    }
    
    // Take the last 30
    const recent = arr.slice(-30);
    
    let currentCVD = 15400; // Starting baseline CVD
    
    return recent.map((fp) => {
      const totalVolume = fp.volume || 1;
      const deltaVal = fp.delta || 0;
      
      // 3. Accumulate CVD mathematically
      currentCVD += deltaVal; 
      
      const isPositive = deltaVal >= 0;
      const d = `${isPositive ? '+' : ''}${deltaVal.toFixed(2)}`;
      const c = isPositive ? '#00C853' : '#D50000';
      
      // 4. Volume Bars: height visually correlates to delta magnitude
      const barHeight = Math.min((Math.abs(deltaVal) / (totalVolume || 1)) * 40, 20); 
      const v = isPositive ? [barHeight, 0] : [0, -barHeight];
      
      // 5. Format CVD to 'K' notation
      const cv1 = (currentCVD / 1000).toFixed(1) + 'K';
      
      // 6. CVD % -> Delta as a percentage of Total Volume for that footprint
      const deltaPercent = ((deltaVal / totalVolume) * 100).toFixed(1);
      const cv2 = `${isPositive ? '+' : ''}${deltaPercent}%`;

      // 7. Determine a logical label based on the actual delta
      let possibleLabels = [];
      if (deltaVal > totalVolume * 0.4) possibleLabels = [{ label: 'Delta Surge', color: '#00C853' }];
      else if (deltaVal < -totalVolume * 0.4) possibleLabels = [{ label: 'Aggressive Selling', color: '#D50000' }];
      else if (totalVolume > 500) possibleLabels = [{ label: 'Volume Node', color: '#E4E8EE' }];
      else possibleLabels = [{ label: 'Normal', color: '#5A6B7C' }];

      let chosenLabel = possibleLabels[0];

      return { d, c, v, cv1, cv2, classification: chosenLabel };
    });
  }, [footprint]);

  return (
    <div className="flex flex-col h-full bg-[#080C11]">

      {/* Chart Area */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="h-8 flex items-center justify-between px-4 bg-[#05080C] border-b border-[#1A222C] shrink-0 text-[11px] font-semibold tracking-widest text-[#A0AAB5] uppercase z-10">
           <div className="flex items-center gap-4">
              <span className="text-white font-bold">{currentSymbol || 'BTC-USDT-SWAP'}</span>
              <div className="flex gap-2">
                 <span onClick={() => setTimeframe('1m')} className={`cursor-pointer hover:text-white ${timeframe === '1m' ? 'text-[#1E88E5]' : ''}`}>1m</span>
                 <span onClick={() => setTimeframe('5m')} className={`cursor-pointer hover:text-white ${timeframe === '5m' ? 'text-[#1E88E5]' : ''}`}>5m</span>
                 <span onClick={() => setTimeframe('15m')} className={`cursor-pointer hover:text-white ${timeframe === '15m' ? 'text-[#1E88E5]' : ''}`}>15m</span>
                 <span onClick={() => setTimeframe('1h')} className={`cursor-pointer hover:text-white ${timeframe === '1h' ? 'text-[#1E88E5]' : ''}`}>1h</span>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <span className="cursor-pointer hover:text-white">Indicators</span>
              <span className="cursor-pointer hover:text-white">Settings</span>
           </div>
        </div>
        
        {/* Footprint Chart */}
        <div className="flex-1 relative z-0">
          <FootprintChart />
        </div>



      </div>
    </div>
  );
};

export default CenterPanel;
