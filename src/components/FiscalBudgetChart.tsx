import React, { useState, useRef, useEffect } from 'react';
import { FiscalYearBudget } from '../types/inventory';
import { BarChart3, Info, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    }
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [budgets]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!budgets || budgets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs">
        No fiscal budget data available.
      </div>
    );
  }

  const maxBudget = Math.max(...budgets.map((b) => b.totalCost), 10000);
  const chartHeight = 220;
  const isMultiYear = budgets.length > 6;

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
            {isMultiYear && (
              <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded border border-sky-200">
                {budgets.length}-Year Forecast ({budgets[0]?.fiscalYear} – {budgets[budgets.length - 1]?.fiscalYear})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated replacement projections. Click any FY bar to bring out classroom packages & devices scheduled for that year.
          </p>
        </div>

        {/* View Mode & Horizontal Navigation Controls */}
        <div className="flex items-center gap-2.5">
          {/* Scroll Arrows when multiple years exist */}
          {isMultiYear && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className={`p-1 rounded transition-colors ${
                  canScrollLeft
                    ? 'text-slate-700 hover:bg-white hover:text-slate-900 shadow-2xs cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Scroll timeline backward"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-medium text-slate-500 px-1 font-mono">
                {budgets.length} yrs
              </span>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className={`p-1 rounded transition-colors ${
                  canScrollRight
                    ? 'text-slate-700 hover:bg-white hover:text-slate-900 shadow-2xs cursor-pointer'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Scroll timeline forward"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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

      {/* Chart Legend & Active Selection / Hover Details */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 text-xs text-slate-600 border-b border-slate-50">
        <div className="text-[11px] text-slate-500">
          {hoveredIndex !== null ? (
            <span className="font-semibold text-slate-800">
              {budgets[hoveredIndex]?.fiscalYear}: ${budgets[hoveredIndex]?.totalCost.toLocaleString()} ({budgets[hoveredIndex]?.itemCount} items) · Hardware: ${budgets[hoveredIndex]?.hardwareCost.toLocaleString()} · Labor: ${budgets[hoveredIndex]?.laborCost.toLocaleString()}
            </span>
          ) : isMultiYear ? (
            <span className="text-slate-400">
              Tip: Scroll horizontally or use arrows to view all forecast years
            </span>
          ) : (
            <span>Click any fiscal year bar to filter fleet inventory below</span>
          )}
        </div>

        <div className="flex items-center gap-4">
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
      </div>

      {/* Horizontal Scrollable Bar Chart Container */}
      <div className="relative pt-4 pb-2">
        {/* Subtle Fade Edge Gradients when scrollable */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="overflow-x-auto overflow-y-visible pb-2 pt-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
        >
          <div
            className="flex items-end gap-3 sm:gap-6 min-w-full justify-between"
            style={{
              height: `${chartHeight}px`,
              minWidth: budgets.length > 6 ? `${budgets.length * 88}px` : '100%',
            }}
          >
            {budgets.map((b, idx) => {
              const isSelected = selectedFY === b.fiscalYear;
              const isHovered = hoveredIndex === idx;
              const totalPercent = Math.min(100, Math.round((b.totalCost / maxBudget) * 100));
              const hardwarePercent = b.totalCost > 0 ? (b.hardwareCost / b.totalCost) * 100 : 0;
              const laborPercent = b.totalCost > 0 ? (b.laborCost / b.totalCost) * 100 : 0;

              return (
                <button
                  type="button"
                  key={b.fiscalYear}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onSelectFY && onSelectFY(isSelected ? null : b.fiscalYear)}
                  className={`relative flex flex-col items-center h-full justify-end cursor-pointer group shrink-0 min-w-[72px] sm:min-w-[80px] flex-1 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded p-1 transition-all ${
                    selectedFY && !isSelected ? 'opacity-35 hover:opacity-85' : 'opacity-100'
                  }`}
                  title={`Click to view classroom packages & devices for ${b.fiscalYear}`}
                >
                  {/* Value on Top */}
                  <div
                    className={`text-[11px] font-mono tabular-nums font-semibold mb-1.5 text-center whitespace-nowrap transition-colors ${
                      isSelected ? 'text-sky-700 font-bold' : 'text-slate-700 group-hover:text-sky-600'
                    }`}
                  >
                    ${Math.round(b.totalCost / 1000)}k
                  </div>

                  {/* The Bar */}
                  <div
                    className={`w-full max-w-[54px] rounded-t-sm transition-all relative overflow-hidden group-hover:scale-y-[1.03] origin-bottom ${
                      isSelected
                        ? 'ring-2 ring-sky-500 ring-offset-2 shadow-sm'
                        : 'group-hover:ring-1 group-hover:ring-sky-400 group-hover:ring-offset-1'
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

                  {/* Fiscal Year Label as Active Link */}
                  <div className="mt-2 text-center whitespace-nowrap">
                    <div
                      className={`text-xs font-bold transition-all flex items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'text-sky-700 underline font-extrabold scale-105'
                          : 'text-slate-800 group-hover:text-sky-600 group-hover:underline'
                      }`}
                    >
                      <span>{b.fiscalYear}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                      {b.itemCount} {b.itemCount === 1 ? 'unit' : 'units'}
                    </div>
                    <div className="text-[9px] font-semibold text-sky-600 opacity-80 group-hover:opacity-100 group-hover:underline mt-0.5">
                      {isSelected ? 'Active Filter ✓' : 'Inspect FY →'}
                    </div>
                  </div>

                  {/* Hover Tooltip Card */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-3 z-30 w-52 bg-slate-900 text-white rounded-md p-3 text-xs shadow-xl pointer-events-none -left-6 sm:left-1/2 sm:-translate-x-1/2">
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
                      <div className="mt-2 text-[10px] text-sky-300 font-sans font-medium">
                        Click to bring out {b.fiscalYear} packages & devices &darr;
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insight Banner */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {budgets[0]?.fiscalYear} incorporates urgent overdue units ({budgets[0]?.itemCount} items scheduled).
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-slate-700">
          Total {budgets.length}-Year CapEx: ${budgets.reduce((sum, b) => sum + b.totalCost, 0).toLocaleString()}
        </span>
      </div>
    </div>
  );
};
