import React, { useState, useMemo } from 'react';
import { ClassroomPackage, AVItem, PlanningScenario, RoomPlanningOverride } from '../types/inventory';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Search,
  Filter,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  TrendingUp,
  Zap,
} from 'lucide-react';

interface BudgetKanbanBoardProps {
  classroomPackages: ClassroomPackage[];
  items: AVItem[];
  activeScenario: PlanningScenario;
  onUpdateRoomSchedule: (building: string, room: string, targetFY: string) => void;
  onUpdateRoomPriority: (building: string, room: string, priority: 'Critical' | 'Standard' | 'Elective') => void;
  onSelectRoom?: (roomName: string, building: string) => void;
  onOpenAutoLeveler: () => void;
}

export const BudgetKanbanBoard: React.FC<BudgetKanbanBoardProps> = ({
  classroomPackages,
  items,
  activeScenario,
  onUpdateRoomSchedule,
  onUpdateRoomPriority,
  onSelectRoom,
  onOpenAutoLeveler,
}) => {
  const [search, setSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedSpaceType, setSelectedSpaceType] = useState('all');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedUsageTier, setSelectedUsageTier] = useState('all');
  const [viewMode, setViewMode] = useState<'rooms' | 'components'>('rooms');

  const ceiling = activeScenario.annualBudgetCeiling || 250000;
  const baseYear = 2026;

  // Filter unique buildings & space types
  const buildings = useMemo(
    () => Array.from(new Set(classroomPackages.map((p) => p.building))).sort(),
    [classroomPackages]
  );
  const spaceTypes = useMemo(
    () => Array.from(new Set(classroomPackages.map((p) => p.spaceType).filter(Boolean))).sort(),
    [classroomPackages]
  );

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return classroomPackages.filter((pkg) => {
      if (selectedBuilding !== 'all' && pkg.building !== selectedBuilding) return false;
      if (selectedSpaceType !== 'all' && pkg.spaceType !== selectedSpaceType) return false;
      if (selectedUrgency !== 'all' && pkg.urgencyRating !== selectedUrgency) return false;
      if (selectedUsageTier !== 'all' && pkg.usageTier !== selectedUsageTier) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchRoom = pkg.roomName.toLowerCase().includes(q);
        const matchDisp = pkg.roomDisplayName.toLowerCase().includes(q);
        const matchBldg = pkg.building.toLowerCase().includes(q);
        const matchEq = pkg.primaryEquipmentSummary.toLowerCase().includes(q);
        return matchRoom || matchDisp || matchBldg || matchEq;
      }
      return true;
    });
  }, [classroomPackages, selectedBuilding, selectedSpaceType, selectedUrgency, selectedUsageTier, search]);

  // Fiscal Year columns: e.g. FY2026 through FY2031 (or higher if rooms are deferred further)
  const columns = useMemo(() => {
    let maxYear = 2031;
    filteredPackages.forEach((pkg) => {
      const y = parseInt((pkg.projectedFiscalYear || '').replace(/\D/g, ''), 10);
      if (!isNaN(y) && y > maxYear && y <= 2045) {
        maxYear = y;
      }
    });
    const list: string[] = [];
    for (let y = baseYear; y <= maxYear; y++) {
      list.push(`FY${y}`);
    }
    return list;
  }, [filteredPackages]);

  // Adaptive dropdown options helper: For any column year, include baseYear through colYear + 5
  const getAdaptiveFiscalYearsForColumn = (colFY: string): string[] => {
    const colYear = parseInt(colFY.replace(/\D/g, ''), 10) || baseYear;
    const maxYear = Math.max(baseYear + 5, colYear + 5);
    const options: string[] = [];
    for (let y = baseYear; y <= maxYear; y++) {
      options.push(`FY${y}`);
    }
    return options;
  };

  // Aggregate columns spend & count
  const columnData = useMemo(() => {
    const map: Record<
      string,
      {
        fy: string;
        packages: ClassroomPackage[];
        totalCost: number;
        overdueCount: number;
        isOverCeiling: boolean;
        variance: number;
      }
    > = {};

    columns.forEach((fy) => {
      map[fy] = {
        fy,
        packages: [],
        totalCost: 0,
        overdueCount: 0,
        isOverCeiling: false,
        variance: ceiling,
      };
    });

    filteredPackages.forEach((pkg) => {
      let target = pkg.projectedFiscalYear || 'FY2026';
      const targetNum = parseInt(target.replace(/\D/g, ''), 10) || baseYear;
      if (targetNum < baseYear) {
        target = `FY${baseYear}`;
      }

      if (!map[target]) {
        map[target] = {
          fy: target,
          packages: [],
          totalCost: 0,
          overdueCount: 0,
          isOverCeiling: false,
          variance: ceiling,
        };
      }

      map[target].packages.push(pkg);
      map[target].totalCost += pkg.projectedOverhaulCost;
      if (pkg.isOverdue) map[target].overdueCount += 1;
    });

    // Compute variances
    columns.forEach((fy) => {
      const col = map[fy];
      if (col) {
        col.variance = ceiling - col.totalCost;
        col.isOverCeiling = col.totalCost > ceiling;
      }
    });

    return map;
  }, [columns, filteredPackages, ceiling]);

  const handleShift = (pkg: ClassroomPackage, direction: -1 | 1) => {
    const currentFY = pkg.projectedFiscalYear || 'FY2026';
    const currentYear = parseInt(currentFY.replace(/\D/g, ''), 10) || baseYear;
    const newYear = Math.max(baseYear, currentYear + direction);
    onUpdateRoomSchedule(pkg.building, pkg.roomName, `FY${newYear}`);
  };

  return (
    <div className="space-y-4">
      {/* Kanban Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Multi-Year CapEx Leveling Board</span>
              </h3>
              <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                Annual Cap: ${(ceiling / 1000).toFixed(0)}k/year
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequence classrooms and overdue backlogs across future fiscal years. Hardware aging & condition risks remain permanently intact on overdue assets.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAutoLeveler}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>1-Click Auto-Level</span>
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classroom, building..."
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Buildings ({buildings.length})</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={selectedSpaceType}
            onChange={(e) => setSelectedSpaceType(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Space Types</option>
            {spaceTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            className="bg-amber-50 border border-amber-300 rounded px-2.5 py-1 text-amber-900 font-semibold focus:ring-1 focus:ring-amber-500"
            title="Filter Kanban cards by room overhaul urgency"
          >
            <option value="all">All Urgency Levels</option>
            <option value="Critical Urgency">Critical Urgency</option>
            <option value="High Urgency">High Urgency</option>
            <option value="Moderate Urgency">Moderate Urgency</option>
            <option value="Low Urgency">Low Urgency</option>
          </select>

          <select
            value={selectedUsageTier}
            onChange={(e) => setSelectedUsageTier(e.target.value)}
            className="bg-purple-50 border border-purple-300 rounded px-2.5 py-1 text-purple-900 font-semibold focus:ring-1 focus:ring-purple-500"
            title="Filter Kanban cards by campus usage intensity"
          >
            <option value="all">All Usage Tiers</option>
            <option value="High Usage">High Usage</option>
            <option value="Moderate Usage">Moderate Usage</option>
            <option value="Low Usage">Low Usage</option>
            <option value="Unranked">Unranked Spaces</option>
          </select>

          {(selectedBuilding !== 'all' || selectedSpaceType !== 'all' || selectedUrgency !== 'all' || selectedUsageTier !== 'all' || search) && (
            <button
              onClick={() => {
                setSelectedBuilding('all');
                setSelectedSpaceType('all');
                setSelectedUrgency('all');
                setSelectedUsageTier('all');
                setSearch('');
              }}
              className="text-sky-600 hover:text-sky-800 underline font-medium ml-auto"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Multi-Year Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {columns.map((fy, colIdx) => {
          const data = columnData[fy];
          const pctOfCeiling = Math.min(150, Math.round((data.totalCost / ceiling) * 100));

          return (
            <div
              key={fy}
              className={`flex flex-col rounded-lg border transition-all ${
                data.isOverCeiling
                  ? 'bg-rose-50/40 border-rose-300'
                  : 'bg-slate-100/70 border-slate-200'
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3 border-b rounded-t-lg space-y-1.5 ${
                  data.isOverCeiling
                    ? 'bg-rose-100/70 border-rose-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 font-mono">{fy}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                      {data.packages.length}
                    </span>
                  </div>

                  {data.isOverCeiling ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>+${Math.round(-data.variance / 1000)}k Over</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                      ${Math.round(data.variance / 1000)}k avail
                    </span>
                  )}
                </div>

                {/* Progress toward ceiling */}
                <div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-600 mb-0.5">
                    <span className="font-bold text-slate-800">
                      ${(data.totalCost / 1000).toFixed(0)}k
                    </span>
                    <span className="text-slate-400">/ ${(ceiling / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        data.isOverCeiling
                          ? 'bg-rose-600'
                          : pctOfCeiling > 85
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, pctOfCeiling)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-2 space-y-2.5 max-h-[750px] overflow-y-auto">
                {data.packages.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No overhauls scheduled in {fy}
                  </div>
                ) : (
                  data.packages.map((pkg) => {
                    const isOverdue = pkg.isOverdue;
                    const deferral = pkg.deferralYears || 0;

                    return (
                      <div
                        key={`${pkg.building}-${pkg.roomName}`}
                        className={`bg-white rounded-md border p-3 shadow-2xs hover:shadow-xs transition-all space-y-2 relative group ${
                          isOverdue ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{pkg.roomName}</span>
                              {pkg.spaceType && (
                                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-normal">
                                  {pkg.spaceType}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              {pkg.building}
                            </div>
                          </div>

                          {/* Readiness Score Badge */}
                          <div
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
                              pkg.readinessScore >= 80
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : pkg.readinessScore >= 60
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : pkg.readinessScore >= 40
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                            title={`Readiness score: ${pkg.readinessScore}/100 (${pkg.readinessRating})`}
                          >
                            {pkg.readinessScore}/100
                          </div>
                        </div>

                        {/* Physical Hardware Reality (NEVER CLEARED BY DEFERRAL) */}
                        <div className="flex flex-wrap gap-1 items-center">
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>EOL Overdue</span>
                            </span>
                          )}

                          {deferral > 0 ? (
                            <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-mono">
                              +{deferral}yr deferred
                            </span>
                          ) : deferral < 0 ? (
                            <span className="text-[10px] font-medium text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded font-mono">
                              {deferral}yr early
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                              On-Cycle
                            </span>
                          )}

                          {pkg.hasCriticalFailure && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded">
                              Classroom Down
                            </span>
                          )}

                          {/* Overhaul Urgency Badge (ALWAYS SHOWN) */}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                              pkg.urgencyRating === 'Critical Urgency'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : pkg.urgencyRating === 'High Urgency'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : pkg.urgencyRating === 'Moderate Urgency'
                                ? 'bg-sky-100 text-sky-800 border-sky-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                            title={`Overhaul Urgency: ${pkg.urgencyRating} · Urgency Score: ${pkg.urgencyScore || 0}/100`}
                          >
                            {pkg.urgencyRating === 'Critical Urgency' ? (
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            ) : pkg.urgencyRating === 'High Urgency' ? (
                              <Zap className="w-2.5 h-2.5 text-amber-600" />
                            ) : null}
                            <span>{pkg.urgencyRating || 'Moderate Urgency'}</span>
                          </span>

                          {/* Room Usage Ranking Badge (when ranked) */}
                          {pkg.usageRank && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                                pkg.usageTier === 'High Usage'
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : pkg.usageTier === 'Moderate Usage'
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title={`Campus Usage Rank #${pkg.usageRank} of ${pkg.totalRankedRooms || '?'} · ${pkg.usageHours ? pkg.usageHours + ' hrs/wk' : ''} ${pkg.utilizationRate ? '(' + pkg.utilizationRate + '%)' : ''}`}
                            >
                              <TrendingUp className="w-2.5 h-2.5 text-purple-700" />
                              <span>#{pkg.usageRank} Use</span>
                              {pkg.usageTier === 'High Usage' && (
                                <span className="font-semibold text-purple-700 text-[9px]">(Top)</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Equipment Summary */}
                        <div className="text-[10px] text-slate-600 line-clamp-1" title={pkg.primaryEquipmentSummary}>
                          {pkg.primaryEquipmentSummary}
                        </div>

                        {/* Cost & Controls */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                          <div className="font-bold text-slate-900 font-mono">
                            ${pkg.projectedOverhaulCost.toLocaleString()}
                          </div>

                          {/* Quick Shift Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              disabled={colIdx === 0}
                              onClick={() => handleShift(pkg, -1)}
                              className={`p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors ${
                                colIdx === 0 ? 'opacity-30 cursor-not-allowed' : ''
                              }`}
                              title="Advance to earlier fiscal year (-1 yr)"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Adaptive Dropdown: Includes baseYear (2026) up to colYear + 5 */}
                            {(() => {
                              const adaptiveOptions = getAdaptiveFiscalYearsForColumn(fy);
                              if (pkg.projectedFiscalYear && !adaptiveOptions.includes(pkg.projectedFiscalYear)) {
                                adaptiveOptions.push(pkg.projectedFiscalYear);
                                adaptiveOptions.sort();
                              }

                              return (
                                <select
                                  value={pkg.projectedFiscalYear}
                                  onChange={(e) => onUpdateRoomSchedule(pkg.building, pkg.roomName, e.target.value)}
                                  className="text-[10px] font-mono font-semibold bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-700 hover:border-indigo-400 focus:ring-1 focus:ring-indigo-500"
                                  title={`Move overhaul year. Options include current FY2026 through FY${(parseInt(fy.replace(/\D/g, ''), 10) || baseYear) + 5}`}
                                >
                                  {adaptiveOptions.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              );
                            })()}

                            <button
                              onClick={() => handleShift(pkg, 1)}
                              className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="Defer to later fiscal year (+1 yr)"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
