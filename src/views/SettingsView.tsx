import React from 'react';
import { X, Moon, Sun } from 'lucide-react';
import { motion, useAnimation, useDragControls, type PanInfo } from 'motion/react';

interface SettingsViewProps {
  onClose: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function SettingsView({ onClose, theme, toggleTheme }: SettingsViewProps) {
  const controls = useAnimation();
  const dragControls = useDragControls();

  const handleDragEnd = async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.offset.y > 110 || info.velocity.y > 700;

    if (shouldClose) {
      await controls.start({ y: '100%', opacity: 0, transition: { duration: 0.18 } });
      onClose();
      return;
    }

    await controls.start({ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 28 } });
  };

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 z-[100] flex flex-col transition-colors">
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.16 }}
        animate={controls}
        initial={{ y: 0, opacity: 1 }}
        onDragEnd={handleDragEnd}
        className="flex h-full flex-col"
      >
        <div
          onPointerDown={(event) => dragControls.start(event)}
          className="bg-white dark:bg-gray-900 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-4 shadow-sm z-10 transition-colors touch-none"
        >
          <div className="mx-auto mb-3 mt-1 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajustes</h1>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                  {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Modo Oscuro</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cambiar el tema de la aplicación</p>
                </div>
              </div>
              
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">v 0.1.2</p>
        </div>
      </motion.div>
    </div>
  );
}
