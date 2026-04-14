import React, { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Account, MonthRecord } from '@/types';
import { useLocalStorage } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion, useAnimation, PanInfo } from 'motion/react';

import { Header } from '@/components/Header';

export function PatrimonioView({ onSettingsClick }: { onSettingsClick: () => void }) {
  const [records, setRecords] = useLocalStorage<MonthRecord[]>('patrimonio_records', []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [accountBalanceToEdit, setAccountBalanceToEdit] = useState<Account | null>(null);

  const realCurrentDate = new Date();
  const realCurrentMonthId = format(realCurrentDate, 'yyyy-MM');
  
  const currentMonthId = format(currentDate, 'yyyy-MM');
  const prevMonthDate = subMonths(currentDate, 1);
  const prevMonthId = format(prevMonthDate, 'yyyy-MM');

  const isCurrentMonth = currentMonthId === realCurrentMonthId;
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
        accounts: mostRecentRecord ? mostRecentRecord.accounts.map(a => ({ ...a })) : []
      };
    }
    return record;
  }, [records, currentMonthId]);

  // Find strictly the previous month for percentage calculation, or the most recent if you want
  const prevRecord = records.find(r => r.monthId === prevMonthId);

  const currentTotal = currentRecord.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const prevTotal = prevRecord ? prevRecord.accounts.reduce((sum, acc) => sum + acc.balance, 0) : 0;
  
  const percentChange = prevTotal === 0 
    ? (currentTotal > 0 ? 100 : 0) 
    : ((currentTotal - prevTotal) / prevTotal) * 100;

  const handlePrevMonth = () => {
    if (canGoPrev) setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNextMonth = () => {
    if (canGoNext) setCurrentDate(addMonths(currentDate, 1));
  };

  const saveCurrentRecord = (newAccounts: Account[]) => {
    const newRecord = { monthId: currentMonthId, accounts: newAccounts };
    setRecords(prev => {
      const exists = prev.some(r => r.monthId === currentMonthId);
      if (exists) {
        return prev.map(r => r.monthId === currentMonthId ? newRecord : r);
      }
      return [...prev, newRecord];
    });
  };

  const addAccount = (account: Omit<Account, 'id'>) => {
    const newAccount = { ...account, id: uuidv4() };
    saveCurrentRecord([...currentRecord.accounts, newAccount]);
    setIsAddModalOpen(false);
  };

  const updateAccountBalance = (id: string, newBalance: number) => {
    const newAccounts = currentRecord.accounts.map(acc => 
      acc.id === id ? { ...acc, balance: newBalance } : acc
    );
    saveCurrentRecord(newAccounts);
  };

  const deleteAccount = (id: string) => {
    const newAccounts = currentRecord.accounts.filter(acc => acc.id !== id);
    saveCurrentRecord(newAccounts);
  };

  const editAccountAcrossAllMonths = (id: string, newName: string, newColor: string) => {
    setRecords(prev => prev.map(record => ({
      ...record,
      accounts: record.accounts.map(acc => 
        acc.id === id ? { ...acc, name: newName, color: newColor } : acc
      )
    })));
    setAccountToEdit(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      <Header title="Patrimonio" onSettingsClick={onSettingsClick} />

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

        {/* Summary Card */}
        <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-2xl p-6 mt-2 shadow-md transition-colors">
          <p className="text-sm text-gray-300 font-medium">Total acumulado</p>
          <h2 className="text-4xl font-bold mt-1">
            {currentTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </h2>
          <div className="flex items-center mt-4">
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-bold",
              percentChange > 0 ? "bg-green-500/20 text-green-400" : 
              percentChange < 0 ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-300"
            )}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </div>
            <span className="text-xs text-gray-400 ml-2">vs mes anterior</span>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Cuentas</h3>
          {isCurrentMonth && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium active:opacity-70"
            >
              <Plus size={16} className="mr-1" /> Añadir
            </button>
          )}
        </div>

        <div className="space-y-3">
          {currentRecord.accounts.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">No hay cuentas este mes.</p>
          ) : (
            currentRecord.accounts.map(account => (
              <SwipeableAccountItem
                key={account.id}
                account={account}
                isCurrentMonth={isCurrentMonth}
                onUpdateBalance={updateAccountBalance}
                onOpenBalanceEditor={() => setAccountBalanceToEdit(account)}
                onDelete={() => setAccountToDelete(account.id)}
                onEdit={() => setAccountToEdit(account)}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <AddAccountModal 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={addAccount} 
        />
      )}

      {/* Edit Account Modal */}
      {accountToEdit && (
        <EditAccountModal
          account={accountToEdit}
          onClose={() => setAccountToEdit(null)}
          onSave={editAccountAcrossAllMonths}
        />
      )}

      {accountBalanceToEdit && (
        <EditAccountBalanceModal
          account={accountBalanceToEdit}
          onClose={() => setAccountBalanceToEdit(null)}
          onSave={updateAccountBalance}
        />
      )}

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 animate-in zoom-in-95 duration-200 transition-colors">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Eliminar cuenta</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">¿Estás seguro de que deseas eliminar esta cuenta? Esta acción solo afectará al mes actual.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  deleteAccount(accountToDelete);
                  setAccountToDelete(null);
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

function SwipeableAccountItem({ 
  account, 
  isCurrentMonth, 
  onUpdateBalance, 
  onOpenBalanceEditor,
  onDelete, 
  onEdit 
}: React.PropsWithChildren<{ 
  account: Account; 
  isCurrentMonth: boolean; 
  onUpdateBalance: (id: string, balance: number) => void; 
  onOpenBalanceEditor: () => void;
  onDelete: () => void; 
  onEdit: () => void; 
}>) {
  const controls = useAnimation();

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 56;
    if (info.offset.x > threshold && isCurrentMonth) {
      onEdit();
      controls.start({ x: 0 });
    } else if (info.offset.x < -threshold && isCurrentMonth) {
      onDelete();
      controls.start({ x: 0 });
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 transition-colors">
      {/* Background actions */}
      {isCurrentMonth && (
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
        data-swipe-ignore="true"
        drag={isCurrentMonth ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between relative z-10 transition-colors"
      >
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: account.color }}>
            {account.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{account.currency}</p>
          </div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            data-swipe-ignore="true"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBalanceEditor();
            }}
            className="text-right"
          >
            <p className="font-semibold text-gray-900 dark:text-white">
              {account.balance.toLocaleString('es-ES', { style: 'currency', currency: account.currency })}
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function EditAccountBalanceModal({ account, onClose, onSave }: { account: Account, onClose: () => void, onSave: (id: string, balance: number) => void }) {
  const [value, setValue] = useState(account.balance === 0 ? '' : account.balance.toString());

  const handleChange = (nextValue: string) => {
    setValue(nextValue);
    onSave(account.id, parseFloat(nextValue) || 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl p-6 animate-in zoom-in-95 duration-200 transition-colors" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{account.name}</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Saldo actual</label>
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            placeholder="0.00"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onClose, onAdd }: { onClose: () => void, onAdd: (acc: Omit<Account, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name,
      balance: 0,
      color,
      currency: 'EUR'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Cuenta</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la cuenta</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Banco Santander"
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
            Añadir Cuenta
          </button>
        </form>
      </div>
    </div>
  );
}

function EditAccountModal({ account, onClose, onSave }: { account: Account, onClose: () => void, onSave: (id: string, name: string, color: string) => void }) {
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color);

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(account.id, name, color);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full sm:w-96 rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Editar Cuenta</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 active:text-gray-800 dark:active:text-gray-200 text-2xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la cuenta</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Ej. Banco Santander"
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
