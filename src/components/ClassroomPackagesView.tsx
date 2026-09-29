import React, { useState, useMemo } from 'react';
import { ClassroomPackage, AVItem } from '../types/inventory';
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
} from 'lucide-react';

interface ClassroomPackagesViewProps {
  packages: ClassroomPackage[];
  onSelectItem: (item: AVItem) => void;
  onOpenReportModal: () => void;
}

export const ClassroomPackagesView: React.FC<ClassroomPackagesViewProps> = ({
  packages,
  onSelectItem,
  onOpenReportModal,
}) => {
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [selectedFY, setSelectedFY] = useState<string>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');

  const buildings = useMemo(() => Array.from(new Set(packages.map((p) => p.building))).sort(), [packages]);
  const fiscalYears = useMemo(() => Array.from(new Set(packages.map((p) => p.projectedFiscalYear))).sort(), [packages]);

  const toggleExpand = (roomKey: string) => {
    setExpandedRooms((prev) => ({ ...prev, [roomKey]: !prev[roomKey] }));
  };

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (selectedFY !== 'all' && pkg.projectedFiscalYear !== selectedFY) return false;
      if (selectedBuilding !== 'all' && pkg.building !== selectedBuilding) return false;
      return true;
    });
  }, [packages, selectedFY, selectedBuilding]);

  // Aggregate metrics
  const totalBundledCapEx = useMemo(
    () => filteredPackages.reduce((acc, p) => acc + p.totalPackageCost, 0),
    [filteredPackages]
  );
  const avgCostPerRoom = filteredPackages.length > 0 ? Math.round(totalBundledCapEx / filteredPackages.length) : 0;
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
                Classroom Bundled Overhaul Packages (Whole-Room Retrofits)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Classrooms are upgraded as integrated system packages during summer or winter recess. Review total per-room project CapEx alongside early component swap alerts.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
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
          </div>
        </div>

        {/* 3 Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 font-mono tabular-nums">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500">
              Classroom Retrofit Packages
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {filteredPackages.length} <span className="text-xs font-sans text-slate-500 font-normal">Rooms</span>
            </div>
            <div className="text-xs font-sans text-slate-500 mt-1">
              Total Package CapEx: <strong>${totalBundledCapEx.toLocaleString()}</strong>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <span className="text-[10px] uppercase font-sans font-semibold text-slate-500">
              Avg. Bundled Room Cost
            </span>
            <div className="text-2xl font-bold text-sky-700 mt-0.5">
              ${avgCostPerRoom.toLocaleString()}
            </div>
            <div className="text-xs font-sans text-slate-500 mt-1">
              Includes hardware, rack recabling & programming labor
            </div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-md p-4">
            <span className="text-[10px] uppercase font-sans font-semibold text-amber-800">
              Early Component Swaps Needed
            </span>
            <div className="text-2xl font-bold text-amber-900 mt-0.5">
              {prematureSwapCount} <span className="text-xs font-sans text-amber-700 font-normal">Components</span>
            </div>
            <div className="text-xs font-sans text-amber-700 mt-1">
              Failing parts ahead of planned master overhaul
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
                      <h3 className="text-base font-bold text-slate-900">{pkg.roomName}</h3>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{pkg.building}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-mono">
                        Target: {pkg.projectedFiscalYear} ({pkg.targetSeason})
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span>Integrated Package:</span>
                      <strong className="text-slate-800">{pkg.primaryEquipmentSummary}</strong>
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
                      <div className="text-[10px] uppercase font-sans font-semibold text-slate-400">
                        Total Bundled Retrofit
                      </div>
                      <div className="text-xl font-bold text-slate-900">
                        ${pkg.totalPackageCost.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        Hardware: ${pkg.totalHardwareCost.toLocaleString()} · Labor: ${pkg.totalLaborCost.toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(roomKey)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center gap-1 transition-colors"
                    >
                      <span>{isExpanded ? 'Hide Items' : `View ${pkg.itemCount} Items`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
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
                                  <div>{item.makeModel}</div>
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
    </div>
  );
};
