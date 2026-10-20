import React, { useState, useRef } from 'react';
import { PlanningScenario } from '../types/inventory';
import { exportScenarioJSON, importScenarioJSON } from '../utils/spreadsheet';
import {
  GitBranch,
  Plus,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  DollarSign,
  Sparkles,
  Lock,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface ScenarioToolbarProps {
  scenarios: PlanningScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onCreateScenario: (name: string, description: string, cloneFromActive: boolean) => void;
  onUpdateCeiling: (newCeiling: number) => void;
  onResetOverrides: () => void;
  onImportScenario: (scenario: PlanningScenario) => void;
  onOpenAutoLeveler: () => void;
  overCeilingYearsCount: number;
}

export const ScenarioToolbar: React.FC<ScenarioToolbarProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  onUpdateCeiling,
  onResetOverrides,
  onImportScenario,
  onOpenAutoLeveler,
  overCeilingYearsCount,
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCeilingEditOpen, setIsCeilingEditOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [cloneCurrent, setCloneCurrent] = useState(true);
  const [tempCeiling, setTempCeiling] = useState(activeScenario.annualBudgetCeiling);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const overrideCount =
    Object.keys(activeScenario.roomOverrides || {}).length +
    Object.keys(activeScenario.itemOverrides || {}).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    onCreateScenario(newBranchName.trim(), newBranchDesc.trim(), cloneCurrent);
    setIsNewModalOpen(false);
    setNewBranchName('');
    setNewBranchDesc('');
  };

  const handleCeilingSave = () => {
    onUpdateCeiling(Math.max(10000, Number(tempCeiling) || 250000));
    setIsCeilingEditOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = importScenarioJSON(content);
        onImportScenario(imported);
      } catch (err: any) {
        alert(err.message || 'Error parsing scenario JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-2.5 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Scenario Switcher Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider text-[11px] mr-1">
            <GitBranch className="w-3.5 h-3.5 text-sky-600" />
            <span>Scenario:</span>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {scenarios.map((sc) => {
              const isActive = sc.id === activeScenarioId;
              return (
                <button
                  key={sc.id}
                  onClick={() => onSelectScenario(sc.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  title={sc.description}
                >
                  {sc.isBaseline ? <Lock className="w-3 h-3 text-slate-400" /> : null}
                  <span>{sc.name}</span>
                  {!sc.isBaseline && (
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                        isActive
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {Object.keys(sc.roomOverrides || {}).length + Object.keys(sc.itemOverrides || {}).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setNewBranchName(`Scenario Branch ${scenarios.length}`);
              setIsNewModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 font-medium transition-colors"
            title="Create a new planning branch"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>New Branch</span>
          </button>
        </div>

        {/* Right: Budget Ceiling & Scenario Leveling Tools */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Annual Ceiling Badge & Quick Edit */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Annual Cap:</span>
            {isCeilingEditOpen ? (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  step="10000"
                  min="25000"
                  max="2000000"
                  value={tempCeiling}
                  onChange={(e) => setTempCeiling(Number(e.target.value))}
                  className="w-24 px-1.5 py-0.5 border border-sky-400 rounded text-xs font-mono bg-white"
                />
                <button
                  onClick={handleCeilingSave}
                  className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempCeiling(activeScenario.annualBudgetCeiling);
                  setIsCeilingEditOpen(true);
                }}
                className="font-bold text-slate-900 font-mono hover:text-sky-600 underline cursor-pointer ml-0.5"
                title="Click to adjust annual budget ceiling"
              >
                ${(activeScenario.annualBudgetCeiling / 1000).toFixed(0)}k/yr
              </button>
            )}
          </div>

          {/* Over-Ceiling Warning Badge */}
          {overCeilingYearsCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{overCeilingYearsCount} FY{overCeilingYearsCount > 1 ? 's' : ''} over cap</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Budget Level</span>
            </div>
          )}

          {/* 1-Click Auto Leveler Action */}
          <button
            onClick={onOpenAutoLeveler}
            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md shadow-2xs transition-colors"
            title="Auto-level budget by deferring high-readiness rooms"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Auto-Level</span>
          </button>

          {/* Portable Scenario JSON Export & Import */}
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white">
            <button
              onClick={() => exportScenarioJSON(activeScenario)}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1"
              title="Download active scenario as a portable JSON file"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Save JSON</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-200" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1"
              title="Import scenario from a saved JSON file"
            >
              <Upload className="w-3 h-3 text-slate-500" />
              <span>Load JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Reset Overrides Button (Only if active scenario is not baseline) */}
          {!activeScenario.isBaseline && overrideCount > 0 && (
            <button
              onClick={onResetOverrides}
              className="text-slate-500 hover:text-rose-600 px-1.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors"
              title="Revert scenario overrides back to mechanical baseline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* New Branch Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <GitBranch className="w-5 h-5 text-sky-600" />
              <h3 className="text-base font-bold">Create New Planning Scenario</h3>
            </div>
            <p className="text-xs text-slate-500">
              Create an isolated planning branch to model alternative budget ceilings, target replacement years, or deferral triage without altering the master inventory.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. FY27 Accelerated Refresh, Triage Option B"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={newBranchDesc}
                  onChange={(e) => setNewBranchDesc(e.target.value)}
                  placeholder="What hypotheses or constraints are being modeled in this scenario?"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="clone-current"
                  checked={cloneCurrent}
                  onChange={(e) => setCloneCurrent(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="clone-current" className="text-slate-700">
                  Inherit overrides from current scenario (<strong>{activeScenario.name}</strong>)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-sky-600 text-white font-bold hover:bg-sky-500 shadow-xs"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
