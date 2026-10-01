import React, { useState, useMemo, useEffect } from 'react';
import { ClassroomPackage, AVItem } from '../types/inventory';
import { exportClassroomPackages } from '../utils/spreadsheet';
import {
  Boxes,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  FileDown,
  X,
  Check,
  Edit3,
} from 'lucide-react';

interface ClassroomPackagesViewProps {
  packages: ClassroomPackage[];
  onSelectItem: (item: AVItem) => void;
  onOpenReportModal: () => void;
  selectedFY?: string | null;
  onSelectFY?: (fy: string | null) => void;
  onUpdateRoomCost?: (building: string, room: string, cost: number, year?: number) => void;
}

export const ClassroomPackagesView: React.FC<ClassroomPackagesViewProps> = ({
  packages,
  onSelectItem,
  onOpenReportModal,
  selectedFY,
  onSelectFY,
  onUpdateRoomCost,
}) => {
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [internalFY, setInternalFY] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [editingRoom, setEditingRoom] = useState<ClassroomPackage | null>(null);
  const [editCost, setEditCost] = useState<number>(35000);
  const [editYear, setEditYear] = useState<number>(2021);

  const activeFY = selectedFY !== undefined && selectedFY !== null ? selectedFY : internalFY;

  const handleFYChange = (newFY: string) => {
    if (onSelectFY) {
      onSelectFY(newFY === 'all' ? null : newFY);
    } else {
      setInternalFY(newFY);
    }
  };

  const buildings = useMemo(() => Array.from(new Set(packages.map((p) => p.building))).sort(), [packages]);
  const fiscalYears = useMemo(() => Array.from(new Set(packages.map((p) => p.projectedFiscalYear))).sort(), [packages]);

  // Auto-expand packages when a specific FY filter is selected
  useEffect(() => {
    if (activeFY !== 'all') {
      const expanded: Record<string, boolean> = {};
      packages.forEach((p) => {
        const matchesPackage = p.projectedFiscalYear === activeFY;
        const matchesAnyItem = p.items.some((it) => it.replacementFiscalYear === activeFY);
        if (matchesPackage || matchesAnyItem) {
          expanded[`${p.building}-${p.roomName}`] = true;
        }
      });
      setExpandedRooms((prev) => ({ ...prev, ...expanded }));
    }
  }, [activeFY, packages]);

  const toggleExpand = (roomKey: string) => {
    setExpandedRooms((prev) => ({ ...prev, [roomKey]: !prev[roomKey] }));
  };

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (activeFY !== 'all') {
        const matchesPackage = pkg.projectedFiscalYear === activeFY;
        const matchesAnyItem = pkg.items.some((it) => it.replacementFiscalYear === activeFY);
        if (!matchesPackage && !matchesAnyItem) return false;
      }
      if (selectedBuilding !== 'all' && pkg.building !== selectedBuilding) return false;
      return true;
    });
  }, [packages, activeFY, selectedBuilding]);

  // Aggregate metrics
  const totalBundledCapEx = useMemo(
    () => filteredPackages.reduce((acc, p) => acc + p.totalPackageCost, 0),
    [filteredPackages]
  );
  const totalTurnkeyOverhaulCapEx = useMemo(
    () => filteredPackages.reduce((acc, p) => acc + p.projectedOverhaulCost, 0),
    [filteredPackages]
  );
  const avgTurnkeyCostPerRoom = filteredPackages.length > 0 ? Math.round(totalTurnkeyOverhaulCapEx / filteredPackages.length) : 0;
  const avgFleetReadinessScore = filteredPackages.length > 0 ? Math.round(filteredPackages.reduce((acc, p) => acc + p.readinessScore, 0) / filteredPackages.length) : 100;
  const prematureSwapCount = useMemo(
    () => filteredPackages.reduce((acc, p) => acc + p.prematureSwaps.length, 0),
    [filteredPackages]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner explaining Bundled Room Packages */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900">
                Classroom Bundled Overhaul Packages (Turnkey Retrofits)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Whole-room integrated systems upgraded during summer or winter recess. Reflects full turnkey project costs with compounding 5% inflation and room readiness health tracking.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={activeFY}
              onChange={(e) => handleFYChange(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-semibold"
            >
              <option value="all">All Overhaul Years</option>
              {fiscalYears.map((fy) => (
                <option key={fy} value={fy}>
                  Overhaul {fy}
                </option>
              ))}
            </select>

            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700"
            >
              <option value="all">All Buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <button
              onClick={() => exportClassroomPackages(filteredPackages, 'csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs transition-colors"
              title="Export classroom overhaul projects, composite readiness scores, and 5% compounding inflation forecast to CSV"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Packages (CSV)</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 font-mono tabular-nums">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500">
              Turnkey Overhaul CapEx (5% Inf.)
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              ${totalTurnkeyOverhaulCapEx.toLocaleString()}
            </div>
            <div className="text-xs font-sans text-slate-500 mt-1">
              Hardware BOM Only: <strong>${totalBundledCapEx.toLocaleString()}</strong> ({filteredPackages.length} rooms)
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500">
              Avg. Turnkey Overhaul Cost
            </span>
            <div className="text-2xl font-bold text-sky-700 mt-0.5">
              ${avgTurnkeyCostPerRoom.toLocaleString()}
            </div>
            <div className="text-xs font-sans text-slate-500 mt-1">
              Includes infrastructure, cabling, commissioning & inflation
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500">
              Fleet Agedness & Readiness
            </span>
            <div className="text-2xl font-bold text-emerald-800 mt-0.5">
              {avgFleetReadinessScore}% <span className="text-xs font-sans text-slate-500 font-normal">Score</span>
            </div>
            <div className="text-xs font-sans text-amber-700 mt-1">
              {prematureSwapCount} interim swaps needed ahead of overhaul
            </div>
          </div>
        </div>
      </div>

      {/* Classroom Package Cards Grid */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-lg text-xs">
            No classroom packages matching the selected filters.
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const roomKey = `${pkg.building}::${pkg.roomName}`;
            const isExpanded = !!expandedRooms[roomKey];
            const hasEarlySwaps = pkg.prematureSwaps.length > 0;

            return (
              <div
                key={roomKey}
                className={`bg-white border rounded-lg overflow-hidden transition-all ${
                  pkg.hasCriticalFailure
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : hasEarlySwaps
                    ? 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Package Main Row */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{pkg.roomDisplayName || pkg.roomName}</h3>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{pkg.building}</span>
                      {pkg.spaceType && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                            {pkg.spaceType}
                          </span>
                        </>
                      )}
                      {pkg.vendor && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-[11px] text-slate-500">
                            Vendor: <strong className="text-slate-700">{pkg.vendor}</strong>
                          </span>
                        </>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-mono">
                        Target: {pkg.projectedFiscalYear} ({pkg.targetSeason})
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span>Integrated Package:</span>
                      <strong className="text-slate-800">{pkg.primaryEquipmentSummary}</strong>
                    </div>

                    {/* Room Equipment Agedness & Readiness Composite Index */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold ${
                          pkg.readinessRating === 'Optimal'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : pkg.readinessRating === 'Good'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : pkg.readinessRating === 'Fair'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                        title="Room Readiness Score: Weighted equipment health based on component age vs. shelf life, accounting for recent swaps like projectors"
                      >
                        <span className="font-mono text-xs font-bold">{pkg.readinessScore}%</span>
                        <span>{pkg.readinessRating} Readiness</span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>Avg Age: <strong className="text-slate-700">{pkg.averageComponentAgeYears} yrs</strong></span>
                        <span className="text-slate-300">·</span>
                        <span title="Age of most recently swapped device (e.g. projector replacement)">
                          Newest: <strong className="text-slate-700">{pkg.newestComponentAgeYears} yrs</strong>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span title="Age of oldest anchor equipment (e.g. core switcher/audio DSP)">
                          Oldest: <strong className="text-slate-700">{pkg.oldestComponentAgeYears} yrs</strong>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>
                          Last Renovated: <strong className="text-slate-700">{pkg.lastRenovationYear}</strong> (${pkg.lastRenovationCost.toLocaleString()})
                        </span>
                      </div>
                    </div>

                    {/* Premature Swap Alert Bar */}
                    {hasEarlySwaps && (
                      <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Early Component Swap Alert: </strong>
                          {pkg.prematureSwaps.map((sw) => sw.makeModel).join(', ')} failed ahead of the planned {pkg.projectedFiscalYear} master overhaul.
                        </div>
                      </div>
                    )}

                    {pkg.hasCriticalFailure && (
                      <div className="mt-1 text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Classroom Offline: Out-of-service hardware requires priority attention.</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Rollup & Expand Toggle */}
                  <div className="flex items-center gap-6 self-end lg:self-center">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-[10px] uppercase font-sans font-semibold text-emerald-800">
                        {pkg.projectedFiscalYear} Turnkey Overhaul (5% Inf.)
                      </div>
                      <div className="text-xl font-bold text-slate-900 flex items-center justify-end gap-1.5">
                        <span>${pkg.projectedOverhaulCost.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        Base: ${pkg.lastRenovationCost.toLocaleString()} + <span className="text-teal-700 font-mono font-medium">+${pkg.inflationDeltaCost.toLocaleString()} ({(pkg.inflationRate * 100).toFixed(0)}% inf)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Hardware BOM sum: ${pkg.totalPackageCost.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoom(pkg);
                          setEditCost(pkg.lastRenovationCost);
                          setEditYear(pkg.lastRenovationYear);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded flex items-center gap-1 transition-colors"
                        title="Enter or update the total installation cost for this room"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Room Cost</span>
                      </button>

                      <button
                        onClick={() => toggleExpand(roomKey)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Items' : `View ${pkg.itemCount} Items`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Itemized Hardware List */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                    <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Bundled Components in this Classroom:
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs bg-white rounded border border-slate-200">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 text-[10px] font-semibold uppercase">
                            <th className="py-2 px-3">Equipment</th>
                            <th className="py-2 px-3">Category</th>
                            <th className="py-2 px-3">Install Date</th>
                            <th className="py-2 px-3">Component Lifespan</th>
                            <th className="py-2 px-3">Condition & Health</th>
                            <th className="py-2 px-3 text-right">Replacement Cost</th>
                            <th className="py-2 px-3">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {pkg.items.map((item) => {
                            const isEarlySwap = pkg.prematureSwaps.some((sw) => sw.id === item.id);

                            return (
                              <tr key={item.id} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-sans text-slate-900 font-medium">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{item.makeModel}</span>
                                    {activeFY !== 'all' && item.replacementFiscalYear === activeFY && (
                                      <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-300">
                                        Scheduled {activeFY}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">{item.serialNumber}</div>
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-600">{item.category}</td>
                                <td className="py-2 px-3 text-slate-700">{item.installDate}</td>
                                <td className="py-2 px-3 text-slate-700">
                                  {item.ageYears} yrs / {item.shelflifeYears} yrs
                                </td>
                                <td className="py-2 px-3 font-sans">
                                  {isEarlySwap ? (
                                    <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">
                                      ⚠️ Early Swap Needed
                                    </span>
                                  ) : (
                                    <span className="text-slate-700">{item.maintenanceStatus} ({item.condition})</span>
                                  )}
                                  {item.activeIssue && item.activeIssue !== 'None' && (
                                    <div className="text-[10px] text-amber-700 mt-0.5 truncate max-w-xs">
                                      {item.activeIssue}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                  ${item.totalReplacementCost.toLocaleString()}
                                </td>
                                <td className="py-2 px-3 font-sans">
                                  <button
                                    onClick={() => onSelectItem(item)}
                                    className="text-sky-600 hover:text-sky-800 underline text-xs font-medium"
                                  >
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Room Total Installation Cost Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
                  {editingRoom.building} · {editingRoom.spaceType || 'General Classroom'}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {editingRoom.roomDisplayName || editingRoom.roomName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Room Total Installation / Renovation Cost ($)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Enter the turnkey project cost to fully renovate this classroom (infrastructure, hardware, cabling, commissioning).
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Quick Benchmark Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setEditCost(35000)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    General Classroom ($35k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCost(55000)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Lab / Active ($55k)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditCost(90000)}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Lecture Hall ($90k)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Year Room Was Installed / Last Fully Renovated
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2040"
                  value={editYear}
                  onChange={(e) => setEditYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 font-mono text-sm bg-white border border-slate-300 rounded focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Compounding Inflation Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Scheduled Overhaul FY:</span>
                  <strong className="text-slate-800">{editingRoom.projectedFiscalYear}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Inflation Timeline:</span>
                  <span>
                    {Math.max(0, parseInt(editingRoom.projectedFiscalYear.replace('FY', ''), 10) - editYear)} years @ 5%/yr
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Inflation Allowance:</span>
                  <span className="text-teal-700 font-bold">
                    +${Math.max(0, Math.round(editCost * Math.pow(1.05, Math.max(0, parseInt(editingRoom.projectedFiscalYear.replace('FY', ''), 10) - editYear)) - editCost)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-900 border-t border-slate-200 pt-1 font-bold text-sm">
                  <span>Projected Turnkey Overhaul:</span>
                  <span className="text-sky-700">
                    ${Math.round(editCost * Math.pow(1.05, Math.max(0, parseInt(editingRoom.projectedFiscalYear.replace('FY', ''), 10) - editYear))).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateRoomCost && editingRoom) {
                    onUpdateRoomCost(editingRoom.building, editingRoom.roomName, editCost, editYear);
                  }
                  setEditingRoom(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Room Cost</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
