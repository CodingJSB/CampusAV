import React, { useState, useMemo } from 'react';
import {
  AVItem,
  ClassroomPackage,
  FiscalYearBudget,
  InventoryStats,
  BudgetPlanningMode,
  PlanningScenario,
  RoomPlanningOverride,
  ItemPlanningOverride,
} from './types/inventory';
import { getSampleInventory } from './data/sampleData';
import {
  calculateInventoryStats,
  calculateFiscalYearBudgets,
  enrichAVItem,
  groupItemsIntoClassroomPackages,
  createDefaultBaselineScenario,
  createLevelizedScenarioPreset,
  resolveScenarioItems,
} from './utils/calculations';
import { Header } from './components/Header';
import { ScenarioToolbar } from './components/ScenarioToolbar';
import { UploadZone } from './components/UploadZone';
import { MetricsCards } from './components/MetricsCards';
import { FiscalBudgetChart } from './components/FiscalBudgetChart';
import { MaintenanceIssuesPanel } from './components/MaintenanceIssuesPanel';
import { InventoryTable } from './components/InventoryTable';
import { ClassroomPackagesView } from './components/ClassroomPackagesView';
import { BudgetKanbanBoard } from './components/BudgetKanbanBoard';
import { AutoLevelerModal } from './components/AutoLevelerModal';
import { BatchActionToolbar } from './components/BatchActionToolbar';
import { ItemDetailModal } from './components/ItemDetailModal';
import { BudgetReportModal } from './components/BudgetReportModal';
import { RoomReadinessReportModal } from './components/RoomReadinessReportModal';
import { exportActiveInventory, exportClassroomPackages, exportRoomReadinessReport } from './utils/spreadsheet';
import { generateRoomReadinessPDF } from './utils/pdfGenerator';
import {
  UploadCloud,
  FileSpreadsheet,
  FileDown,
  FileText,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function App() {
  // Immutable Master Hardware Inventory (transient in browser memory)
  const [masterItems, setMasterItems] = useState<AVItem[]>(() => getSampleInventory());
  const [activeFilename, setActiveFilename] = useState<string | null>('Sample_College_AV_Fleet.xlsx');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bundled' | 'kanban' | 'maintenance' | 'inventory' | 'reports'>('dashboard');

  // Multi-Scenario Modeling State
  const [scenarios, setScenarios] = useState<PlanningScenario[]>(() => {
    const initialSample = getSampleInventory();
    const baseline = createDefaultBaselineScenario();
    const levelized = createLevelizedScenarioPreset(initialSample);
    return [baseline, levelized];
  });
  const [activeScenarioId, setActiveScenarioId] = useState<string>('levelized-5yr');

  // Batch Multi-Select State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Track edits made during session
  const [editedCount, setEditedCount] = useState<number>(0);
  const [lastExportedTime, setLastExportedTime] = useState<string | null>(null);

  // Modals & Selection
  const [selectedItem, setSelectedItem] = useState<AVItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReadinessModalOpen, setIsReadinessModalOpen] = useState(false);
  const [isAutoLevelerOpen, setIsAutoLevelerOpen] = useState(false);
  const [isExportingReadinessQuick, setIsExportingReadinessQuick] = useState(false);
  const [selectedFY, setSelectedFY] = useState<string | null>(null);

  // Budget Planning Mode: Whole Room Turnkey Overhaul (5% Compounded Inflation) vs Individual Component Swaps
  const [planningMode, setPlanningMode] = useState<BudgetPlanningMode>('whole_room');

  // What-If Simulation State
  const [lifespanOffset, setLifespanOffset] = useState<number>(0); // -1, 0, +1, +2 years
  const [dashboardDirectoryView, setDashboardDirectoryView] = useState<'bundled' | 'components'>('bundled');

  // Active Scenario Branch
  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) || scenarios[0],
    [scenarios, activeScenarioId]
  );

  // Dynamically resolve master items with active scenario planning overrides
  const activeItems = useMemo(() => {
    return resolveScenarioItems(masterItems, activeScenario);
  }, [masterItems, activeScenario]);

  // Dynamically adjust items if What-If simulation slider is active
  const simulatedItems = useMemo(() => {
    if (lifespanOffset === 0) return activeItems;
    return activeItems.map((it) =>
      enrichAVItem({
        ...it,
        shelflifeYears: Math.max(2, it.shelflifeYears + lifespanOffset),
      })
    );
  }, [activeItems, lifespanOffset]);

  // Derived Analytics (Whole-Room packages computed first so inflation & readiness feed into budgets)
  const classroomPackages: ClassroomPackage[] = useMemo(
    () => groupItemsIntoClassroomPackages(simulatedItems, activeScenario.inflationRate || 0.05),
    [simulatedItems, activeScenario.inflationRate]
  );

  const fiscalBudgets: FiscalYearBudget[] = useMemo(
    () =>
      calculateFiscalYearBudgets(
        simulatedItems,
        undefined,
        planningMode,
        classroomPackages,
        activeScenario.annualBudgetCeiling
      ),
    [simulatedItems, planningMode, classroomPackages, activeScenario.annualBudgetCeiling]
  );

  const stats: InventoryStats = useMemo(() => {
    const s = calculateInventoryStats(simulatedItems, planningMode, classroomPackages);
    const overCeilingCount = fiscalBudgets.filter((b) => b.isOverCeiling).length;
    const deferredCount = simulatedItems.filter((i) => i.deferralYears > 0).length;
    return {
      ...s,
      budgetCeiling: activeScenario.annualBudgetCeiling,
      overCeilingYearsCount: overCeilingCount,
      deferredCount,
    };
  }, [simulatedItems, planningMode, classroomPackages, fiscalBudgets, activeScenario.annualBudgetCeiling]);

  // Count years exceeding ceiling
  const overCeilingYearsCount = useMemo(
    () => fiscalBudgets.filter((b) => b.isOverCeiling).length,
    [fiscalBudgets]
  );

  // Red-Yellow-Green Readiness Distribution Analytics
  const readinessStats = useMemo(() => {
    let green = 0;
    let yellow = 0;
    let red = 0;
    let sum = 0;
    classroomPackages.forEach((pkg) => {
      sum += pkg.readinessScore;
      if (pkg.readinessScore >= 60) green++;
      else if (pkg.readinessScore >= 40) yellow++;
      else red++;
    });
    const total = classroomPackages.length;
    const avg = total > 0 ? Math.round(sum / total) : 0;
    return { green, yellow, red, avg, total };
  }, [classroomPackages]);

  const handleDownloadReadinessPDF = () => {
    setIsExportingReadinessQuick(true);
    setTimeout(() => {
      generateRoomReadinessPDF({
        collegeName: 'Central State College',
        departmentName: 'Classroom AV & Instructional Media',
        packages: classroomPackages,
      });
      setIsExportingReadinessQuick(false);
    }, 200);
  };

  const handleExportReadinessCSV = () => {
    exportRoomReadinessReport(classroomPackages, 'csv');
  };

  // Scenario Handlers
  const handleSelectScenario = (id: string) => {
    setActiveScenarioId(id);
    setSelectedItemIds([]);
  };

  const handleCreateScenario = (name: string, description: string, cloneFromActive: boolean) => {
    const newId = `scenario-${Date.now()}`;
    const newScenario: PlanningScenario = {
      id: newId,
      name,
      description: description || `Created from ${activeScenario.name}`,
      isBaseline: false,
      annualBudgetCeiling: activeScenario.annualBudgetCeiling || 250000,
      inflationRate: activeScenario.inflationRate || 0.05,
      itemOverrides: cloneFromActive ? { ...activeScenario.itemOverrides } : {},
      roomOverrides: cloneFromActive ? { ...activeScenario.roomOverrides } : {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newId);
  };

  const handleUpdateCeiling = (newCeiling: number) => {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === activeScenarioId) {
          return {
            ...sc,
            annualBudgetCeiling: newCeiling,
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
  };

  const handleResetOverrides = () => {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === activeScenarioId && !sc.isBaseline) {
          return {
            ...sc,
            itemOverrides: {},
            roomOverrides: {},
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
    setSelectedItemIds([]);
  };

  const handleImportScenario = (importedScenario: PlanningScenario) => {
    setScenarios((prev) => [...prev, importedScenario]);
    setActiveScenarioId(importedScenario.id);
  };

  const handleApplyLevelingProposal = (proposedOverrides: Record<string, RoomPlanningOverride>) => {
    // If active scenario is baseline, create a new branch automatically
    let targetScenarioId = activeScenarioId;
    if (activeScenario.isBaseline) {
      const newId = `scenario-${Date.now()}`;
      const newBranch: PlanningScenario = {
        id: newId,
        name: 'Auto-Leveled Plan',
        description: 'Generated from 1-Click Smart Budget Leveler algorithm',
        isBaseline: false,
        annualBudgetCeiling: activeScenario.annualBudgetCeiling,
        inflationRate: activeScenario.inflationRate,
        itemOverrides: {},
        roomOverrides: proposedOverrides,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setScenarios((prev) => [...prev, newBranch]);
      setActiveScenarioId(newId);
      setEditedCount((prev) => prev + 1);
      return;
    }

    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === targetScenarioId) {
          return {
            ...sc,
            roomOverrides: {
              ...sc.roomOverrides,
              ...proposedOverrides,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
    setEditedCount((prev) => prev + 1);
  };

  const handleUpdateRoomSchedule = (building: string, room: string, targetFY: string) => {
    const roomKey = `${building}::${room}`;
    // If on baseline, clone to new branch
    let targetId = activeScenarioId;
    if (activeScenario.isBaseline) {
      const newId = `scenario-${Date.now()}`;
      const newBranch: PlanningScenario = {
        id: newId,
        name: 'Working CapEx Plan',
        description: 'Editable branch created from baseline schedule',
        isBaseline: false,
        annualBudgetCeiling: activeScenario.annualBudgetCeiling,
        inflationRate: activeScenario.inflationRate,
        itemOverrides: {},
        roomOverrides: {
          [roomKey]: { targetFiscalYear: targetFY },
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setScenarios((prev) => [...prev, newBranch]);
      setActiveScenarioId(newId);
      setEditedCount((prev) => prev + 1);
      return;
    }

    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === targetId) {
          return {
            ...sc,
            roomOverrides: {
              ...sc.roomOverrides,
              [roomKey]: {
                ...sc.roomOverrides[roomKey],
                targetFiscalYear: targetFY,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
    setEditedCount((prev) => prev + 1);
  };

  const handleUpdateRoomPriority = (
    building: string,
    room: string,
    priority: 'Critical' | 'Standard' | 'Elective'
  ) => {
    const roomKey = `${building}::${room}`;
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === activeScenarioId && !sc.isBaseline) {
          return {
            ...sc,
            roomOverrides: {
              ...sc.roomOverrides,
              [roomKey]: {
                ...sc.roomOverrides[roomKey],
                priority,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
  };

  // Batch Multi-Select Handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (filteredIds: string[]) => {
    const isAllSelected = filteredIds.every((id) => selectedItemIds.includes(id));
    if (isAllSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleBatchAssignFY = (targetFY: string) => {
    if (selectedItemIds.length === 0) return;
    const overrides: Record<string, ItemPlanningOverride> = {};
    selectedItemIds.forEach((id) => {
      overrides[id] = {
        ...activeScenario.itemOverrides[id],
        targetFiscalYear: targetFY,
      };
    });

    let targetId = activeScenarioId;
    if (activeScenario.isBaseline) {
      const newId = `scenario-${Date.now()}`;
      const newBranch: PlanningScenario = {
        id: newId,
        name: 'Batch Scheduled Plan',
        description: 'Branch with batch fiscal year reassignments',
        isBaseline: false,
        annualBudgetCeiling: activeScenario.annualBudgetCeiling,
        inflationRate: activeScenario.inflationRate,
        itemOverrides: overrides,
        roomOverrides: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setScenarios((prev) => [...prev, newBranch]);
      setActiveScenarioId(newId);
    } else {
      setScenarios((prev) =>
        prev.map((sc) => {
          if (sc.id === targetId) {
            return {
              ...sc,
              itemOverrides: {
                ...sc.itemOverrides,
                ...overrides,
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return sc;
        })
      );
    }

    setEditedCount((prev) => prev + selectedItemIds.length);
    setSelectedItemIds([]);
  };

  const handleBatchAssignPriority = (priority: 'Critical' | 'Standard' | 'Elective') => {
    if (selectedItemIds.length === 0) return;
    const overrides: Record<string, ItemPlanningOverride> = {};
    selectedItemIds.forEach((id) => {
      overrides[id] = {
        ...activeScenario.itemOverrides[id],
        priority,
      };
    });

    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === activeScenarioId && !sc.isBaseline) {
          return {
            ...sc,
            itemOverrides: {
              ...sc.itemOverrides,
              ...overrides,
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
  };

  const handleBatchResetBaseline = () => {
    if (selectedItemIds.length === 0) return;
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === activeScenarioId && !sc.isBaseline) {
          const nextOverrides = { ...sc.itemOverrides };
          selectedItemIds.forEach((id) => {
            delete nextOverrides[id];
          });
          return {
            ...sc,
            itemOverrides: nextOverrides,
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
    setSelectedItemIds([]);
  };

  // General Handlers
  const handleDataLoaded = (newItems: AVItem[], filename: string) => {
    setMasterItems(newItems);
    setActiveFilename(filename);
    setSelectedFY(null);
    setLifespanOffset(0);
    setEditedCount(0);
    setLastExportedTime(null);
    setSelectedItemIds([]);
    const baseline = createDefaultBaselineScenario();
    const levelized = createLevelizedScenarioPreset(newItems);
    setScenarios([baseline, levelized]);
    setActiveScenarioId(levelized.id);
  };

  const handleResetToSample = () => {
    const sample = getSampleInventory();
    setMasterItems(sample);
    setActiveFilename('Sample_College_AV_Fleet.xlsx');
    setSelectedFY(null);
    setLifespanOffset(0);
    setEditedCount(0);
    setLastExportedTime(null);
    setSelectedItemIds([]);
    const baseline = createDefaultBaselineScenario();
    const levelized = createLevelizedScenarioPreset(sample);
    setScenarios([baseline, levelized]);
    setActiveScenarioId(levelized.id);
  };

  const handleClearData = () => {
    setMasterItems([]);
    setActiveFilename(null);
    setSelectedFY(null);
    setEditedCount(0);
    setLastExportedTime(null);
    setSelectedItemIds([]);
  };

  const handleOpenItem = (item: AVItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleUpdateItem = (updatedItem: AVItem) => {
    // Physical inventory fields update masterItems
    setMasterItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
    setEditedCount((prev) => prev + 1);
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleDownloadUpdatedFile = (format: 'csv' | 'xlsx' = 'csv') => {
    const rawName = activeFilename ? activeFilename.replace(/\.[^/.]+$/, '') : 'Campus_AV_Inventory';
    const cleanName = rawName.replace(/_Updated_\d{4}-\d{2}-\d{2}$/, '');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${cleanName}_Updated_${dateStr}.${format}`;
    exportActiveInventory(activeItems, format, filename, activeScenario.name);
    setLastExportedTime(new Date().toLocaleTimeString());
  };

  const handleDownloadPackagesFile = (format: 'csv' | 'xlsx' = 'csv') => {
    const rawName = activeFilename ? activeFilename.replace(/\.[^/.]+$/, '') : 'Campus_AV';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${rawName}_Classroom_Packages_${dateStr}.${format}`;
    exportClassroomPackages(classroomPackages, format, filename);
  };

  const handleUpdateRoomCost = (building: string, room: string, cost: number, year?: number) => {
    const roomKey = `${building}::${room}`;
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id === activeScenarioId && !sc.isBaseline) {
          return {
            ...sc,
            roomOverrides: {
              ...sc.roomOverrides,
              [roomKey]: {
                ...sc.roomOverrides[roomKey],
                customBaselineCost: cost,
              },
            },
            updatedAt: new Date().toISOString(),
          };
        }
        return sc;
      })
    );
    setEditedCount((prev) => prev + 1);
  };

  const handleSelectFY = (fy: string | null) => {
    setSelectedFY(fy);
    if (fy) {
      setTimeout(() => {
        const el = document.getElementById('fleet-directory-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const handleMetricCardFilter = (filterType: string) => {
    if (filterType === 'maintenance') {
      setActiveTab('maintenance');
    } else if (filterType === 'overdue') {
      setActiveTab('inventory');
    }
  };

  // Selected items calculation for floating toolbar
  const selectedItemsData = useMemo(() => {
    const selected = activeItems.filter((it) => selectedItemIds.includes(it.id));
    const totalCost = selected.reduce((acc, it) => acc + it.totalReplacementCost, 0);
    return { count: selected.length, totalCost };
  }, [activeItems, selectedItemIds]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onResetToSample={handleResetToSample}
        itemCount={masterItems.length}
        roomCount={classroomPackages.length}
      />

      {/* Scenario Management Toolbar */}
      {masterItems.length > 0 && (
        <ScenarioToolbar
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          onCreateScenario={handleCreateScenario}
          onUpdateCeiling={handleUpdateCeiling}
          onResetOverrides={handleResetOverrides}
          onImportScenario={handleImportScenario}
          onOpenAutoLeveler={() => setIsAutoLevelerOpen(true)}
          overCeilingYearsCount={overCeilingYearsCount}
        />
      )}

      {/* Active Dataset & Privacy Notice Sub-banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
            <span>Active Sheet:</span>
            <strong className="font-mono text-slate-800">{activeFilename || 'None loaded'}</strong>
            <span className="text-slate-300">·</span>
            <span>{masterItems.length} Classrooms/Assets Tracked</span>
            {editedCount > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                {editedCount} edit{editedCount > 1 ? 's' : ''} saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {editedCount > 0 && (
              <button
                onClick={() => handleDownloadUpdatedFile('csv')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs transition-colors"
                title="Download updated CSV file with your saved edits"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Updated CSV</span>
              </button>
            )}

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
        {masterItems.length === 0 ? (
          <UploadZone
            onDataLoaded={handleDataLoaded}
            onLoadSample={handleResetToSample}
          />
        ) : (
          <>
            {/* Key Fleet Metrics Cards */}
            <MetricsCards
              stats={stats}
              onFilterClick={handleMetricCardFilter}
              planningMode={planningMode}
            />

            {/* TAB: DASHBOARD & LIFECYCLE OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Visible & Active Download Updated CSV Banner when edits exist */}
                {editedCount > 0 && (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all animate-fadeIn">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <FileDown className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-emerald-950">
                            {editedCount} Inventory Change{editedCount > 1 ? 's' : ''} Saved
                          </h4>
                          <span className="bg-emerald-200/90 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Ready for Export
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800 mt-0.5">
                          Edits made in the room inspector are updated in active memory. Click the button to export the updated CSV file.
                          {lastExportedTime && (
                            <span className="font-semibold text-emerald-900 ml-1.5">
                              (Last downloaded at {lastExportedTime})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadUpdatedFile('xlsx')}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-white border border-emerald-300 rounded hover:bg-emerald-100 transition-colors shadow-2xs"
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => handleDownloadUpdatedFile('csv')}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Download Updated CSV</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Fiscal Year Replacement Chart */}
                <FiscalBudgetChart
                  budgets={fiscalBudgets}
                  selectedFY={selectedFY}
                  onSelectFY={handleSelectFY}
                  planningMode={planningMode}
                  onTogglePlanningMode={setPlanningMode}
                  inflationRate={0.05}
                  annualBudgetCeiling={activeScenario.annualBudgetCeiling}
                />

                {/* Two-Column Grid: Upcoming FY Action Card + What-If Simulation */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Upcoming Fiscal Year Highlight Card */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Upcoming Fiscal Year Capital Upgrades
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Annual budget forecast for scheduled classroom overhauls and overdue hardware replacements
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('bundled')}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                      >
                        <span>Classroom Packages</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 my-4">
                      <div className="bg-slate-50 p-3 rounded">
                        <span className="text-[10px] uppercase font-semibold text-slate-400">Upcoming CapEx Need</span>
                        <div className="text-lg font-bold text-sky-700 font-mono tabular-nums">
                          ${stats.nextFiscalYearBudget.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-rose-50/50 p-3 rounded">
                        <span className="text-[10px] uppercase font-semibold text-rose-700">Overdue for Replacement</span>
                        <div className="text-lg font-bold text-rose-900 font-mono tabular-nums">
                          {stats.overdueCount} units
                        </div>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded">
                        <span className="text-[10px] uppercase font-semibold text-emerald-800">Classroom Fleet Size</span>
                        <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                          {classroomPackages.length} rooms
                        </div>
                      </div>
                    </div>

                    {/* Preview Table of Priority Classrooms */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Priority Classrooms Due for Upgrade:
                      </span>
                      {classroomPackages.slice(0, 3).map((pkg) => (
                        <div
                          key={`${pkg.building}-${pkg.roomName}`}
                          onClick={() => {
                            setActiveTab('bundled');
                            setSelectedFY(pkg.projectedFiscalYear);
                          }}
                          className="flex items-center justify-between p-2.5 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{pkg.roomDisplayName}</span>
                            <span className="text-slate-400 mx-1.5">·</span>
                            <span className="text-slate-600">{pkg.building}</span>
                          </div>
                          <div className="flex items-center gap-3 font-mono tabular-nums">
                            <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {pkg.projectedFiscalYear} Overhaul
                            </span>
                            <span className="font-semibold text-slate-900">
                              ${pkg.projectedOverhaulCost.toLocaleString()}
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
                <div id="fleet-directory-section" className="space-y-4 pt-2">
                  {/* Dedicated FY Selection Alert / Focus Banner */}
                  {selectedFY && (
                    <div className="bg-sky-50 border-2 border-sky-300 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {selectedFY}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {selectedFY} Replacement Schedule & CapEx
                            </h4>
                            <span className="bg-sky-200 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Active Filter
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Displaying classroom packages and individual equipment due for overhaul in {selectedFY}.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDashboardDirectoryView('bundled')}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                            dashboardDirectoryView === 'bundled'
                              ? 'bg-sky-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          View Classroom Packages
                        </button>
                        <button
                          onClick={() => setDashboardDirectoryView('components')}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                            dashboardDirectoryView === 'components'
                              ? 'bg-sky-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          View Individual Devices
                        </button>
                        <button
                          onClick={() => setSelectedFY(null)}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                        >
                          Clear Filter
                        </button>
                      </div>
                    </div>
                  )}

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
                      selectedFY={selectedFY}
                      onSelectFY={setSelectedFY}
                      onUpdateRoomCost={handleUpdateRoomCost}
                    />
                  ) : (
                    <InventoryTable
                      items={simulatedItems}
                      onSelectItem={handleOpenItem}
                      selectedFY={selectedFY}
                      selectedItemIds={selectedItemIds}
                      onToggleSelectItem={handleToggleSelectItem}
                      onToggleSelectAll={handleToggleSelectAll}
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
                selectedFY={selectedFY}
                onSelectFY={setSelectedFY}
                onUpdateRoomCost={handleUpdateRoomCost}
              />
            )}

            {/* TAB: CAPEX LEVELING KANBAN BOARD */}
            {activeTab === 'kanban' && (
              <BudgetKanbanBoard
                classroomPackages={classroomPackages}
                items={simulatedItems}
                activeScenario={activeScenario}
                onUpdateRoomSchedule={handleUpdateRoomSchedule}
                onUpdateRoomPriority={handleUpdateRoomPriority}
                onSelectRoom={(room, bldg) => {
                  setSelectedFY(null);
                  setActiveTab('bundled');
                }}
                onOpenAutoLeveler={() => setIsAutoLevelerOpen(true)}
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
                      Filter by building, category, physical condition, and replacement fiscal year. Use checkboxes for bulk fiscal year assignment.
                    </p>
                  </div>
                </div>
                <InventoryTable
                  items={simulatedItems}
                  onSelectItem={handleOpenItem}
                  selectedFY={selectedFY}
                  selectedItemIds={selectedItemIds}
                  onToggleSelectItem={handleToggleSelectItem}
                  onToggleSelectAll={handleToggleSelectAll}
                />
              </div>
            )}

            {/* TAB: AUTOMATED REPORTS / BUDGET PLANNING */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                {/* 1. FEATURED: Room Readiness Report (Red-Yellow-Green Audit) */}
                <div className="bg-white border-2 border-emerald-400/80 rounded-xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-emerald-100/60 to-transparent pointer-events-none"></div>
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Red-Yellow-Green Health & Operational Readiness Audit
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 font-mono">
                          Official Administrative Report
                        </span>
                      </div>

                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        Room Readiness Report
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Comprehensive campus audit detailing building and room specifications, composite readiness scores (0–100), and clear factor-by-factor explanations of how each score is determined based on component shelf-life depreciation, active maintenance penalties, and hardware replacement valuations. Fully color-coded across Red, Yellow, and Green readiness levels.
                      </p>

                      {/* Live Red-Yellow-Green Distribution Metrics */}
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-700">
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Campus Average:</span>
                          <span className="font-mono font-bold text-slate-900">{readinessStats.avg} / 100</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <span>Green (Optimal/Good):</span>
                          <span className="font-mono font-bold">{readinessStats.green} Rooms</span>
                          <span className="text-[10px] text-emerald-600 font-normal">({readinessStats.total > 0 ? Math.round((readinessStats.green / readinessStats.total) * 100) : 0}%)</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 font-semibold text-amber-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <span>Yellow (Fair/Monitor):</span>
                          <span className="font-mono font-bold">{readinessStats.yellow} Rooms</span>
                          <span className="text-[10px] text-amber-600 font-normal">({readinessStats.total > 0 ? Math.round((readinessStats.yellow / readinessStats.total) * 100) : 0}%)</span>
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 font-semibold text-rose-800">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                          <span>Red (Critical/Due):</span>
                          <span className="font-mono font-bold">{readinessStats.red} Rooms</span>
                          <span className="text-[10px] text-rose-600 font-normal">({readinessStats.total > 0 ? Math.round((readinessStats.red / readinessStats.total) * 100) : 0}%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Report Download & Preview Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
                      <button
                        onClick={handleDownloadReadinessPDF}
                        disabled={isExportingReadinessQuick}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>{isExportingReadinessQuick ? 'Generating Report...' : 'Download Room Readiness Report (PDF)'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsReadinessModalOpen(true)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Preview & Audit Rooms</span>
                        </button>

                        <button
                          onClick={handleExportReadinessCSV}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors"
                          title="Export report in CSV format"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>CSV</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Automated CapEx Budget Planning Report */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                          Executive CapEx Schedule
                        </span>
                        <span className="text-[11px] text-slate-400">Board of Trustees & Provost Format</span>
                      </div>
                      <h2 className="text-base font-bold text-slate-900">
                        Classroom AV CapEx Lifecycle & Budget Planning Report
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Generate multi-page PDF documents formatted for college executive leadership, including board of trustees capital requests, upcoming fiscal year allocations, and shelf-life policies.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 shadow-xs transition-colors"
                      >
                        <FileDown className="w-4 h-4" />
                        <span>Preview & Export CapEx PDF Report</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Report Section Summary Preview (3 columns) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                        Room Readiness Scoring
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        0–100 Index
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Evaluates each classroom via fractional remaining shelf life, automatic deductions for Out-of-Service tickets (-90 pts) and repair tickets (-30 pts), weighted by total hardware replacement value.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                        Upcoming FY Needs
                      </h4>
                      <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 font-mono">
                        ${stats.nextFiscalYearBudget.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Covers upcoming fiscal year capital allocation (${stats.nextFiscalYearBudget.toLocaleString()}) and urgent replacement of {stats.overdueCount} overdue units.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                        Long-Term CapEx Forecast
                      </h4>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                        6-Year Horizon
                      </span>
                    </div>
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
        items={simulatedItems}
      />

      {/* 4. Room Readiness Report Preview & PDF Export Modal */}
      <RoomReadinessReportModal
        isOpen={isReadinessModalOpen}
        onClose={() => setIsReadinessModalOpen(false)}
        packages={classroomPackages}
      />

      {/* 5. 1-Click Automated Budget Leveler Modal */}
      <AutoLevelerModal
        isOpen={isAutoLevelerOpen}
        onClose={() => setIsAutoLevelerOpen(false)}
        classroomPackages={classroomPackages}
        activeScenario={activeScenario}
        onApplyProposal={handleApplyLevelingProposal}
      />

      {/* 6. Floating Batch Action Toolbar */}
      <BatchActionToolbar
        selectedCount={selectedItemsData.count}
        selectedTotalCost={selectedItemsData.totalCost}
        onClearSelection={() => setSelectedItemIds([])}
        onBatchAssignFY={handleBatchAssignFY}
        onBatchAssignPriority={handleBatchAssignPriority}
        onBatchResetBaseline={handleBatchResetBaseline}
      />
    </div>
  );
}
