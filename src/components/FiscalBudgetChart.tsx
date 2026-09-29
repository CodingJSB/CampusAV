import React, { useState } from 'react';
import { FiscalYearBudget } from '../types/inventory';
import { BarChart3, Info } from 'lucide-react';

interface FiscalBudgetChartProps {
  budgets: FiscalYearBudget[];
  selectedFY?: string | null;
  onSelectFY?: (fy: string | null) => void;
}

export const FiscalBudgetChart: React.FC<FiscalBudgetChartProps> = ({
  budgets,
  selectedFY,
  onSelectFY,
}) => {
  const [viewMode, setViewMode] = useState<'total' | 'split'>('split');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!budgets || budgets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
        No fiscal budget data available.
      </div>
    );
  }

  const maxBudget = Math.max(...budgets.map((b) => b.totalCost), 10000);
  const chartHeight = 220;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Fiscal Year Replacement Budget Forecast (CapEx)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated replacement cost projections based on predetermined equipment shelf lives
          </p>
        </div>

        {/* View Mode Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'split' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              Hardware / Labor
            </button>
            <button
              onClick={() => setViewMode('total')}
              className={`px-2.5 py-1 rounded transition-colors ${
                viewMode === 'total' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              Total Only
            </button>
          </div>

          {selectedFY && onSelectFY && (
            <button
              onClick={() => onSelectFY(null)}
              className="text-xs text-sky-600 hover:text-sky-800 underline font-medium"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center justify-end gap-5 py-3 text-xs text-slate-600">
        {viewMode === 'split' ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-sky-600" />
              <span>Hardware Replacement</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-sky-300" />
              <span>Installation & Labor (Est. 15%)</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-600" />
            <span>Total Replacement CapEx</span>
          </div>
        )}
      </div>

      {/* Interactive Bar Chart SVG */}
      <div className="relative pt-4 pb-2">
        <div className="grid grid-cols-6 gap-2 sm:gap-6 items-end" style={{ height: `${chartHeight}px` }}>
          {budgets.map((b, idx) => {
            const isSelected = selectedFY === b.fiscalYear;
            const isHovered = hoveredIndex === idx;
            const totalPercent = Math.min(100, Math.round((b.totalCost / maxBudget) * 100));
            const hardwarePercent = b.totalCost > 0 ? (b.hardwareCost / b.totalCost) * 100 : 0;
            const laborPercent = b.totalCost > 0 ? (b.laborCost / b.totalCost) * 100 : 0;

            return (
              <div
                key={b.fiscalYear}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelectFY && onSelectFY(isSelected ? null : b.fiscalYear)}
                className={`relative flex flex-col items-center h-full justify-end cursor-pointer group ${
                  selectedFY && !isSelected ? 'opacity-40' : 'opacity-100'
                }`}
              >
                {/* Value on Top */}
                <div className="text-[11px] font-mono tabular-nums font-semibold text-slate-700 mb-1.5 text-center">
                  ${Math.round(b.totalCost / 1000)}k
                </div>

                {/* The Bar */}
                <div
                  className={`w-full max-w-[56px] rounded-t-sm transition-all relative overflow-hidden ${
                    isSelected ? 'ring-2 ring-sky-500 ring-offset-2' : ''
                  }`}
                  style={{ height: `${Math.max(8, (totalPercent / 100) * (chartHeight - 45))}px` }}
                >
                  {viewMode === 'split' ? (
                    <div className="h-full flex flex-col justify-end">
                      <div
                        className="bg-sky-300 w-full transition-all group-hover:bg-sky-200"
                        style={{ height: `${laborPercent}%` }}
                      />
                      <div
                        className="bg-sky-600 w-full transition-all group-hover:bg-sky-500"
                        style={{ height: `${hardwarePercent}%` }}
                      />
                    </div>
                  ) : (
                    <div className="h-full bg-sky-600 group-hover:bg-sky-500 transition-colors" />
                  )}
                </div>

                {/* Fiscal Year Label */}
                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-sky-600 underline' : 'text-slate-800'
                    }`}
                  >
                    {b.fiscalYear}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {b.itemCount} {b.itemCount === 1 ? 'unit' : 'units'}
                  </div>
                </div>

                {/* Hover Tooltip Card */}
                {isHovered && (
                  <div className="absolute bottom-full mb-3 z-20 w-52 bg-slate-900 text-white rounded-md p-3 text-xs shadow-xl pointer-events-none -left-6 sm:left-1/2 sm:-translate-x-1/2">
                    <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 flex justify-between">
                      <span>{b.fiscalYear} CapEx Budget</span>
                      <span className="text-sky-400">{b.itemCount} units</span>
                    </div>
                    <div className="space-y-1 font-mono tabular-nums">
                      <div className="flex justify-between text-slate-300">
                        <span>Hardware:</span>
                        <span>${b.hardwareCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Install / Labor:</span>
                        <span>${b.laborCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white pt-1 border-t border-slate-700">
                        <span>Total Projected:</span>
                        <span>${b.totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-sans">
                      Click to filter fleet list by {b.fiscalYear}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Insight Banner */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {budgets[0]?.fiscalYear} incorporates urgent overdue units ({budgets[0]?.itemCount} items scheduled).
          </span>
        </div>
        <span className="text-[11px] font-mono">Total 6-Year CapEx: ${budgets.reduce((sum, b) => sum + b.totalCost, 0).toLocaleString()}</span>
      </div>
    </div>
  );
};
