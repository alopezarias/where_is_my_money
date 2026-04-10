import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { BudgetCategory, BudgetRecord } from '@/types';
import { useLocalStorage } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, useAnimation, PanInfo } from 'motion/react';
import { Header } from '@/components/Header';

export function PresupuestosView({ onSettingsClick }: { onSettingsClick: () => void }) {
  const [records, setRecords] = useLocalStorage<BudgetRecord[]>('presupuestos_records', []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [categoryToEdit, setCategoryToEdit] = useState<BudgetCategory | null>(null);

  const realCurrentDate = new Date();
  const realCurrentMonthId = format(realCurrentDate, 'yyyy-MM');
  
  const currentMonthId = format(currentDate, 'yyyy-MM');
  const prevMonthDate = subMonths(currentDate, 1);
  const prevMonthId = format(prevMonthDate, 'yyyy-MM');

  const isCurrentMonth = currentMonthId === realCurrentMonthId;
  const isPastMonth = currentMonthId < realCurrentMonthId;
  const canGoNext = currentMonthId < realCurrentMonthId;
  const canGoPrev = records.some(r => r.monthId < currentMonthId);

  // Get or initialize current month record
  const currentRecord = useMemo(() => {
    let record = records.find(r => r.monthId === currentMonthId);
    if (!record) {
      // Find the most recent record before this month
      const sortedRecords = [...records].sort((a, b) => b.monthId.localeCompare(a.monthId));
      const mostRecentRecord = sortedRecords.find(r => r.monthId < currentMonthId);
      
      record = {
        monthId: currentMonthId,
        income: mostRecentRecord ? mostRecentRecord.income : 0,
        categories: mostRecentRecord ? mostRecentRecord.categories.map(c => ({ ...c })) : []
      };
    }
    return record;
  }, [records, currentMonthId]);

  const totalBudgeted = currentRecord.categories.reduce((sum, cat) => sum + cat.amount, 0);
  const unassigned = currentRecord.income - totalBudgeted;

  const handlePrevMonth = () => {
    if (canGoPrev) setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNextMonth = () => {
    if (canGoNext) setCurrentDate(addMonths(currentDate, 1));
  };

  const saveCurrentRecord = (newIncome: number, newCategories: BudgetCategory[]) => {
    const newRecord = { monthId: currentMonthId, income: newIncome, categories: newCategories };
    setRecords(prev => {
      const exists = prev.some(r => r.monthId === currentMonthId);
      if (exists) {
        return prev.map(r => r.monthId === currentMonthId ? newRecord : r);
      }
      return [...prev, newRecord];
    });
  };

  const updateIncome = (newIncome: number) => {
    saveCurrentRecord(newIncome, currentRecord.categories);
  };

  const addCategory = (category: Omit<BudgetCategory, 'id'>) => {
    const newCategory = { ...category, id: uuidv4() };
    saveCurrentRecord(currentRecord.income, [...currentRecord.categories, newCategory]);
    setIsAddModalOpen(false);
  };

  const updateCategoryAmount = (id: string, newAmount: number) => {
    const newCategories = currentRecord.categories.map(cat => 
      cat.id === id ? { ...cat, amount: newAmount } : cat
    );
    saveCurrentRecord(currentRecord.income, newCategories);
  };

  const deleteCategory = (id: string) => {
    const newCategories = currentRecord.categories.filter(cat => cat.id !== id);
    saveCurrentRecord(currentRecord.income, newCategories);
  };

  const editCategoryAcrossAllMonths = (id: string, newName: string, newColor: string) => {
    setRecords(prev => prev.map(record => ({
      ...record,
      categories: record.categories.map(cat => 
        cat.id === id ? { ...cat, name: newName, color: newColor } : cat
      )
    })));
    setCategoryToEdit(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      <Header title="Presupuestos" onSettingsClick={onSettingsClick} />

      {/* Month Selector */}
      <div className="px-4">
        <div className="flex items-center justify-between mt-3 mb-1">
          <button 
            onClick={handlePrevMonth} 
            disabled={!canGoPrev}
            className={cn("p-2 rounded-full transition-colors", canGoPrev ? "active:bg-gray-100 dark:active:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600")}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-medium text-lg capitalize text-gray-900 dark:text-white">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <button 
            onClick={handleNextMonth} 
            disabled={!canGoNext}
            className={cn("p-2 rounded-full transition-colors", canGoNext ? "active:bg-gray-100 dark:active:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600")}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Income Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 mt-2 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Ingreso Total</p>
            <div className="flex items-center mt-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white mr-1">€</span>
              <input
                type="number"
                value={currentRecord.income === 0 ? '' : currentRecord.income}
                onChange={(e) => updateIncome(parseFloat(e.target.value) || 0)}
                disabled={!isCurrentMonth && !isPastMonth}
                className="w-32 text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none disabled:opacity-100 disabled:bg-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Asignado</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {totalBudgeted.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
        </div>
        
        {/* Unassigned Indicator */}
        <div className="mt-4 flex items-center justify-between px-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Por asignar</span>
          <span className={cn(
            "text-sm font-bold",
            unassigned > 0 ? "text-green-600 dark:text-green-400" : 
            unassigned < 0 ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-500"
          )}>
            {unassigned.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Categorías</h3>
          {(isCurrentMonth || isPastMonth) && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium active:opacity-70"
            >
              <Plus size={16} className="mr-1" /> Añadir
            </button>
          )}
        </div>

        <div className="space-y-3">
          {currentRecord.categories.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No hay categorías este mes.</p>
          ) : (
            currentRecord.categories.map(category => (
              <SwipeableCategoryItem
                key={category.id}
                category={category}
                isEditable={isCurrentMonth || isPastMonth}
                onUpdateAmount={updateCategoryAmount}
                onDelete={() => setCategoryToDelete(category.id)}
                onEdit={() => setCategoryToEdit(category)}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <AddCategoryModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={addCategory} 
        />
      )}

      {/* Edit Category Modal */}
      {categoryToEdit && (
        <EditCategoryModal
          category={categoryToEdit}
          onClose={() => setCategoryToEdit(null)}
          onSave={editCategoryAcrossAllMonths}
        />
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 animate-in zoom-in-95 duration-200 transition-colors">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Eliminar categoría</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">¿Estás seguro de que deseas eliminar esta categoría? Esta acción solo afectará al mes actual.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  deleteCategory(categoryToDelete);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-red-600 active:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SwipeableCategoryItem({ 
  category, 
  isEditable, 
  onUpdateAmount, 
  onDelete, 
  onEdit 
}: React.PropsWithChildren<{ 
  category: BudgetCategory; 
  isEditable: boolean; 
  onUpdateAmount: (id: string, amount: number) => void; 
  onDelete: () => void; 
  onEdit: () => void; 
}>) {
  const controls = useAnimation();

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold && isEditable) {
      onEdit();
      controls.start({ x: 0 });
    } else if (info.offset.x < -threshold && isEditable) {
      onDelete();
      controls.start({ x: 0 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 transition-colors">
      {/* Background actions */}
      {isEditable && (
        <div className="absolute inset-0 flex justify-between items-center px-4">
          <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm">
            <Edit2 size={18} className="mr-2" /> Editar
          </div>
          <div className="flex items-center text-red-600 dark:text-red-400 font-medium text-sm">
            Eliminar <Trash2 size={18} className="ml-2" />
          </div>
        </div>
      )}

      {/* Foreground card */}
      <motion.div
        drag={isEditable ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between relative z-10 transition-colors"
      >
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: category.color }}>
            {category.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
          </div>
        </div>
        <div className="flex items-center">
          <input
            type="number"
            value={category.amount === 0 ? '' : category.amount}
            onChange={(e) => onUpdateAmount(category.id, parseFloat(e.target.value) || 0)}
            disabled={!isEditable}
            className="w-24 text-right font-semibold text-gray-900 dark:text-white bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none disabled:opacity-100 disabled:bg-transparent"
            placeholder="0.00"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      </motion.div>
    </div>
  );
}

function AddCategoryModal({ onClose, onAdd }: { onClose: () => void, onAdd: (cat: Omit<BudgetCategory, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name,
      amount: 0,
      color,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Categoría</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la categoría</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Alimentación"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full focus:outline-none transition-transform",
                    color === c ? "ring-2 ring-offset-2 ring-gray-800 dark:ring-gray-200 scale-110" : ""
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button 
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-blue-600 text-white font-bold rounded-xl py-4 mt-6 active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Añadir Categoría
          </button>
        </form>
      </div>
    </div>
  );
}

function EditCategoryModal({ category, onClose, onSave }: { category: BudgetCategory, onClose: () => void, onSave: (id: string, name: string, color: string) => void }) {
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(category.id, name, color);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Editar Categoría</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la categoría</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Alimentación"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full focus:outline-none transition-transform",
                    color === c ? "ring-2 ring-offset-2 ring-gray-800 dark:ring-gray-200 scale-110" : ""
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button 
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-blue-600 text-white font-bold rounded-xl py-4 mt-6 active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
}
