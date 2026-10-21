import React, { useState, useRef } from 'react';
import { RoomUsageData, ClassroomPackage } from '../types/inventory';
import { parseRoomUsageSpreadsheet } from '../utils/spreadsheet';
import * as XLSX from 'xlsx';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Building,
  Clock,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface RoomUsageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomUsageData: RoomUsageData | null;
  onSaveUsageData: (data: RoomUsageData | null) => void;
  classroomPackages: ClassroomPackage[];
}

export const RoomUsageUploadModal: React.FC<RoomUsageUploadModalProps> = ({
  isOpen,
  onClose,
  roomUsageData,
  onSaveUsageData,
  classroomPackages,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const data = await parseRoomUsageSpreadsheet(file);
      onSaveUsageData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse usage ranking spreadsheet. Please check columns.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleRows = classroomPackages.length > 0
      ? classroomPackages.map((pkg, idx) => ({
          'Room': pkg.roomName,
          'Building': pkg.building,
          'Usage Rank': idx + 1,
          'Weekly Scheduled Hours': Math.max(10, Math.round(48 - idx * 4)),
          'Utilization Rate (%)': Math.max(25, Math.round(96 - idx * 7)),
          'Space Type': pkg.spaceType || 'Classroom',
        }))
      : [
          { 'Room': 'Room 101', 'Building': 'Main Academic Hall', 'Usage Rank': 1, 'Weekly Scheduled Hours': 45, 'Utilization Rate (%)': 95, 'Space Type': 'Lecture Hall' },
          { 'Room': 'Room 102', 'Building': 'Main Academic Hall', 'Usage Rank': 2, 'Weekly Scheduled Hours': 38, 'Utilization Rate (%)': 80, 'Space Type': 'Classroom' },
          { 'Room': 'Room 201', 'Building': 'Science Wing', 'Usage Rank': 3, 'Weekly Scheduled Hours': 30, 'Utilization Rate (%)': 65, 'Space Type': 'Lab' },
          { 'Room': 'Room 202', 'Building': 'Science Wing', 'Usage Rank': 4, 'Weekly Scheduled Hours': 20, 'Utilization Rate (%)': 45, 'Space Type': 'Seminar' },
        ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Classroom Usage Rankings');
    XLSX.writeFile(wb, 'Classroom_Usage_Rankings_Template.xlsx');
  };

  // Compute how many inventory rooms match the uploaded usage data
  const matchedRoomsCount = classroomPackages.filter((pkg) => pkg.usageRank !== undefined).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Overlay Classroom Usage & Scheduling Rankings
              </h2>
              <p className="text-xs text-slate-500">
                Cross-reference campus utilization data with hardware age to prioritize high-impact classrooms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Explanation Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>How Usage Cross-Referencing Works:</span>
            </div>
            <p className="text-slate-600">
              When uploaded, each room is tagged with its campus utilization tier (High, Moderate, or Low). The application calculates an <strong>Urgency & Student Impact Score</strong> and prevents high-traffic rooms from being deferred during 1-click budget leveling.
            </p>
          </div>

          {/* Active Status or Upload Area */}
          {roomUsageData ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Active Usage Dataset Loaded</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSaveUsageData(null)}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Usage Overlay</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-500">Source File</div>
                  <div className="font-mono font-bold text-slate-900 truncate" title={roomUsageData.filename}>
                    {roomUsageData.filename}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-500">Rooms Ranked</div>
                  <div className="font-mono font-bold text-indigo-700 text-sm">
                    {roomUsageData.totalRooms}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[11px] text-slate-500">Matched to Fleet</div>
                  <div className="font-mono font-bold text-emerald-700 text-sm">
                    {matchedRoomsCount} / {classroomPackages.length}
                  </div>
                </div>
              </div>

              {/* Fleet Matching Results */}
              <div className="mt-2.5">
                <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Cross-Referenced Inventory Fleet:</span>
                  <span className="text-slate-500 font-normal">
                    {matchedRoomsCount} of {classroomPackages.length} matched
                  </span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded bg-white max-h-40 overflow-y-auto">
                  {classroomPackages.map((pkg) => {
                    const isMapped = pkg.usageRank !== undefined;
                    return (
                      <div
                        key={`${pkg.building}-${pkg.roomName}`}
                        className="px-3 py-1.5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isMapped ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full bg-slate-200 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-800 truncate">
                            {pkg.roomDisplayName || pkg.roomName}
                          </span>
                          <span className="text-slate-400 text-[11px] shrink-0">({pkg.building})</span>
                        </div>
                        <div className="shrink-0 ml-2">
                          {isMapped ? (
                            <span className="font-mono font-bold text-indigo-700 text-[11px] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                              Rank #{pkg.usageRank} ({pkg.usageTier}) · {pkg.urgencyRating}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              Unranked in file
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Upload Drop Zone */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {loading ? 'Processing Room Usage Data...' : 'Drop room usage spreadsheet here, or click to browse'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) with columns for Room, Building, and Usage Rank, Hours, or Tiers
              </p>
            </div>

            {error && (
              <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleDownloadSample}
            className="inline-flex items-center gap-1.5 text-indigo-700 hover:text-indigo-900 font-medium hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample Template (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
