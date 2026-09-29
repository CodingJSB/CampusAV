import React, { useState } from 'react';
import { AVItem, QuarterExpense } from '../types/inventory';
import { calculateNextQuarterExpenses, getQuarterLabel } from '../utils/calculations';
import { Calendar, DollarSign, Wrench, AlertTriangle, FileDown, Layers, CheckCircle2 } from 'lucide-react';

interface QuarterlyExpenseModuleProps {
  items: AVItem[];
  onOpenReportModal: () => void;
  onSelectItem?: (item: AVItem) => void;
}

export const QuarterlyExpenseModule: React.FC<QuarterlyExpenseModuleProps> = ({
  items,
  onOpenReportModal,
  onSelectItem,
}) => {
  // Let user pick which quarter to analyze (defaults to 2026-Q4)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('2026-Q4');

  const quartersList = [
    { id: '2026-Q4', label: 'Q4 2026 · Fall / Winter Recess' },
    { id: '2027-Q1', label: 'Q1 2027 · Spring Semester Kickoff' },
    { id: '2027-Q2', label: 'Q2 2027 · Spring Finals & Summer Prep' },
    { id: '2027-Q3', label: 'Q3 2027 · Summer Major Overhaul' },
    { id: '2027-Q4', label: 'Q4 2027 · Academic Year Refresh' },
  ];

  const quarterData: QuarterExpense = calculateNextQuarterExpenses(items, selectedQuarter);

  // Group items by category for visual distribution
  const categoryBreakdown: Record<string, number> = {};
  quarterData.items.forEach((item) => {
    categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + item.totalReplacementCost;
  });

  const categoryEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quarter Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">
                Quarterly Capital & Maintenance Expense Forecast
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Itemized near-term projected expenses for scheduled lifecycle turnovers, urgent hardware failures, and preventive servicing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Select Quarter:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              >
                {quartersList.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenReportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded shadow-xs transition-colors whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Pillar Cards for Selected Quarter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Quarter Requirement</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              ${quarterData.totalProjectedCost.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {quarterData.itemCount} units requiring funding in {selectedQuarter}
            </div>
          </div>

          <div className="bg-rose-50/50 border border-rose-200 rounded-md p-4">
            <div className="flex items-center justify-between text-rose-800 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue / Critical Failure</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-900 font-mono tabular-nums">
              ${quarterData.overdueItemsCost.toLocaleString()}
            </div>
            <div className="text-xs text-rose-700 mt-1">
              Non-deferrable replacements to restore classrooms
            </div>
          </div>

          <div className="bg-sky-50/50 border border-sky-200 rounded-md p-4">
            <div className="flex items-center justify-between text-sky-800 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Lifecycle Turnovers</span>
              <Layers className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold text-sky-900 font-mono tabular-nums">
              ${quarterData.replacementCost.toLocaleString()}
            </div>
            <div className="text-xs text-sky-700 mt-1">
              Reaching predetermined shelf life in {selectedQuarter}
            </div>
          </div>
        </div>

        {/* Visual Category Distribution Bar */}
        {quarterData.totalProjectedCost > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span>Projected Capital Allocation by Technology Category</span>
              <span className="font-mono text-slate-500">{categoryEntries.length} categories represented</span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded overflow-hidden flex">
              {categoryEntries.map(([cat, cost], idx) => {
                const colors = ['bg-sky-600', 'bg-blue-500', 'bg-indigo-500', 'bg-teal-500', 'bg-amber-500', 'bg-slate-400'];
                const pct = (cost / quarterData.totalProjectedCost) * 100;
                return (
                  <div
                    key={cat}
                    style={{ width: `${pct}%` }}
                    className={`${colors[idx % colors.length]} h-full transition-all`}
                    title={`${cat}: $${cost.toLocaleString()} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-slate-600">
              {categoryEntries.map(([cat, cost], idx) => {
                const colors = ['bg-sky-600', 'bg-blue-500', 'bg-indigo-500', 'bg-teal-500', 'bg-amber-500', 'bg-slate-400'];
                return (
                  <div key={cat} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-xs ${colors[idx % colors.length]}`} />
                    <span>{cat}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      ${cost.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Itemized Table of Scheduled Quarter Hardware */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Classrooms & Devices Slated for {selectedQuarter} Outlay
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review room locations, model specs, technician assignments, and cost estimates.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 font-mono">
            {quarterData.items.length} items
          </span>
        </div>

        {quarterData.items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No equipment replacements or repairs currently scheduled for {selectedQuarter}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-2.5 px-4">Room & Space</th>
                  <th className="py-2.5 px-4">Equipment Model</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Priority / Condition</th>
                  <th className="py-2.5 px-4">Age / Shelflife</th>
                  <th className="py-2.5 px-4 text-right">Est. Replacement</th>
                  <th className="py-2.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {quarterData.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">
                      <div>{item.room}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.building}</div>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-800">
                      <div className="font-medium">{item.makeModel}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.serialNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {item.lifecycleStatus === 'Past Lifespan / Overdue' ? (
                        <div className="text-rose-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue Replacement</span>
                        </div>
                      ) : (
                        <div className="text-slate-700">
                          {item.maintenanceStatus} ({item.condition})
                        </div>
                      )}
                      {item.activeIssue && item.activeIssue !== 'None' && (
                        <div className="text-[10px] text-amber-700 truncate max-w-xs mt-0.5">
                          {item.activeIssue}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-700">
                      {item.ageYears} yrs / {item.shelflifeYears} yrs
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900">
                      ${item.totalReplacementCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <button
                        onClick={() => onSelectItem && onSelectItem(item)}
                        className="text-xs text-sky-600 hover:text-sky-800 font-medium underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
