import React from 'react';
import { InventoryStats } from '../types/inventory';
import { AlertTriangle, CalendarClock, DollarSign, Layers, Wrench, ShieldAlert } from 'lucide-react';

interface MetricsCardsProps {
  stats: InventoryStats;
  onFilterClick?: (filterType: string) => void;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ stats, onFilterClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Fleet Size & Value */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Fleet Assets</span>
          <Layers className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {stats.totalItems}
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span>Fleet CapEx Value:</span>
          <span className="font-semibold text-slate-700 font-mono tabular-nums">
            ${stats.totalFleetReplacementValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 2. Next FY Capital Budget */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Upcoming FY CapEx</span>
          <DollarSign className="w-4 h-4 text-sky-600" />
        </div>
        <div className="text-2xl font-bold text-sky-700 font-mono tabular-nums">
          ${stats.nextFiscalYearBudget.toLocaleString()}
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span>Based on predetermined shelf life</span>
        </div>
      </div>

      {/* 3. Next Quarter Projected Outlay */}
      <div
        onClick={() => onFilterClick && onFilterClick('quarter')}
        className="bg-white border border-sky-200 rounded-lg p-4 cursor-pointer hover:border-sky-400 transition-colors"
      >
        <div className="flex items-center justify-between text-sky-800 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Next Quarter Outlay</span>
          <CalendarClock className="w-4 h-4 text-sky-600" />
        </div>
        <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
          ${stats.nextQuarterProjectedExpense.toLocaleString()}
        </div>
        <div className="mt-2 text-xs text-sky-700 flex items-center gap-1.5">
          <span>Immediate capital requirement →</span>
        </div>
      </div>

      {/* 4. Overdue for Replacement */}
      <div
        onClick={() => onFilterClick && onFilterClick('overdue')}
        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
          stats.overdueCount > 0
            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-400'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
            Past Shelflife
          </span>
          <AlertTriangle className="w-4 h-4 text-rose-600" />
        </div>
        <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums">
          {stats.overdueCount}
        </div>
        <div className="mt-2 text-xs text-rose-700">
          <span>{stats.nearingEolCount} units near EOL (&lt;1 yr)</span>
        </div>
      </div>

      {/* 5. Maintenance Tickets */}
      <div
        onClick={() => onFilterClick && onFilterClick('maintenance')}
        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
          stats.activeIssuesCount > 0
            ? 'bg-amber-50/40 border-amber-200 hover:border-amber-400'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Maintenance Issues
          </span>
          <Wrench className="w-4 h-4 text-amber-600" />
        </div>
        <div className="text-2xl font-bold text-amber-900 font-mono tabular-nums">
          {stats.activeIssuesCount}
        </div>
        <div className="mt-2 text-xs text-amber-700">
          <span>{stats.outOfServiceCount} classrooms offline</span>
        </div>
      </div>
    </div>
  );
};
