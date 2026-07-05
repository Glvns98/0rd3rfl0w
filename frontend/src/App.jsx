import React from 'react';
import Header from './components/layout/Header';
import LeftSidebar from './components/layout/LeftSidebar';
import CenterPanel from './components/layout/CenterPanel';
import LowerLeft from './components/layout/LowerLeft';
import LowerCenter from './components/layout/LowerCenter';
import RightSidebar from './components/layout/RightSidebar';
import Footer from './components/layout/Footer';

function App() {
  return (
    <>
      {/* Mobile/Small Screen Blocker */}
      <div className="h-screen w-screen bg-[#080C11] text-white flex flex-col items-center justify-center p-8 text-center lg:hidden z-[9999] fixed inset-0">
         <div className="text-5xl mb-6">⚠️</div>
         <h1 className="text-2xl font-bold mb-3 tracking-widest uppercase text-[#E4E8EE]">Resolution Not Supported</h1>
         <p className="text-[#A0AAB5] max-w-md leading-relaxed">
           This institutional order flow platform requires a larger display area to render tick-level footprint data and market depth accurately. 
           <br/><br/>
           Please access the dashboard from a PC or a tablet in landscape mode.
         </p>
      </div>

      {/* Main App (Hidden on small screens) */}
      <div className="hidden lg:flex h-screen w-screen bg-inst-bg text-inst-text-primary flex-col font-sans overflow-hidden select-none relative">


      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 flex flex-col shrink-0">
          <LeftSidebar />
        </div>
        
        {/* Center Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <CenterPanel />
          </div>
          <div className="h-80 border-t border-inst-border flex flex-row shrink-0">
             <div className="w-1/3 border-r border-inst-border flex flex-col">
               <LowerLeft />
             </div>
             <div className="w-2/3 flex flex-col">
               <LowerCenter />
             </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 flex flex-col border-l border-inst-border shrink-0">
          <RightSidebar />
        </div>
      </div>
      <Footer />
      </div>
    </>
  );
}

export default App;
