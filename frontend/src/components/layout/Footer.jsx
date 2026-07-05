import React from 'react';

const Footer = () => {
  return (
    <div className="h-8 bg-[#05080C] border-t border-[#1A222C] flex items-center justify-between px-4 text-[#7B8B9E] text-[10px] font-mono tracking-wider shrink-0 z-10">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#00E676] shadow-[0_0_6px_#00E676]"></span> Rithmic Connection: Stable</span>
        <span>Account: <span className="text-[#E4E8EE]">SIM-09941</span></span>
        <span>Instrument: <span className="text-[#E4E8EE]">ES Z3 (CME)</span></span>
      </div>
      
      <div className="flex gap-6">
        <span>CPU: <span className="text-[#E4E8EE]">12%</span></span>
        <span>RAM: <span className="text-[#E4E8EE]">1.4GB</span></span>
        <span>15:37:42 UTC</span>
      </div>
    </div>
  );
};

export default Footer;
