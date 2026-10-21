import React, { useState, useMemo } from 'react';
import { ClassroomPackage } from '../types/inventory';
import { getRoomReadinessExplanation } from '../utils/calculations';
import { generateRoomReadinessPDF } from '../utils/pdfGenerator';
import { exportRoomReadinessReport } from '../utils/spreadsheet';
import {
  FileText,
  FileDown,
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Layers,
  Info,
  TrendingUp,
} from 'lucide-react';

interface RoomReadinessReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: ClassroomPackage[];
}

export const RoomReadinessReportModal: React.FC<RoomReadinessReportModalProps> = ({
  isOpen,
  onClose,
  packages,
}) => {
  if (!isOpen) return null;

  const [collegeName, setCollegeName] = useState('Central State College');
  const [departmentName, setDepartmentName] = useState('Classroom AV & Instructional Media');
  const [levelFilter, setLevelFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Available buildings
  const buildings = useMemo(() => {
    const bSet = new Set(packages.map((p) => p.building));
    return Array.from(bSet).sort();
  }, [packages]);

  // Readiness distribution stats
  const stats = useMemo(() => {
    let green = 0;
    let yellow = 0;
    let red = 0;
    let totalScore = 0;

    packages.forEach((pkg) => {
      totalScore += pkg.readinessScore;
      if (pkg.readinessScore >= 60) green++;
      else if (pkg.readinessScore >= 40) yellow++;
      else red++;
    });

    const total = packages.length;
    const avgScore = total > 0 ? Math.round(totalScore / total) : 0;

    return {
      total,
      avgScore,
      green,
      yellow,
      red,
      greenPct: total > 0 ? Math.round((green / total) * 100) : 0,
      yellowPct: total > 0 ? Math.round((yellow / total) * 100) : 0,
      redPct: total > 0 ? Math.round((red / total) * 100) : 0,
    };
  }, [packages]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const exp = getRoomReadinessExplanation(pkg);

      if (levelFilter !== 'all' && exp.level !== levelFilter) {
        return false;
      }
      if (selectedBuilding !== 'all' && pkg.building !== selectedBuilding) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = pkg.roomDisplayName.toLowerCase().includes(q) || pkg.roomName.toLowerCase().includes(q);
        const matchesBuilding = pkg.building.toLowerCase().includes(q);
        const matchesEquip = pkg.primaryEquipmentSummary.toLowerCase().includes(q);
        const matchesExp = exp.summary.toLowerCase().includes(q);
        if (!matchesName && !matchesBuilding && !matchesEquip && !matchesExp) {
          return false;
        }
      }
      return true;
    });
  }, [packages, levelFilter, selectedBuilding, searchQuery]);

  const handleDownloadPDF = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      generateRoomReadinessPDF({
        collegeName,
        departmentName,
        packages,
        filterLevel: levelFilter,
        filterBuilding: selectedBuilding,
      });
      setIsExportingPDF(false);
    }, 200);
  };

  const handleExportCSV = () => {
    exportRoomReadinessReport(filteredPackages, 'csv');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-5xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Room Readiness Report & Health Audit
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white tracking-wide uppercase">
                  Red-Yellow-Green Coded
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Instructional spaces audit with composite readiness scores (0–100) and factor-by-factor explanations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-2xs"
              title="Print formatted audit report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 shadow-2xs"
              title="Export report data as CSV spreadsheet"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV Export</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded shadow-xs transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customization & Privacy Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Campus:</span>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-slate-900 text-xs w-48 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Department:</span>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-0.5 text-slate-900 text-xs w-56 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>100% In-Browser Computation · Zero Data Shared</span>
          </div>
        </div>

        {/* Color-Coded Distribution KPI Banner */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Average Readiness */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Fleet Average Readiness
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {stats.avgScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {stats.total} classrooms evaluated
            </div>
          </div>

          {/* Green Rooms */}
          <div
            onClick={() => setLevelFilter(levelFilter === 'green' ? 'all' : 'green')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              levelFilter === 'green'
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400 shadow-xs'
                : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Green · Optimal / Good
              </span>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                ≥60 pts
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
              {stats.green} <span className="text-xs font-normal text-emerald-700">Rooms</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              {stats.greenPct}% of campus fleet
            </div>
          </div>

          {/* Yellow Rooms */}
          <div
            onClick={() => setLevelFilter(levelFilter === 'yellow' ? 'all' : 'yellow')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              levelFilter === 'yellow'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400 shadow-xs'
                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Yellow · Fair / Monitor
              </span>
              <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.2 rounded font-mono">
                40–59 pts
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-amber-900 mt-1">
              {stats.yellow} <span className="text-xs font-normal text-amber-700">Rooms</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              {stats.yellowPct}% of campus fleet
            </div>
          </div>

          {/* Red Rooms */}
          <div
            onClick={() => setLevelFilter(levelFilter === 'red' ? 'all' : 'red')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              levelFilter === 'red'
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400 shadow-xs'
                : 'bg-rose-50/60 border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Red · Critical / Overdue
              </span>
              <span className="text-[10px] font-bold bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded font-mono">
                &lt;40 pts
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-rose-900 mt-1">
              {stats.red} <span className="text-xs font-normal text-rose-700">Rooms</span>
            </div>
            <div className="text-[11px] text-rose-700 mt-0.5">
              {stats.redPct}% urgent action
            </div>
          </div>
        </div>

        {/* Methodology & Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Level Filter Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-semibold mr-1">Filter:</span>
            <button
              onClick={() => setLevelFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                levelFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({packages.length})
            </button>
            <button
              onClick={() => setLevelFilter('green')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                levelFilter === 'green'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Green ({stats.green})
            </button>
            <button
              onClick={() => setLevelFilter('yellow')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                levelFilter === 'yellow'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Yellow ({stats.yellow})
            </button>
            <button
              onClick={() => setLevelFilter('red')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors flex items-center gap-1 ${
                levelFilter === 'red'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Red ({stats.red})
            </button>
          </div>

          {/* Building Selector & Search */}
          <div className="flex items-center gap-2">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Buildings ({buildings.length})</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search room or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-2.5 py-1 border border-slate-300 rounded bg-slate-50 text-slate-800 placeholder-slate-400 w-44 focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Scoring Methodology Callout Box */}
        <div className="mx-6 mt-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900">
                How Room Readiness Scores are Calculated:
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Each room's <strong>Readiness Score (0–100)</strong> is an objective composite index determined by:
                <strong> (1) Shelf-Life Lifecycles</strong> (base score derived from remaining academic lifespan against each component's recommended refresh cycle);
                <strong> (2) Maintenance Health Penalties</strong> (automatic deductions: -90 pts / score capped at 10% for Out-of-Service/Critical units, -30 pts for active repair tickets, -20 pts for Poor condition); and
                <strong> (3) Replacement Cost Weighting</strong> (scores weighted by replacement cost so display, matrix switcher, and audio processors proportionally guide overall room health).
              </p>
            </div>
          </div>
        </div>

        {/* Room List Content (Color-Coded Cards) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
          {filteredPackages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">No rooms match the current filter criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the level filter or clearing your search query.</p>
              <button
                onClick={() => {
                  setLevelFilter('all');
                  setSelectedBuilding('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-3 py-1 bg-white border border-slate-300 text-xs font-semibold rounded text-slate-700 hover:bg-slate-50"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredPackages.map((pkg) => {
              const exp = getRoomReadinessExplanation(pkg);

              // Styling per level
              const isRed = exp.level === 'red';
              const isYellow = exp.level === 'yellow';
              const isGreen = exp.level === 'green';

              return (
                <div
                  key={`${pkg.building}-${pkg.roomName}`}
                  className={`rounded-lg border p-4 transition-all shadow-2xs ${
                    isRed
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200'
                      : isYellow
                      ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200'
                      : 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                  }`}
                >
                  {/* Top Bar: Room Name, Building & Readiness Level Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 mb-2.5 border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          isRed
                            ? 'bg-rose-600 ring-2 ring-rose-200 animate-pulse'
                            : isYellow
                            ? 'bg-amber-500 ring-2 ring-amber-200'
                            : 'bg-emerald-600 ring-2 ring-emerald-200'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">
                            {pkg.building} — Room {pkg.roomDisplayName}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            {pkg.spaceType || 'General Classroom'}
                          </span>
                          {pkg.vendor && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Vendor: {pkg.vendor}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Color-Coded Score Badge & Campus Usage Tag */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {pkg.usageRank && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                            pkg.usageTier === 'High Usage'
                              ? 'bg-purple-600 text-white border-purple-700'
                              : pkg.usageTier === 'Moderate Usage'
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-slate-700 text-white border-slate-800'
                          }`}
                          title={`Campus Traffic Rank #${pkg.usageRank} of ${pkg.totalRankedRooms || '?'} · ${pkg.usageHours ? pkg.usageHours + ' hrs/wk' : ''} ${pkg.utilizationRate ? '(' + pkg.utilizationRate + '% util)' : ''} · Urgency Score: ${pkg.urgencyScore || 0}/100`}
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>#{pkg.usageRank} Use</span>
                          <span>·</span>
                          <span>{pkg.urgencyRating}</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                          isRed
                            ? 'bg-rose-600 text-white border-rose-700'
                            : isYellow
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-emerald-600 text-white border-emerald-700'
                        }`}
                      >
                        <span className="font-mono text-sm">{exp.score} / 100</span>
                        <span>·</span>
                        <span className="uppercase tracking-wider text-[11px]">{exp.levelLabel}</span>
                      </span>
                    </div>
                  </div>

                  {/* Room Metadata & Hardware Breakdown Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3 bg-white/80 p-2.5 rounded border border-slate-200/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fleet Value</span>
                      <span className="font-mono font-bold text-slate-800">
                        ${pkg.totalPackageCost.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{pkg.itemCount} devices</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Average Age</span>
                      <span className="font-mono font-bold text-slate-800">
                        {pkg.averageComponentAgeYears} yrs
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Oldest: {pkg.oldestComponentAgeYears}y · Newest: {pkg.newestComponentAgeYears}y
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Overhaul Cycle</span>
                      <span className="font-mono font-bold text-slate-800">
                        {pkg.shelflifeYears} Years
                      </span>
                      <span className="text-[10px] text-slate-500 block">Target: {pkg.projectedFiscalYear}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Maintenance State</span>
                      <span
                        className={`font-semibold block ${
                          pkg.hasCriticalFailure
                            ? 'text-rose-700 font-bold'
                            : pkg.activeIssues.length > 0
                            ? 'text-amber-700 font-bold'
                            : 'text-emerald-700'
                        }`}
                      >
                        {pkg.hasCriticalFailure
                          ? 'Critical Fault'
                          : pkg.activeIssues.length > 0
                          ? `${pkg.activeIssues.length} Active Issue`
                          : '100% Operational'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{pkg.overallCondition} condition</span>
                    </div>
                  </div>

                  {/* Primary Equipment Line */}
                  <div className="text-xs text-slate-600 mb-2.5 flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                      Installed Hardware:
                    </span>
                    <span className="font-medium text-slate-800">{pkg.primaryEquipmentSummary}</span>
                  </div>

                  {/* Score Explanation & Basis Section (CRITICAL USER REQUIREMENT) */}
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      isRed
                        ? 'bg-rose-100/70 border-rose-300 text-rose-950'
                        : isYellow
                        ? 'bg-amber-100/70 border-amber-300 text-amber-950'
                        : 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Score Explanation & Evaluation Factors:</span>
                    </div>
                    <p className="text-xs font-semibold leading-relaxed">
                      {exp.summary}
                    </p>
                    <div className="pt-1 border-t border-black/10 text-[11px] text-slate-700 space-y-0.5">
                      <div>
                        <strong>• Lifespan & Depreciation:</strong> {exp.lifecycleFactor}
                      </div>
                      <div>
                        <strong>• Maintenance & Health Flags:</strong> {exp.maintenanceFactor}
                      </div>
                      <div>
                        <strong>• Cost Weighting:</strong> {exp.weightingFactor}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Tag */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">Recommended Action:</span>
                      <span className="text-slate-800 font-medium">{exp.actionRecommendation}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {pkg.building}-{pkg.roomName}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{filteredPackages.length}</strong> of{' '}
            <strong className="text-slate-800">{packages.length}</strong> classroom packages
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors"
            >
              Export CSV Spreadsheet
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF Room Readiness Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
