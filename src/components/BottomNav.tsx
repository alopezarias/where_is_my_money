import { cn } from '@/lib/utils';
import { Wallet, CalendarRange, PieChart, LayoutDashboard } from 'lucide-react';

export type Tab = 'resumen' | 'patrimonio' | 'suscripciones' | 'presupuestos';

interface BottomNavProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'patrimonio', label: 'Patrimonio', icon: Wallet },
    { id: 'suscripciones', label: 'Suscripciones', icon: CalendarRange },
    { id: 'presupuestos', label: 'Presupuestos', icon: PieChart },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)] z-50 transition-colors">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 active:bg-gray-100 dark:active:bg-gray-800 transition-colors",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
