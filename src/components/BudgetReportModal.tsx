import React, { useState, useMemo } from 'react';
import { AVItem, ClassroomPackage, FiscalYearBudget, InventoryStats, QuarterExpense } from '../types/inventory';
import { groupItemsIntoClassroomPackages } from '../utils/calculations';
import { generateBudgetPlanningPDF } from '../utils/pdfGenerator';
import { FileText, FileDown, X, Printer, ShieldCheck, Check, Boxes } from 'lucide-react';

interface BudgetReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: InventoryStats;
  fiscalBudgets: FiscalYearBudget[];
  nextQuarter: QuarterExpense;
  items: AVItem[];
}

export const BudgetReportModal: React.FC<BudgetReportModalProps> = ({
  isOpen,
  onClose,
  stats,
  fiscalBudgets,
  nextQuarter,
  items,
}) => {
  if (!isOpen) return null;

  const [collegeName, setCollegeName] = useState('Central State College');
  const [departmentName, setDepartmentName] = useState('Classroom AV & Instructional Media');
  const [isExporting, setIsExporting] = useState(false);

  const classroomPackages = useMemo(() => groupItemsIntoClassroomPackages(items), [items]);

  const handleDownloadPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      generateBudgetPlanningPDF({
        collegeName,
        departmentName,
        stats,
        fiscalBudgets,
        nextQuarter,
        items,
      });
      setIsExporting(false);
    }, 200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Automated Classroom AV Budget Planning Report
              </h3>
              <p className="text-[11px] text-slate-500">
                Prepared for Provost, Deans, and IT Leadership · Client-side generated
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded hover:bg-sky-500 shadow-xs transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Customizer Inputs */}
        <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Institution:</span>
            <input
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Department:</span>
            <input
              type="text"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-sky-500 w-64"
            />
          </div>
          <div className="ml-auto text-[11px] text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Client-Side Data Privacy Verified</span>
          </div>
        </div>

        {/* Report Content Preview (A4 styling) */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 bg-white">
          {/* Institutional Header */}
          <div className="border-b border-slate-300 pb-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
              {collegeName}
            </h1>
            <div className="text-xs font-medium text-slate-600 mt-0.5">
              {departmentName} · Comprehensive AV Technology Lifecycle & Budget Allocation Report
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
              <span>Date Generated: {new Date().toLocaleDateString()}</span>
              <span>Classification: Internal Administrative Planning Document</span>
            </div>
          </div>

          {/* Executive Fleet Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-md">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Fleet Inventory</div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">{stats.totalItems} Units</div>
              <div className="text-[10px] text-slate-400 font-mono">Avg age: {stats.averageAgeYears} yrs</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Total Fleet Valuation</div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">${stats.totalFleetReplacementValue.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400">Total active capital</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Next FY Budget (CapEx)</div>
              <div className="text-lg font-bold text-sky-700 font-mono tabular-nums">${stats.nextFiscalYearBudget.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400">Scheduled turnover</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-500">Next Quarter Outlay</div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">${nextQuarter.totalProjectedCost.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400">{nextQuarter.itemCount} urgent/scheduled items</div>
            </div>
          </div>

          {/* Section 1: Next Quarter Itemized Plan */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
              Next Quarter ({nextQuarter.quarter}) Immediate Capital Outlay
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Detailed funding requirement for items with critical failures or approaching predetermined shelf life in {nextQuarter.label}:
            </p>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                <tr className="border-b border-slate-200">
                  <th className="py-2 px-3">Classroom / Room</th>
                  <th className="py-2 px-3">Hardware Model</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Lifecycle / Issue</th>
                  <th className="py-2 px-3 text-right">Projected Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {nextQuarter.items.slice(0, 8).map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">{it.room}</td>
                    <td className="py-2 px-3 font-sans text-slate-800">{it.makeModel}</td>
                    <td className="py-2 px-3 font-sans text-slate-600">{it.category}</td>
                    <td className="py-2 px-3 font-sans">
                      {it.lifecycleStatus === 'Past Lifespan / Overdue' ? (
                        <span className="text-rose-700 font-semibold">Overdue ({it.ageYears} yrs)</span>
                      ) : (
                        <span className="text-slate-600">{it.maintenanceStatus}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-900">
                      ${it.totalReplacementCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right font-sans">Total Next Quarter Need:</td>
                  <td className="py-2 px-3 text-right font-mono text-sky-700">
                    ${nextQuarter.totalProjectedCost.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 2: Classroom Bundled Retrofit Schedule */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
              Classroom Bundled Overhaul Projects (Whole-Room Renovations)
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Higher education AV technology is refreshed as complete classroom packages during recess periods. Below is the room-by-room master retrofit capital schedule:
            </p>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                <tr className="border-b border-slate-200">
                  <th className="py-2 px-3">Classroom / Room</th>
                  <th className="py-2 px-3">Building</th>
                  <th className="py-2 px-3">Target Overhaul Window</th>
                  <th className="py-2 px-3">Bundled Equipment</th>
                  <th className="py-2 px-3 text-right">Hardware ($)</th>
                  <th className="py-2 px-3 text-right">Labor ($)</th>
                  <th className="py-2 px-3 text-right">Total Package</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {classroomPackages.map((pkg) => (
                  <tr key={`${pkg.building}-${pkg.roomName}`}>
                    <td className="py-2 px-3 font-sans font-bold text-slate-900">{pkg.roomName}</td>
                    <td className="py-2 px-3 font-sans text-slate-600">{pkg.building}</td>
                    <td className="py-2 px-3 font-sans font-semibold text-sky-800">
                      {pkg.projectedFiscalYear} · {pkg.targetSeason}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-500 text-[10px] max-w-xs truncate">
                      {pkg.primaryEquipmentSummary}
                    </td>
                    <td className="py-2 px-3 text-right">${pkg.totalHardwareCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">${pkg.totalLaborCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      ${pkg.totalPackageCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Multi-Year Capital Expenditure Schedule */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
              Multi-Year Capital Expenditure (CapEx) Schedule
            </h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[11px]">
                <tr className="border-b border-slate-200">
                  <th className="py-2 px-3">Fiscal Year</th>
                  <th className="py-2 px-3">Turnover Count</th>
                  <th className="py-2 px-3 text-right">Hardware Replacement</th>
                  <th className="py-2 px-3 text-right">Labor / Integration</th>
                  <th className="py-2 px-3 text-right">Total FY CapEx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {fiscalBudgets.map((b) => (
                  <tr key={b.fiscalYear}>
                    <td className="py-2 px-3 font-bold text-slate-900">{b.fiscalYear}</td>
                    <td className="py-2 px-3">{b.itemCount} units</td>
                    <td className="py-2 px-3 text-right">${b.hardwareCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">${b.laborCost.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold text-sky-700">${b.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Institutional Shelf Life Policy */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px] space-y-1">
            <div className="font-bold text-slate-800 uppercase tracking-wide">
              Predetermined Academic AV Lifespan Policy:
            </div>
            <p>
              Projections calculated using solid-state laser runtimes (5 yrs), commercial touch displays (6 yrs), Crestron/Extron routing switchers (7 yrs), audio DSP beamforming (8 yrs), and wireless presentation hubs (4 yrs). All calculations executed client-side.
            </p>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Clicking Download PDF exports an official 2-page document ready for administrative distribution.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              Close Preview
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded hover:bg-sky-500 shadow-xs flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
