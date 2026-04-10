import { useState, useEffect, useRef, type PointerEvent } from 'react';
import { BottomNav, ROOT_TABS, type Tab } from '@/components/BottomNav';
import { ResumenView } from '@/views/ResumenView';
import { PatrimonioView } from '@/views/PatrimonioView';
import { SuscripcionesView } from '@/views/SuscripcionesView';
import { PresupuestosView } from '@/views/PresupuestosView';
import { SettingsView } from '@/views/SettingsView';
import { useLocalStorage } from '@/store/useStore';
import { configureNativeShell, registerAndroidBackButton } from '@/lib/native';

const HORIZONTAL_SWIPE_THRESHOLD = 72;

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && Boolean(target.closest('button, input, textarea, select, a, [role="button"], [data-swipe-ignore="true"]'));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('resumen');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('app_theme', 'light');
  const swipeStartRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.style.backgroundColor = theme === 'dark' ? '#030712' : '#f9fafb';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    themeColor?.setAttribute('content', theme === 'dark' ? '#111827' : '#f9fafb');
  }, [theme]);

  useEffect(() => {
    void configureNativeShell(theme);
  }, [theme]);

  useEffect(() => {
    let cleanup = () => undefined;

    void registerAndroidBackButton(() => {
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }

      if (activeTab !== 'resumen') {
        setActiveTab('resumen');
        return true;
      }

      return false;
    }).then((dispose) => {
      cleanup = dispose;
    });

    return () => {
      cleanup();
    };
  }, [activeTab, isSettingsOpen]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch' || isSettingsOpen || isInteractiveTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    swipeStartRef.current = { x: event.clientX, y: event.clientY, target: event.target };
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || event.pointerType !== 'touch' || isInteractiveTarget(start.target)) {
      return;
    }

    const offsetX = event.clientX - start.x;
    const offsetY = event.clientY - start.y;
    const isHorizontalSwipe = Math.abs(offsetX) >= HORIZONTAL_SWIPE_THRESHOLD && Math.abs(offsetX) > Math.abs(offsetY) * 1.35;

    if (!isHorizontalSwipe) {
      return;
    }

    const currentIndex = ROOT_TABS.indexOf(activeTab);
    const nextIndex = offsetX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextTab = ROOT_TABS[nextIndex];

    if (nextTab) {
      setActiveTab(nextTab);
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-gray-950 flex flex-col font-sans transition-colors">
      <main
        className="flex-1 overflow-hidden relative"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
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
