import React, { useState, useMemo } from 'react';
import { AVItem, ClassroomPackage, FiscalYearBudget, InventoryStats, QuarterExpense } from './types/inventory';
import { getSampleInventory } from './data/sampleData';
import {
  calculateInventoryStats,
  calculateFiscalYearBudgets,
  calculateNextQuarterExpenses,
  enrichAVItem,
  groupItemsIntoClassroomPackages,
} from './utils/calculations';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { MetricsCards } from './components/MetricsCards';
import { FiscalBudgetChart } from './components/FiscalBudgetChart';
import { QuarterlyExpenseModule } from './components/QuarterlyExpenseModule';
import { MaintenanceIssuesPanel } from './components/MaintenanceIssuesPanel';
import { InventoryTable } from './components/InventoryTable';
import { ClassroomPackagesView } from './components/ClassroomPackagesView';
import { ItemDetailModal } from './components/ItemDetailModal';
import { BudgetReportModal } from './components/BudgetReportModal';
import {
  UploadCloud,
  FileSpreadsheet,
  FileDown,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function App() {
  // Inventory state (transient in browser memory)
  const [items, setItems] = useState<AVItem[]>(() => getSampleInventory());
  const [activeFilename, setActiveFilename] = useState<string | null>('Sample_College_AV_Fleet.xlsx');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bundled' | 'quarterly' | 'maintenance' | 'inventory' | 'reports'>('dashboard');

  // Modals & Selection
  const [selectedItem, setSelectedItem] = useState<AVItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedFY, setSelectedFY] = useState<string | null>(null);

  // What-If Simulation State
  const [lifespanOffset, setLifespanOffset] = useState<number>(0); // -1, 0, +1, +2 years
  const [dashboardDirectoryView, setDashboardDirectoryView] = useState<'bundled' | 'components'>('bundled');

  // Dynamically adjust items if What-If simulation slider is active
  const simulatedItems = useMemo(() => {
    if (lifespanOffset === 0) return items;
    return items.map((it) =>
      enrichAVItem({
        ...it,
        shelflifeYears: Math.max(2, it.shelflifeYears + lifespanOffset),
      })
    );
  }, [items, lifespanOffset]);

  // Derived Analytics
  const stats: InventoryStats = useMemo(() => calculateInventoryStats(simulatedItems), [simulatedItems]);
  const fiscalBudgets: FiscalYearBudget[] = useMemo(() => calculateFiscalYearBudgets(simulatedItems), [simulatedItems]);
  const nextQuarter: QuarterExpense = useMemo(() => calculateNextQuarterExpenses(simulatedItems), [simulatedItems]);
  const classroomPackages: ClassroomPackage[] = useMemo(
    () => groupItemsIntoClassroomPackages(simulatedItems),
    [simulatedItems]
  );

  // Handlers
  const handleDataLoaded = (newItems: AVItem[], filename: string) => {
    setItems(newItems);
    setActiveFilename(filename);
    setSelectedFY(null);
    setLifespanOffset(0);
  };

  const handleResetToSample = () => {
    setItems(getSampleInventory());
    setActiveFilename('Sample_College_AV_Fleet.xlsx');
    setSelectedFY(null);
    setLifespanOffset(0);
  };

  const handleClearData = () => {
    setItems([]);
    setActiveFilename(null);
    setSelectedFY(null);
  };

  const handleOpenItem = (item: AVItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleUpdateItem = (updatedItem: AVItem) => {
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleMetricCardFilter = (filterType: string) => {
    if (filterType === 'quarter') {
      setActiveTab('quarterly');
    } else if (filterType === 'maintenance') {
      setActiveTab('maintenance');
    } else if (filterType === 'overdue') {
      setActiveTab('inventory');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onResetToSample={handleResetToSample}
        itemCount={items.length}
        roomCount={classroomPackages.length}
      />

      {/* Active Dataset & Privacy Notice Sub-banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
            <span>Active Sheet:</span>
            <strong className="font-mono text-slate-800">{activeFilename || 'None loaded'}</strong>
            <span className="text-slate-300">·</span>
            <span>{items.length} Classrooms/Assets Tracked</span>
          </div>

          <div className="flex items-center gap-3">
            {lifespanOffset !== 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                Simulation Active: {lifespanOffset > 0 ? `+${lifespanOffset}` : lifespanOffset} yr shelflife
              </span>
            )}

            <button
              onClick={handleResetToSample}
              className="text-slate-500 hover:text-slate-800 font-medium underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset to Sample Fleet
            </button>

            <span className="text-slate-300">·</span>

            <button
              onClick={handleClearData}
              className="text-slate-500 hover:text-rose-600 font-medium"
            >
              Clear Session
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* If no items loaded, show prominent upload zone */}
        {items.length === 0 ? (
          <UploadZone
            onDataLoaded={handleDataLoaded}
            onLoadSample={handleResetToSample}
          />
        ) : (
          <>
            {/* Key Fleet Metrics Cards */}
            <MetricsCards stats={stats} onFilterClick={handleMetricCardFilter} />

            {/* TAB: DASHBOARD & LIFECYCLE OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Fiscal Year Replacement Chart */}
                <FiscalBudgetChart
                  budgets={fiscalBudgets}
                  selectedFY={selectedFY}
                  onSelectFY={setSelectedFY}
                />

                {/* Two-Column Grid: Next Quarter Action Card + What-If Simulation */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Next Quarter Highlight Card */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Next Quarter Projected Expenses ({nextQuarter.quarter})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {nextQuarter.label} · Immediate equipment replacements and critical room repairs
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('quarterly')}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                      >
                        <span>Full Forecast</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 my-4">
                      <div className="bg-slate-50 p-3 rounded">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Total Need</span>
                        <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                          ${nextQuarter.totalProjectedCost.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-rose-50/50 p-3 rounded">
                        <span className="text-[10px] uppercase font-semibold text-rose-700">Overdue / Failing</span>
                        <div className="text-lg font-bold text-rose-900 font-mono tabular-nums">
                          ${nextQuarter.overdueItemsCost.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-sky-50/50 p-3 rounded">
                        <span className="text-[10px] uppercase font-semibold text-sky-700">Scheduled Turnovers</span>
                        <div className="text-lg font-bold text-sky-900 font-mono tabular-nums">
                          ${nextQuarter.replacementCost.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Preview Table of Next Quarter items */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Top Priority Classrooms:
                      </span>
                      {nextQuarter.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleOpenItem(item)}
                          className="flex items-center justify-between p-2.5 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{item.room}</span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="text-slate-600">{item.makeModel}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono tabular-nums">
                            {item.lifecycleStatus === 'Past Lifespan / Overdue' && (
                              <span className="text-[10px] font-sans font-semibold text-rose-700">
                                Overdue EOL
                              </span>
                            )}
                            <span className="font-semibold text-slate-900">
                              ${item.totalReplacementCost.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* What-If Shelflife Budget Simulator */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                        <Sliders className="w-4 h-4 text-sky-600" />
                        <h3 className="text-sm font-bold text-slate-900">
                          What-If Shelflife Policy Simulator
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Simulate the budget impact of adjusting standard replacement cycles across all classroom hardware.
                      </p>

                      <div className="mt-5 space-y-4">
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                            <span>Adjust Shelflife Offset:</span>
                            <span className="font-mono text-sky-700">
                              {lifespanOffset === 0
                                ? 'Standard Policy (0 yrs)'
                                : `${lifespanOffset > 0 ? '+' : ''}${lifespanOffset} Years`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {[-1, 0, 1, 2].map((val) => (
                              <button
                                key={val}
                                onClick={() => setLifespanOffset(val)}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors ${
                                  lifespanOffset === val
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {val === 0 ? 'Default' : val > 0 ? `+${val} yr` : `${val} yr`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded border border-slate-100 text-xs space-y-1.5 font-mono tabular-nums">
                          <div className="flex justify-between text-slate-600">
                            <span>Simulated Next FY CapEx:</span>
                            <span className="font-bold text-slate-900">${stats.nextFiscalYearBudget.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>Overdue Units Count:</span>
                            <span className={`font-bold ${stats.overdueCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                              {stats.overdueCount} units
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                      Calculations update in real time. Does not alter your uploaded file.
                    </div>
                  </div>
                </div>

                {/* Fleet Directory Section: Toggle between Bundled Rooms and Individual Assets */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Classroom Fleet & System Directory
                      </h3>
                      <p className="text-xs text-slate-500">
                        Toggle between whole-room bundled retrofits and component asset tracking.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded text-xs">
                        <button
                          onClick={() => setDashboardDirectoryView('bundled')}
                          className={`px-3 py-1.5 rounded font-medium transition-colors ${
                            dashboardDirectoryView === 'bundled'
                              ? 'bg-white text-slate-900 font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Bundled Rooms ({classroomPackages.length})
                        </button>
                        <button
                          onClick={() => setDashboardDirectoryView('components')}
                          className={`px-3 py-1.5 rounded font-medium transition-colors ${
                            dashboardDirectoryView === 'components'
                              ? 'bg-white text-slate-900 font-semibold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Individual Components ({simulatedItems.length})
                        </button>
                      </div>

                      {selectedFY && (
                        <div className="text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200 flex items-center gap-1.5">
                          <span>Filtered: <strong>{selectedFY}</strong></span>
                          <button
                            onClick={() => setSelectedFY(null)}
                            className="text-slate-400 hover:text-slate-700 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {dashboardDirectoryView === 'bundled' ? (
                    <ClassroomPackagesView
                      packages={classroomPackages}
                      onSelectItem={handleOpenItem}
                      onOpenReportModal={() => setIsReportModalOpen(true)}
                    />
                  ) : (
                    <InventoryTable
                      items={simulatedItems}
                      onSelectItem={handleOpenItem}
                      selectedFY={selectedFY}
                    />
                  )}
                </div>
              </div>
            )}

            {/* TAB: BUNDLED CLASSROOM PACKAGES */}
            {activeTab === 'bundled' && (
              <ClassroomPackagesView
                packages={classroomPackages}
                onSelectItem={handleOpenItem}
                onOpenReportModal={() => setIsReportModalOpen(true)}
              />
            )}

            {/* TAB: NEXT QUARTER EXPENSES */}
            {activeTab === 'quarterly' && (
              <QuarterlyExpenseModule
                items={simulatedItems}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                onSelectItem={handleOpenItem}
              />
            )}

            {/* TAB: MAINTENANCE TICKETS */}
            {activeTab === 'maintenance' && (
              <MaintenanceIssuesPanel
                items={simulatedItems}
                onUpdateItem={handleUpdateItem}
                onSelectItem={handleOpenItem}
              />
            )}

            {/* TAB: INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Complete Classroom AV Inventory & Lifecycles
                    </h2>
                    <p className="text-xs text-slate-500">
                      Filter by building, category, physical condition, and replacement fiscal year.
                    </p>
                  </div>
                </div>
                <InventoryTable
                  items={simulatedItems}
                  onSelectItem={handleOpenItem}
                  selectedFY={selectedFY}
                />
              </div>
            )}

            {/* TAB: AUTOMATED REPORTS */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <div className="max-w-2xl">
                    <h2 className="text-base font-bold text-slate-900">
                      Automated Budget Planning & Capital Reports
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Generate multi-page PDF documents formatted for college executive leadership, including board of trustees capital requests, next quarter expense commitments, and shelf-life policies.
                    </p>

                    <div className="mt-5 flex items-center gap-3">
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded hover:bg-sky-500 shadow-xs"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Preview & Export Official PDF Report</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report Section Summary Preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                      Report Section 1: Near-Term Needs
                    </h4>
                    <p className="text-xs text-slate-500">
                      Covers immediate next quarter capital allocation (${nextQuarter.totalProjectedCost.toLocaleString()}) and urgent replacement of {stats.overdueCount} overdue units.
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                      Report Section 2: Long-Term CapEx Schedule
                    </h4>
                    <p className="text-xs text-slate-500">
                      Outlines 6-year capital forecasts from {fiscalBudgets[0]?.fiscalYear} through {fiscalBudgets[fiscalBudgets.length - 1]?.fiscalYear}, covering {stats.totalItems} fleet devices.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">CampusAV</span>
            <span>·</span>
            <span>Classroom AV Lifecycle & Budget Planning Engine</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% Client-Side Privacy: Data remains confidential in browser</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Item Details & Editor Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleUpdateItem}
      />

      {/* 2. Upload Spreadsheet Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-2xl w-full relative">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100"
            >
              ×
            </button>
            <UploadZone
              isModal={true}
              onDataLoaded={(newItems, fname) => {
                handleDataLoaded(newItems, fname);
                setIsUploadModalOpen(false);
              }}
              onLoadSample={() => {
                handleResetToSample();
                setIsUploadModalOpen(false);
              }}
              onClose={() => setIsUploadModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 3. Budget Report Preview & PDF Export Modal */}
      <BudgetReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        stats={stats}
        fiscalBudgets={fiscalBudgets}
        nextQuarter={nextQuarter}
        items={simulatedItems}
      />
    </div>
  );
}
