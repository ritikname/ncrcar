
import React from 'react';
import { ViewMode } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  onToggleView: (mode: ViewMode) => void;
}

const Header: React.FC<HeaderProps> = ({ viewMode, onToggleView }) => {
  const isOwner = viewMode === 'owner';

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo / Brand - NCR DRIVE Style */}
        <div className="flex items-center gap-3">
            {/* Logo Mark */}
            <div className="flex flex-col leading-none select-none">
                <span className="text-2xl font-black text-red-600 tracking-tighter transform -skew-x-6">NCR</span>
                <span className="text-2xl font-black text-black tracking-tighter transform -skew-x-6 -mt-2">DRIVE</span>
            </div>
            
            {/* Vertical Separator for Context */}
            <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1"></div>
            
            <span className="hidden sm:block text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                Demo Platform
            </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-3">
          <span className={`text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${!isOwner ? 'text-red-600' : 'text-gray-400'}`}>
            Customer
          </span>
          
          <button
            onClick={() => onToggleView(isOwner ? 'customer' : 'owner')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 ${
              isOwner ? 'bg-black' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={isOwner}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isOwner ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>

          <span className={`text-sm font-bold uppercase tracking-wider transition-colors duration-200 ${isOwner ? 'text-black' : 'text-gray-400'}`}>
            Owner
          </span>
        </div>
      </div>
      
      {/* Context Banner */}
      <div className={`w-full text-center text-[10px] uppercase font-bold tracking-widest py-1 text-white transition-colors duration-300 ${isOwner ? 'bg-black' : 'bg-red-600'}`}>
        {isOwner ? '🔧 Owner Mode: Fleet Management' : '👋 Customer Mode: Book Your Ride'}
      </div>
    </header>
  );
};

export default Header;
