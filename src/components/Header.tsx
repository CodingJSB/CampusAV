import React from 'react';
import { ShieldCheck, FileSpreadsheet, FileDown, UploadCloud, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'bundled' | 'quarterly' | 'maintenance' | 'inventory' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'bundled' | 'quarterly' | 'maintenance' | 'inventory' | 'reports') => void;
  onOpenUploadModal: () => void;
  onOpenReportModal: () => void;
  onResetToSample: () => void;
  itemCount: number;
  roomCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenUploadModal,
  onOpenReportModal,
  onResetToSample,
  itemCount,
  roomCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Strict 3-Zone Contract: Brand — 4-5 Navigation Links — Actions */}
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
              Campus<span className="text-sky-600">AV</span>
            </span>
            <div className="hidden lg:flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              <span>100% Client-Side · Zero Server Transmission</span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overview & Lifecycle
            </button>
            <button
              onClick={() => setActiveTab('bundled')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'bundled'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Classroom Packages {roomCount ? `(${roomCount})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('quarterly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'quarterly'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Next Quarter Expenses
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'maintenance'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Maintenance Log
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Fleet Inventory ({itemCount})
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Budget Planning
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUploadModal}
              title="Upload new spreadsheet"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Upload Sheet</span>
            </button>

            <button
              onClick={onOpenReportModal}
              title="Generate PDF Budget Report"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-500 shadow-sm transition-colors whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
