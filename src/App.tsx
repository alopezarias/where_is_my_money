import { useState, useEffect } from 'react';
import { BottomNav, type Tab } from '@/components/BottomNav';
import { ResumenView } from '@/views/ResumenView';
import { PatrimonioView } from '@/views/PatrimonioView';
import { SuscripcionesView } from '@/views/SuscripcionesView';
import { PresupuestosView } from '@/views/PresupuestosView';
import { SettingsView } from '@/views/SettingsView';
import { useLocalStorage } from '@/store/useStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app_theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col font-sans transition-colors">
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'resumen' && <ResumenView onSettingsClick={() => setIsSettingsOpen(true)} />}
        {activeTab === 'patrimonio' && <PatrimonioView onSettingsClick={() => setIsSettingsOpen(true)} />}
        {activeTab === 'suscripciones' && <SuscripcionesView onSettingsClick={() => setIsSettingsOpen(true)} />}
        {activeTab === 'presupuestos' && <PresupuestosView onSettingsClick={() => setIsSettingsOpen(true)} />}
      </main>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />

      {isSettingsOpen && (
        <SettingsView 
          onClose={() => setIsSettingsOpen(false)} 
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}
