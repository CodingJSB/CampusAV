import React, { useMemo } from 'react';
import { ClassroomPackage, PlanningScenario, RoomPlanningOverride } from '../types/inventory';
import { generateLevelingProposal, LevelingMove } from '../utils/calculations';
import {
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface AutoLevelerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomPackages: ClassroomPackage[];
  activeScenario: PlanningScenario;
  onApplyProposal: (proposedOverrides: Record<string, RoomPlanningOverride>) => void;
}

export const AutoLevelerModal: React.FC<AutoLevelerModalProps> = ({
  isOpen,
  onClose,
  classroomPackages,
  activeScenario,
  onApplyProposal,
}) => {
  if (!isOpen) return null;

  const ceiling = activeScenario.annualBudgetCeiling || 250000;

  // Run triage proposal
  const proposal = useMemo(() => {
    return generateLevelingProposal(classroomPackages, ceiling);
  }, [classroomPackages, ceiling]);

  // Compute spend before and after by year
  const spendComparison = useMemo(() => {
    const horizon = ['FY2026', 'FY2027', 'FY2028', 'FY2029', 'FY2030', 'FY2031'];
    const before: Record<string, number> = {};
    const after: Record<string, number> = {};

    horizon.forEach((fy) => {
      before[fy] = 0;
      after[fy] = 0;
    });

    classroomPackages.forEach((pkg) => {
      const fy = pkg.projectedFiscalYear || 'FY2026';
      if (before[fy] !== undefined) {
        before[fy] += pkg.projectedOverhaulCost;
      }
    });

    // Apply proposed moves to calculate after
    classroomPackages.forEach((pkg) => {
      const roomKey = `${pkg.building}::${pkg.roomName}`;
      const move = proposal.proposedMoves.find(
        (m) => m.building === pkg.building && m.room === pkg.roomName
      );
      const targetFY = move ? move.toFY : pkg.projectedFiscalYear || 'FY2026';
      if (after[targetFY] !== undefined) {
        after[targetFY] += pkg.projectedOverhaulCost;
      }
    });

    return horizon.map((fy) => ({
      fy,
      beforeCost: before[fy] || 0,
      afterCost: after[fy] || 0,
      beforeOver: (before[fy] || 0) > ceiling,
      afterOver: (after[fy] || 0) > ceiling,
    }));
  }, [classroomPackages, proposal, ceiling]);

  const handleApply = () => {
    onApplyProposal(proposal.proposedRoomOverrides);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-800 flex items-center justify-center text-indigo-200">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">1-Click Automated Budget Leveling & Capital Triage</h3>
                <span className="bg-indigo-700/80 text-indigo-100 text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  Intelligent Deferral
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Automatically smooths overdue backlog spikes beneath your ${ceiling.toLocaleString()}/year annual ceiling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white rounded-md hover:bg-indigo-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Algorithm Rationale Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-slate-700 space-y-1">
              <span className="font-semibold text-slate-900">How the triage engine prioritizes candidates:</span>
              <p className="text-slate-600">
                1. <strong>Protects Urgent Rooms:</strong> Classrooms with critical hardware failures, active maintenance disruption, or poor health (readiness &lt; 40) are locked into the earliest possible year.
              </p>
              <p className="text-slate-600">
                2. <strong>Defers Healthiest Assets First:</strong> Rooms with optimal readiness scores (60–100) and zero active issues are deferred into the earliest subsequent year with available budget headroom.
              </p>
              <p className="text-slate-600">
                3. <strong>Preserves Risk Integrity:</strong> Physical overdue state (Red indicator) is never falsely marked as Green; it remains visible as deferred.
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-lg p-3">
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Annual Budget Ceiling</span>
              <div className="text-lg font-bold font-mono text-indigo-950 mt-0.5">
                ${ceiling.toLocaleString()}
              </div>
              <span className="text-[11px] text-indigo-700">Per fiscal year</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Years Over Cap</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5 flex items-center gap-2">
                <span className="text-rose-600">{proposal.initialOverCeilingCount} yrs</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="text-emerald-700">{proposal.remainingOverCeilingCount} yrs</span>
              </div>
              <span className="text-[11px] text-slate-500">
                {proposal.initialOverCeilingCount - proposal.remainingOverCeilingCount} year spike{proposal.initialOverCeilingCount - proposal.remainingOverCeilingCount > 1 ? 's' : ''} resolved
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Proposed Deferrals</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {proposal.proposedMoves.length} Classrooms
              </div>
              <span className="text-[11px] text-slate-500">
                ${proposal.proposedMoves.reduce((acc, m) => acc + m.cost, 0).toLocaleString()} leveled
              </span>
            </div>
          </div>

          {/* Before vs After Spend Waterfall by Fiscal Year */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>Annual Spend Distribution: Before vs. Leveled</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {spendComparison.map((sc) => {
                const isImproved = sc.beforeOver && !sc.afterOver;
                return (
                  <div
                    key={sc.fy}
                    className={`p-2.5 rounded-lg border text-center font-mono ${
                      sc.afterOver
                        ? 'bg-rose-50/70 border-rose-300'
                        : isImproved
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">{sc.fy}</div>
                    <div className="text-[11px] text-slate-400 line-through mt-0.5">
                      ${(sc.beforeCost / 1000).toFixed(0)}k
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        sc.afterOver ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      ${(sc.afterCost / 1000).toFixed(0)}k
                    </div>
                    <div className="text-[10px] font-sans mt-1">
                      {sc.afterOver ? (
                        <span className="text-rose-700 font-bold">Over Cap</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">Within Cap</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proposed Moves Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center justify-between">
              <span>Proposed Deferral Actions ({proposal.proposedMoves.length})</span>
            </h4>

            {proposal.proposedMoves.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800">Your budget is already leveled!</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  No fiscal year spend exceeds the ${ceiling.toLocaleString()} annual cap.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2 px-3">Classroom</th>
                      <th className="py-2 px-3">Readiness</th>
                      <th className="py-2 px-3">Reassignment</th>
                      <th className="py-2 px-3 text-right">Project Cost</th>
                      <th className="py-2 px-3">Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposal.proposedMoves.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          <div className="font-bold">{m.room}</div>
                          <div className="text-[11px] text-slate-400">{m.building}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              m.readinessScore >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.readinessScore >= 60
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.readinessScore}/100
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500">{m.fromFY}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                              {m.toFY}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          ${m.cost.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {m.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-xs">
            Changes will be applied exclusively to active scenario branch <strong>{activeScenario.name}</strong>.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={proposal.proposedMoves.length === 0}
              onClick={handleApply}
              className={`px-4 py-2 text-xs font-bold text-white rounded shadow-xs flex items-center gap-1.5 transition-colors ${
                proposal.proposedMoves.length === 0
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Leveling to Scenario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
