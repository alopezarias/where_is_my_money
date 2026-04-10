import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, parseISO, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, List as ListIcon, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Subscription, BillingCycle } from '@/types';
import { useLocalStorage } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, useAnimation, PanInfo } from 'motion/react';

import { Header } from '@/components/Header';

export function SuscripcionesView({ onSettingsClick }: { onSettingsClick: () => void }) {
  const [subscriptions, setSubscriptions] = useLocalStorage<Subscription[]>('suscripciones', []);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<string | null>(null);
  const [subscriptionToEdit, setSubscriptionToEdit] = useState<Subscription | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const addSubscription = (sub: Omit<Subscription, 'id'>) => {
    const id = uuidv4();
    setSubscriptions([...subscriptions, { ...sub, id, groupId: id }]);
    setIsAddModalOpen(false);
  };

  const confirmDeleteSubscription = (id: string) => {
    setSubscriptions(subscriptions.map(s => 
      s.id === id ? { ...s, endDate: format(new Date(), 'yyyy-MM-dd') } : s
    ));
    setSubscriptionToDelete(null);
  };

  const editSubscription = (id: string, updatedData: Partial<Subscription>) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    setSubscriptions(prev => {
      const subToEdit = prev.find(s => s.id === id);
      if (!subToEdit) return prev;

      const groupId = subToEdit.groupId || subToEdit.id;
      const newName = updatedData.name || subToEdit.name;

      const isOnlyNameChange = 
        updatedData.amount === subToEdit.amount &&
        updatedData.cycle === subToEdit.cycle &&
        updatedData.description === subToEdit.description &&
        updatedData.color === subToEdit.color;

      if (isOnlyNameChange) {
        return prev.map(s => {
          const isSameGroup = (s.groupId === groupId) || (s.id === groupId && !s.groupId);
          if (isSameGroup) {
            return { ...s, name: newName };
          }
          return s;
        });
      }

      // If other fields changed, end the old one and create a new one
      const newSub: Subscription = {
        ...subToEdit,
        ...updatedData,
        id: uuidv4(),
        groupId,
        startDate: todayStr,
        endDate: undefined,
        name: newName,
      };

      return prev.map(s => {
        const isSameGroup = (s.groupId === groupId) || (s.id === groupId && !s.groupId);
        if (s.id === id) {
          return { ...s, endDate: todayStr, name: newName };
        } else if (isSameGroup) {
          return { ...s, name: newName };
        }
        return s;
      }).concat(newSub);
    });
    setSubscriptionToEdit(null);
  };

  // Calculate expenses for a specific day
  const getExpensesForDay = (date: Date) => {
    return subscriptions.filter(sub => {
      const startDate = parseISO(sub.startDate);
      
      // If the subscription hasn't started yet, it's not an expense today
      if (date < startDate) return false;

      // If the subscription was cancelled, it's not an expense on or after the cancellation date
      if (sub.endDate) {
        const endDate = parseISO(sub.endDate);
        if (date > endDate || isSameDay(date, endDate)) return false;
      }

      const startDay = startDate.getDate();
      const currentDay = date.getDate();
      const currentMonth = date.getMonth();
      const startMonth = startDate.getMonth();
      
      // Handle end of month edge cases (e.g., sub on 31st, but month has 30 days)
      const lastDayOfMonth = endOfMonth(date).getDate();
      const effectiveStartDay = Math.min(startDay, lastDayOfMonth);

      if (currentDay !== effectiveStartDay) return false;

      switch (sub.cycle) {
        case 'monthly':
          return true;
        case 'quarterly':
          return (currentMonth - startMonth) % 3 === 0;
        case 'annual':
          return currentMonth === startMonth;
        default:
          return false;
      }
    });
  };

  const selectedDayExpenses = useMemo(() => getExpensesForDay(selectedDate), [selectedDate, subscriptions]);
  
  const totalMonthExpenses = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
    return days.reduce((total, day) => {
      const dayExpenses = getExpensesForDay(day);
      return total + dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, 0);
  }, [calendarMonth, subscriptions]);

  const activeSubscriptions = useMemo(() => subscriptions.filter(s => !s.endDate), [subscriptions]);

  const totalAnnualExpenses = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfYear(calendarMonth), end: endOfYear(calendarMonth) });
    return days.reduce((total, day) => {
      const dayExpenses = getExpensesForDay(day);
      return total + dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, 0);
  }, [calendarMonth, subscriptions]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      <Header title="Suscripciones" onSettingsClick={onSettingsClick} />

      {/* View Toggle */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 shadow-sm z-10 transition-colors">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full max-w-xs mx-auto transition-colors">
          <button 
            onClick={() => setView('list')}
            className={cn("flex-1 flex justify-center items-center py-2 rounded-lg transition-colors", view === 'list' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}
          >
            <ListIcon size={20} />
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={cn("flex-1 flex justify-center items-center py-2 rounded-lg transition-colors", view === 'calendar' ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}
          >
            <CalendarIcon size={20} />
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tus Productos</h3>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium active:opacity-70"
            >
              <Plus size={16} className="mr-1" /> Añadir
            </button>
          </div>

          <div className="space-y-3">
            {activeSubscriptions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No tienes suscripciones activas.</p>
            ) : (
              activeSubscriptions.map(sub => (
                <SwipeableSubscriptionItem
                  key={sub.id}
                  subscription={sub}
                  onDelete={() => setSubscriptionToDelete(sub.id)}
                  onEdit={() => setSubscriptionToEdit(sub)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Calendar Top Half */}
          <div className="bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-800 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 active:bg-gray-100 dark:active:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium text-lg capitalize text-gray-900 dark:text-white">
                {format(calendarMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 active:bg-gray-100 dark:active:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                <div key={day} className="text-[10px] font-medium text-gray-400">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-x-1 gap-y-0">
              {(() => {
                const start = startOfMonth(calendarMonth);
                const end = endOfMonth(calendarMonth);
                const days = eachDayOfInterval({ start, end });
                
                // Adjust for Monday start (getDay returns 0 for Sunday)
                const startDayOfWeek = getDay(start);
                const emptyDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

                return (
                  <>
                    {Array.from({ length: emptyDays }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-7" />
                    ))}
                    {days.map(day => {
                      const isSelected = isSameDay(day, selectedDate);
                      const isToday = isSameDay(day, new Date());
                      const dayExpenses = getExpensesForDay(day);
                      const hasExpenses = dayExpenses.length > 0;

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "h-7 rounded-full flex flex-col items-center justify-center relative transition-colors",
                            isSelected ? "bg-blue-600 text-white font-bold" : 
                            isToday ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold" : "text-gray-700 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-800",
                            hasExpenses && !isSelected && "ring-2 ring-red-400 text-red-600 dark:text-red-400 font-bold",
                            hasExpenses && isSelected && "ring-2 ring-red-400 ring-offset-1 dark:ring-offset-gray-900"
                          )}
                        >
                          <span className="text-sm">{format(day, 'd')}</span>
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Expenses Bottom Half */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] transition-colors">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
              {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h3>
            
            <div className="space-y-3">
              {selectedDayExpenses.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">No hay pagos programados para este día.</p>
              ) : (
                selectedDayExpenses.map(sub => (
                  <div key={sub.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: sub.color }}>
                        {sub.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-white">{sub.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{sub.description}</p>
                      </div>
                    </div>
                    <p className="font-bold text-red-500 dark:text-red-400">
                      -{sub.amount.toLocaleString('es-ES', { style: 'currency', currency: sub.currency })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <AddSubscriptionModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={addSubscription} 
        />
      )}

      {subscriptionToEdit && (
        <EditSubscriptionModal
          subscription={subscriptionToEdit}
          onClose={() => setSubscriptionToEdit(null)}
          onSave={editSubscription}
        />
      )}

      {subscriptionToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 animate-in zoom-in-95 duration-200 transition-colors">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Eliminar suscripción</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">¿Estás seguro de que deseas eliminar esta suscripción? Se mantendrá el historial de pagos anteriores, pero no se cobrará en el futuro.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setSubscriptionToDelete(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmDeleteSubscription(subscriptionToDelete)}
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

function AddSubscriptionModal({ onClose, onAdd }: { onClose: () => void, onAdd: (sub: Omit<Subscription, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [color, setColor] = useState('#8b5cf6');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    onAdd({
      name,
      description,
      amount: parseFloat(amount),
      currency: 'EUR',
      cycle,
      startDate,
      color
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Suscripción</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Netflix"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
            <input 
              type="text" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Plan Familiar"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (€)</label>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciclo</label>
              <select 
                value={cycle}
                onChange={e => setCycle(e.target.value as BillingCycle)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de primer cobro</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
            disabled={!name.trim() || !amount}
            className="w-full bg-blue-600 text-white font-bold rounded-xl py-4 mt-6 active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Añadir Suscripción
          </button>
        </form>
      </div>
    </div>
  );
}

function SwipeableSubscriptionItem({ 
  subscription, 
  onDelete, 
  onEdit 
}: React.PropsWithChildren<{ 
  subscription: Subscription; 
  onDelete: () => void; 
  onEdit: () => void; 
}>) {
  const controls = useAnimation();

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 80;
    if (info.offset.x > threshold) {
      onEdit();
      controls.start({ x: 0 });
    } else if (info.offset.x < -threshold) {
      onDelete();
      controls.start({ x: 0 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 transition-colors">
      {/* Background actions */}
      <div className="absolute inset-0 flex justify-between items-center px-4">
        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm">
          <Edit2 size={18} className="mr-2" /> Editar
        </div>
        <div className="flex items-center text-red-600 dark:text-red-400 font-medium text-sm">
          Eliminar <Trash2 size={18} className="ml-2" />
        </div>
      </div>

      {/* Foreground card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between relative z-10 transition-colors"
      >
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: subscription.color }}>
            {subscription.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900 dark:text-white">{subscription.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subscription.description || subscription.cycle}</p>
          </div>
        </div>
        <div className="flex items-center">
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">{subscription.amount.toLocaleString('es-ES', { style: 'currency', currency: subscription.currency })}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">{subscription.cycle}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function EditSubscriptionModal({ subscription, onClose, onSave }: { subscription: Subscription, onClose: () => void, onSave: (id: string, data: Partial<Subscription>) => void }) {
  const [name, setName] = useState(subscription.name);
  const [description, setDescription] = useState(subscription.description || '');
  const [amount, setAmount] = useState(subscription.amount.toString());
  const [cycle, setCycle] = useState<BillingCycle>(subscription.cycle);
  const [color, setColor] = useState(subscription.color);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;
    onSave(subscription.id, {
      name,
      description,
      amount: parseFloat(amount),
      cycle,
      color
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Editar Suscripción</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Netflix"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
            <input 
              type="text" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Plan Familiar"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (€)</label>
              <input 
                type="number" 
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciclo</label>
              <select 
                value={cycle}
                onChange={e => setCycle(e.target.value as BillingCycle)}
                className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="monthly">Mensual</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
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
            disabled={!name.trim() || !amount}
            className="w-full bg-blue-600 text-white font-bold rounded-xl py-4 mt-6 active:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Guardar Cambios
          </button>
        </form>
      </div>
    </div>
  );
}
