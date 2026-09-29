import React, { useState } from 'react';
import { AVItem, MaintenanceStatus } from '../types/inventory';
import { Wrench, AlertCircle, CheckCircle2, Clock, ShieldAlert, ArrowRight } from 'lucide-react';

interface MaintenanceIssuesPanelProps {
  items: AVItem[];
  onUpdateItem: (updated: AVItem) => void;
  onSelectItem: (item: AVItem) => void;
}

export const MaintenanceIssuesPanel: React.FC<MaintenanceIssuesPanelProps> = ({
  items,
  onUpdateItem,
  onSelectItem,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const issueItems = items.filter((it) => {
    const hasActiveIssue =
      it.activeIssue &&
      it.activeIssue !== 'None' &&
      it.activeIssue.toLowerCase() !== 'none' &&
      it.activeIssue.toLowerCase() !== 'na' &&
      it.activeIssue.toLowerCase() !== 'n/a' &&
      it.activeIssue.toLowerCase() !== 'no' &&
      it.activeIssue.trim() !== '';
    const isProblemStatus = it.maintenanceStatus && it.maintenanceStatus !== 'Operational';
    return Boolean(hasActiveIssue || isProblemStatus);
  });

  const filteredIssues = issueItems.filter((it) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'critical') return it.maintenanceStatus === 'Out of Service' || it.issueSeverity === 'Critical';
    if (filterSeverity === 'high') return it.issueSeverity === 'High';
    if (filterSeverity === 'scheduled') return it.maintenanceStatus === 'Scheduled Repair';
    return true;
  });

  const handleQuickStatusChange = (item: AVItem, newStatus: MaintenanceStatus) => {
    const updated: AVItem = {
      ...item,
      maintenanceStatus: newStatus,
      lastMaintenanceDate: new Date().toISOString().split('T')[0],
      activeIssue: newStatus === 'Operational' ? 'None' : item.activeIssue,
    };
    onUpdateItem(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">
                Classroom AV Maintenance & Service Tickets
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active hardware malfunctions, thermal sensor alerts, network disconnects, and scheduled repairs across campus classrooms.
            </p>
          </div>

          {/* Filter Pills / Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-3 py-1.5 font-medium rounded transition-colors ${
                filterSeverity === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Active ({issueItems.length})
            </button>
            <button
              onClick={() => setFilterSeverity('critical')}
              className={`px-3 py-1.5 font-medium rounded transition-colors ${
                filterSeverity === 'critical'
                  ? 'bg-white text-rose-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Offline / Critical
            </button>
            <button
              onClick={() => setFilterSeverity('high')}
              className={`px-3 py-1.5 font-medium rounded transition-colors ${
                filterSeverity === 'high'
                  ? 'bg-white text-amber-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              High Severity
            </button>
            <button
              onClick={() => setFilterSeverity('scheduled')}
              className={`px-3 py-1.5 font-medium rounded transition-colors ${
                filterSeverity === 'scheduled'
                  ? 'bg-white text-sky-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Scheduled Repair
            </button>
          </div>
        </div>

        {/* Tickets Grid */}
        <div className="mt-5 space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              {issueItems.length === 0 ? (
                <>
                  <div className="font-bold text-slate-800 text-sm mb-1">All Fleet Hardware Operational</div>
                  <p className="max-w-md mx-auto text-slate-500">
                    No active maintenance issues or service tickets found in this uploaded dataset. All {items.length} tracked items are in operational status.
                  </p>
                </>
              ) : (
                'No active maintenance tickets matching the selected filter.'
              )}
            </div>
          ) : (
            filteredIssues.map((item) => {
              const isOffline = item.maintenanceStatus === 'Out of Service';
              const isHigh = item.issueSeverity === 'High' || item.issueSeverity === 'Critical';

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isOffline
                      ? 'bg-rose-50/40 border-rose-200'
                      : isHigh
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{item.room}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{item.building}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-xs font-medium text-slate-700">{item.category}</span>
                      </div>

                      <div className="text-xs font-semibold text-slate-800">
                        {item.makeModel}
                        <span className="font-mono text-slate-400 font-normal ml-2">({item.serialNumber})</span>
                      </div>

                      <div className="mt-2 text-xs text-slate-700 flex items-start gap-1.5">
                        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isOffline ? 'text-rose-600' : 'text-amber-600'}`} />
                        <span className="font-medium">{item.activeIssue || 'Hardware fault reported.'}</span>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                        <span>Technician: <strong className="text-slate-700">{item.assignedTech || 'Unassigned'}</strong></span>
                        <span>·</span>
                        <span>Last Service: <strong className="text-slate-700">{item.lastMaintenanceDate || 'N/A'}</strong></span>
                        <span>·</span>
                        <span>Replacement Estimate: <strong className="font-mono text-slate-700">${item.totalReplacementCost.toLocaleString()}</strong></span>
                      </div>
                    </div>

                    {/* Quick Status Action Dropdown */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <select
                        value={item.maintenanceStatus}
                        onChange={(e) => handleQuickStatusChange(item, e.target.value as MaintenanceStatus)}
                        className="text-xs font-medium bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="Operational">Mark Resolved (Operational)</option>
                        <option value="Scheduled Repair">Scheduled Repair</option>
                        <option value="Requires Service">Requires Service</option>
                        <option value="Out of Service">Out of Service (Offline)</option>
                      </select>

                      <button
                        onClick={() => onSelectItem(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50"
                        title="View Full Item Details"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
