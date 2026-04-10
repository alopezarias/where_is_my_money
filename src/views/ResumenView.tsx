import React, { useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Header } from '@/components/Header';
import { useLocalStorage } from '@/store/useStore';
import { MonthRecord, Subscription, BudgetRecord } from '@/types';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet, PieChart, CreditCard, PiggyBank, Minus } from 'lucide-react';

interface ResumenViewProps {
  onSettingsClick: () => void;
}

export function ResumenView({ onSettingsClick }: ResumenViewProps) {
  const [patrimonioRecords] = useLocalStorage<MonthRecord[]>('patrimonio_records', []);
  const [suscripciones] = useLocalStorage<Subscription[]>('suscripciones', []);
  const [presupuestosRecords] = useLocalStorage<BudgetRecord[]>('presupuestos_records', []);

  const currentDate = new Date();
  const currentMonthId = format(currentDate, 'yyyy-MM');
  const prevMonthDate = subMonths(currentDate, 1);
  const prevMonthId = format(prevMonthDate, 'yyyy-MM');

  // --- Patrimonio ---
  const currentPatrimonio = useMemo(() => {
    const record = patrimonioRecords.find(r => r.monthId === currentMonthId);
    return record ? record.accounts.reduce((sum, acc) => sum + acc.balance, 0) : 0;
  }, [patrimonioRecords, currentMonthId]);

  const prevPatrimonio = useMemo(() => {
    const record = patrimonioRecords.find(r => r.monthId === prevMonthId);
    return record ? record.accounts.reduce((sum, acc) => sum + acc.balance, 0) : 0;
  }, [patrimonioRecords, prevMonthId]);

  const patrimonioChange = prevPatrimonio === 0 
    ? (currentPatrimonio > 0 ? 100 : 0) 
    : ((currentPatrimonio - prevPatrimonio) / prevPatrimonio) * 100;

  // --- Presupuestos (Ingresos y Asignado) ---
  const currentBudget = useMemo(() => {
    return presupuestosRecords.find(r => r.monthId === currentMonthId) || { income: 0, categories: [] };
  }, [presupuestosRecords, currentMonthId]);

  const prevBudget = useMemo(() => {
    return presupuestosRecords.find(r => r.monthId === prevMonthId) || { income: 0, categories: [] };
  }, [presupuestosRecords, prevMonthId]);

  const currentIngresos = currentBudget.income;
  const prevIngresos = prevBudget.income;
  const ingresosChange = prevIngresos === 0 
    ? (currentIngresos > 0 ? 100 : 0) 
    : ((currentIngresos - prevIngresos) / prevIngresos) * 100;

  const currentPresupuestado = currentBudget.categories.reduce((sum, cat) => sum + cat.amount, 0);
  const prevPresupuestado = prevBudget.categories.reduce((sum, cat) => sum + cat.amount, 0);

  // --- Suscripciones ---
  const calculateSubscriptionsForMonth = (date: Date) => {
    return suscripciones.reduce((total, sub) => {
      const start = new Date(sub.startDate);
      const end = sub.endDate ? new Date(sub.endDate) : new Date(9999, 11, 31);
      
      // Check if subscription is active in this month
      if (start <= date && end >= date) {
        if (sub.cycle === 'monthly') return total + sub.amount;
        if (sub.cycle === 'annual') return total + (sub.amount / 12);
        if (sub.cycle === 'quarterly') return total + (sub.amount / 3);
      }
      return total;
    }, 0);
  };

  const currentSuscripciones = useMemo(() => calculateSubscriptionsForMonth(currentDate), [suscripciones, currentDate]);
  const prevSuscripciones = useMemo(() => calculateSubscriptionsForMonth(prevMonthDate), [suscripciones, prevMonthDate]);
  const suscripcionesChange = prevSuscripciones === 0 
    ? (currentSuscripciones > 0 ? 100 : 0) 
    : ((currentSuscripciones - prevSuscripciones) / prevSuscripciones) * 100;

  // --- Ahorro / Libre ---
  const currentLibre = currentIngresos - currentPresupuestado - currentSuscripciones;
  const prevLibre = prevIngresos - prevPresupuestado - prevSuscripciones;
  const ahorroPercentage = currentIngresos > 0 ? (currentLibre / currentIngresos) * 100 : 0;

  const formatCurrency = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  // --- Chart Data (Last 6 months) ---
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthId = format(date, 'yyyy-MM');
      const monthName = format(date, 'MMM', { locale: es });

      // Patrimonio
      const patRecord = patrimonioRecords.find(r => r.monthId === monthId);
      const patrimonio = patRecord ? patRecord.accounts.reduce((sum, acc) => sum + acc.balance, 0) : 0;

      data.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        Patrimonio: patrimonio,
      });
    }
    return data;
  }, [patrimonioRecords, currentDate]);

  const maxPatrimonio = Math.max(...chartData.map(d => d.Patrimonio), 1);

  const formatCompact = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(1);
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'k€' : formatted + 'k€';
    }
    return value.toString() + '€';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 transition-colors">
      <Header title="Resumen mensual" onSettingsClick={onSettingsClick} />
      
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] space-y-4">
        
        {/* Patrimonio Card (Hero) */}
        <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-3xl p-6 shadow-md transition-colors relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={80} />
          </div>
          <p className="text-sm text-gray-300 font-medium relative z-10">Patrimonio Total</p>
          <h2 className="text-4xl font-bold mt-1 relative z-10">
            {formatCurrency(currentPatrimonio)}
          </h2>
          <div className="flex items-center mt-4 relative z-10">
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-bold flex items-center",
              patrimonioChange > 0 ? "bg-green-500/20 text-green-400" : 
              patrimonioChange < 0 ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-300"
            )}>
              {patrimonioChange > 0 ? <TrendingUp size={12} className="mr-1" /> : 
               patrimonioChange < 0 ? <TrendingDown size={12} className="mr-1" /> : 
               <Minus size={12} className="mr-1" />}
              {Math.abs(patrimonioChange).toFixed(1)}%
            </div>
            <span className="text-xs text-gray-400 ml-2">vs mes anterior</span>
          </div>
        </div>

        {/* Grid of Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Ingresos */}
          <MetricCard 
            title="Ingresos" 
            amount={currentIngresos} 
            change={ingresosChange} 
            icon={<TrendingUp size={20} className="text-green-500" />}
            colorClass="bg-white dark:bg-gray-900"
          />
          
          {/* Presupuestado */}
          <MetricCard 
            title="Presupuestado" 
            amount={currentPresupuestado} 
            change={0} // We don't necessarily need % change for budget unless wanted, but let's hide it or show simple
            icon={<PieChart size={20} className="text-blue-500" />}
            colorClass="bg-white dark:bg-gray-900"
            hideChange
          />

          {/* Suscripciones */}
          <MetricCard 
            title="Suscripciones" 
            amount={currentSuscripciones} 
            change={suscripcionesChange} 
            icon={<CreditCard size={20} className="text-purple-500" />}
            colorClass="bg-white dark:bg-gray-900"
            inverseChange // For expenses, up is bad (red), down is good (green)
          />

          {/* Ahorro / Libre */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <PiggyBank size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  {ahorroPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Libre / Ahorro</p>
              <p className={cn("text-lg font-bold mt-0.5", currentLibre >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400")}>
                {formatCurrency(currentLibre)}
              </p>
            </div>
          </div>
        </div>

        {/* Historical Chart Section (Mobile Friendly) */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors mt-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider">Evolución (6 meses)</h3>
          
          <div className="flex items-end justify-between h-40 mt-6 gap-1 sm:gap-2">
            {chartData.map((data, i) => {
              const heightPercent = Math.max((data.Patrimonio / maxPatrimonio) * 100, 2); // Min 2% height so it's visible
              const isCurrentMonth = i === chartData.length - 1;
              
              return (
                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                  <span className={cn(
                    "text-[10px] font-bold mb-2 transition-colors",
                    isCurrentMonth ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                  )}>
                    {formatCompact(data.Patrimonio)}
                  </span>
                  <div className="w-full max-w-[36px] h-24 bg-gray-100 dark:bg-gray-800 rounded-t-lg flex items-end overflow-hidden">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500",
                        isCurrentMonth ? "bg-blue-500" : "bg-blue-300 dark:bg-blue-800/60 group-hover:bg-blue-400 dark:group-hover:bg-blue-700"
                      )}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium mt-2",
                    isCurrentMonth ? "text-gray-900 dark:text-white font-bold" : "text-gray-500 dark:text-gray-400"
                  )}>
                    {data.name.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ title, amount, change, icon, colorClass, hideChange, inverseChange }: any) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  
  // If inverseChange is true (e.g. expenses), positive change is bad (red), negative is good (green)
  const goodColor = inverseChange ? "text-red-500 bg-red-100 dark:bg-red-900/30" : "text-green-500 bg-green-100 dark:bg-green-900/30";
  const badColor = inverseChange ? "text-green-500 bg-green-100 dark:bg-green-900/30" : "text-red-500 bg-red-100 dark:bg-red-900/30";
  const neutralColor = "text-gray-500 bg-gray-100 dark:bg-gray-800";

  const changeColor = isPositive ? goodColor : isNegative ? badColor : neutralColor;

  return (
    <div className={cn("rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 transition-colors flex flex-col justify-between", colorClass)}>
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
          {icon}
        </div>
        {!hideChange && (
          <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center", changeColor)}>
            {isPositive ? <TrendingUp size={10} className="mr-0.5" /> : 
             isNegative ? <TrendingDown size={10} className="mr-0.5" /> : 
             <Minus size={10} className="mr-0.5" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
          {amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>
    </div>
  );
}
