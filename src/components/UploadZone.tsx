import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Settings2,
  ArrowRight,
  Eye,
} from 'lucide-react';
import {
  inspectSpreadsheet,
  processRowsWithMapping,
  downloadTemplateSpreadsheet,
  SpreadsheetInspection,
  ColumnMapping,
} from '../utils/spreadsheet';
import { AVItem } from '../types/inventory';

interface UploadZoneProps {
  onDataLoaded: (items: AVItem[], filename: string) => void;
  onLoadSample: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onDataLoaded,
  onLoadSample,
  isModal = false,
  onClose,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<SpreadsheetInspection | null>(null);
  const [customMapping, setCustomMapping] = useState<ColumnMapping | null>(null);
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const insp = await inspectSpreadsheet(file);
      setInspection(insp);
      setCustomMapping(insp.suggestedMapping);
      // Auto-preview mapping step
      setShowMappingEditor(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse spreadsheet. Please verify file format (.xlsx, .xls, .csv).');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = () => {
    if (!inspection || !customMapping) return;
    try {
      const items = processRowsWithMapping(inspection.rawData, customMapping, inspection.filename);
      onDataLoaded(items, inspection.filename);
      if (onClose) onClose();
    } catch (err: any) {
      setError('Error processing rows with current column mapping: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className={`bg-white ${isModal ? 'p-6' : 'rounded-lg border border-slate-200 p-8 shadow-sm'}`}>
      {!showMappingEditor ? (
        <div className="text-center max-w-2xl mx-auto">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center mx-auto mb-4 border border-sky-100">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isModal ? 'Upload Latest Classroom AV Inventory' : 'Upload College AV Inventory Spreadsheet'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Upload your existing spreadsheet template (.xlsx, .xls, or .csv). The app automatically adapts to your custom columns and headers.
          </p>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-6 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-500 bg-sky-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {loading ? 'Inspecting Template Columns...' : 'Drop your spreadsheet here, or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) · Intelligent custom column detector
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-3 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons: Sample Data & Templates */}
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={onLoadSample}
              className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
            >
              Load Sample College Fleet (30+ Spaces)
            </button>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Need template?</span>
              <button
                type="button"
                onClick={() => downloadTemplateSpreadsheet('xlsx')}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium underline"
              >
                <Download className="w-3.5 h-3.5" />
                Template (.xlsx)
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => downloadTemplateSpreadsheet('csv')}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium underline"
              >
                <Download className="w-3.5 h-3.5" />
                Template (.csv)
              </button>
            </div>
          </div>

          {/* Privacy Callout */}
          <div className="mt-6 flex items-start gap-2.5 p-3 rounded bg-slate-100/80 border border-slate-200 text-left text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">100% Client-Side Privacy: </span>
              Your spreadsheet is parsed strictly in your browser's local memory. No data is transmitted to an external server.
            </div>
          </div>
        </div>
      ) : (
        /* Column Mapping Reviewer */
        <div className="max-w-2xl mx-auto space-y-5 text-xs">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-sky-600" />
                <span>Confirm Template Column Mappings</span>
              </h3>
              <p className="text-slate-500 mt-0.5">
                File: <strong className="text-slate-800 font-mono">{inspection?.filename}</strong> ({inspection?.totalRows} rows found)
              </p>
            </div>
            <button
              onClick={() => setShowMappingEditor(false)}
              className="text-slate-500 hover:text-slate-800 underline"
            >
              Choose different file
            </button>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded p-3 text-sky-800">
            We automatically matched your spreadsheet columns to the dashboard fields below. Review and adjust any column dropdown if needed:
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[380px] overflow-y-auto p-1">
            {[
              { key: 'room', label: 'Room / Space ID', required: true },
              { key: 'roomName', label: 'Room Name / Lab Title' },
              { key: 'building', label: 'Building / Hall' },
              { key: 'spaceType', label: 'Type of Space' },
              { key: 'category', label: 'Equipment Category' },
              { key: 'makeModel', label: 'Make & Model / Equipment', required: true },
              { key: 'serialNumber', label: 'Serial Number / Asset Tag' },
              { key: 'installDate', label: 'Install Date / Year' },
              { key: 'shelflifeYears', label: 'Shelflife (Years)' },
              { key: 'replacementCost', label: 'Replacement Cost ($)' },
              { key: 'installationLaborCost', label: 'Labor Cost ($)' },
              { key: 'maintenanceStatus', label: 'Status' },
              { key: 'vendor', label: 'Vendor / Integrator' },
              { key: 'condition', label: 'Physical Condition' },
              { key: 'activeIssue', label: 'Active Issue / Ticket' },
              { key: 'assignedTech', label: 'Assigned Tech' },
            ].map((field) => (
              <div key={field.key} className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <label className="block font-semibold text-slate-700 mb-1">
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>
                <select
                  value={(customMapping as any)?.[field.key] || ''}
                  onChange={(e) =>
                    setCustomMapping((prev) => (prev ? { ...prev, [field.key]: e.target.value } : null))
                  }
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 focus:ring-1 focus:ring-sky-500 font-mono text-[11px]"
                >
                  <option value="">(None / Use Smart Default)</option>
                  {inspection?.headers.map((h) => (
                    <option key={h} value={h}>
                      Column: "{h}"
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-500">
              Ready to generate your college dashboard
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMappingEditor(false)}
                className="px-3.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleApplyMapping}
                className="px-4 py-1.5 font-semibold text-white bg-sky-600 rounded hover:bg-sky-500 flex items-center gap-1.5 shadow-xs"
              >
                <span>Generate Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
