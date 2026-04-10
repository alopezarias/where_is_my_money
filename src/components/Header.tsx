import React from 'react';
import { Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
  onSettingsClick: () => void;
  children?: React.ReactNode;
}

export function Header({ title, onSettingsClick, children }: HeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-900 px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-4 shadow-sm z-10 transition-colors">
      <div className="flex justify-between items-center mt-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        
        <div className="flex items-center gap-2">
          {children}
          <button 
            onClick={onSettingsClick}
            className="p-2 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 rounded-full transition-colors"
          >
            <Settings size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
