import React, { useState } from 'react';
import { Calendar, CheckSquare, X, RotateCcw, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

interface BatchActionToolbarProps {
  selectedCount: number;
  selectedTotalCost: number;
  onClearSelection: () => void;
  onBatchAssignFY: (targetFY: string) => void;
  onBatchAssignPriority: (priority: 'Critical' | 'Standard' | 'Elective') => void;
  onBatchResetBaseline: () => void;
}

export const BatchActionToolbar: React.FC<BatchActionToolbarProps> = ({
  selectedCount,
  selectedTotalCost,
  onClearSelection,
  onBatchAssignFY,
  onBatchAssignPriority,
  onBatchResetBaseline,
}) => {
  const [targetFY, setTargetFY] = useState('FY2027');
  const [priority, setPriority] = useState<'Critical' | 'Standard' | 'Elective'>('Standard');

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-full px-4 animate-slideUp">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Selection Count & Total CapEx */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/30">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{selectedCount} Asset{selectedCount > 1 ? 's' : ''} Selected</span>
              <span className="text-slate-400 font-normal">·</span>
              <span className="font-mono text-emerald-400 font-bold">
                ${selectedTotalCost.toLocaleString()}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Bulk planning overrides applied to active scenario
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Target FY selector */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
            <span className="text-[10px] text-slate-400 font-semibold px-1.5">Target FY:</span>
            <select
              value={targetFY}
              onChange={(e) => setTargetFY(e.target.value)}
              className="bg-slate-900 text-white text-xs font-mono font-bold rounded px-2 py-1 border border-slate-600 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            >
              <option value="FY2026">FY2026</option>
              <option value="FY2027">FY2027</option>
              <option value="FY2028">FY2028</option>
              <option value="FY2029">FY2029</option>
              <option value="FY2030">FY2030</option>
              <option value="FY2031">FY2031</option>
            </select>
            <button
              onClick={() => onBatchAssignFY(targetFY)}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-xs transition-colors flex items-center gap-1"
              title="Assign selected items to target fiscal year"
            >
              <span>Assign</span>
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={onBatchResetBaseline}
            className="px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
            title="Reset selected assets back to raw mechanical baseline"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Clear button */}
          <button
            onClick={onClearSelection}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
