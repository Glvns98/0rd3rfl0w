import React from 'react';

const Header = () => {
  return (
    <div className="h-12 bg-[#05080C] border-b border-[#1A222C] flex items-center justify-between px-4 text-[#C4D0DB] text-[11px] font-semibold uppercase tracking-widest shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-8 h-full">
        <div className="flex items-center gap-2">
           <div className="w-4 h-4 bg-gradient-to-tr from-[#1E88E5] to-[#00B0FF] rounded-sm shadow-[0_0_10px_rgba(30,136,229,0.5)]"></div>
           <span className="text-[#FFFFFF] tracking-widest font-bold text-xs shadow-sm">0rd3rfl0w</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
