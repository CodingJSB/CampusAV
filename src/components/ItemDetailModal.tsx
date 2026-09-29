import React, { useState } from 'react';
import { AVItem, EquipmentCategory, EquipmentCondition, MaintenanceStatus } from '../types/inventory';
import { enrichAVItem } from '../utils/calculations';
import { X, Wrench, Calendar, DollarSign, Clock, ShieldCheck, Check } from 'lucide-react';

interface ItemDetailModalProps {
  item: AVItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: AVItem) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !item) return null;

  const [formData, setFormData] = useState<AVItem>({ ...item });
  const [hasSaved, setHasSaved] = useState(false);

  const handleChange = (field: keyof AVItem, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Dynamically recalculate age, lifecycle, and fiscal year when dates or shelf life change
      return enrichAVItem(updated);
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setHasSaved(true);
    setTimeout(() => {
      setHasSaved(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              {formData.id}
            </span>
            <h3 className="text-base font-bold text-slate-900">{formData.room}</h3>
            <p className="text-xs text-slate-500">{formData.building}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5 text-xs">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md font-mono tabular-nums">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-sans">Current Age</span>
              <div className="text-sm font-bold text-slate-800">{formData.ageYears} Years</div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-sans">Lifecycle Status</span>
              <div
                className={`text-sm font-bold ${
                  formData.lifecycleStatus === 'Past Lifespan / Overdue'
                    ? 'text-rose-600'
                    : 'text-slate-800'
                }`}
              >
                {formData.lifecycleStatus}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-sans">Projected FY</span>
              <div className="text-sm font-bold text-sky-700">{formData.replacementFiscalYear}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Room Name & Space Type */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Room Name / Label</label>
              <input
                type="text"
                value={formData.roomName || ''}
                onChange={(e) => handleChange('roomName', e.target.value)}
                placeholder="e.g. Ecology Lab, Seminar..."
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Type of Space</label>
              <input
                type="text"
                value={formData.spaceType || ''}
                onChange={(e) => handleChange('spaceType', e.target.value)}
                placeholder="e.g. Lab (TL), Active Classroom..."
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Make / Model */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Make & Model</label>
              <input
                type="text"
                value={formData.makeModel}
                onChange={(e) => handleChange('makeModel', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Serial / Tag */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Serial / Asset Tag</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                list="category-suggestions"
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
              <datalist id="category-suggestions">
                <option value="Projector" />
                <option value="Projector (Short-throw)" />
                <option value="Screen" />
                <option value="Controller" />
                <option value="Switcher" />
                <option value="Flat-Panel" />
                <option value="Wireless Presentation" />
                <option value="Document Camera" />
                <option value="Camera" />
                <option value="Ceiling Mic" />
                <option value="TV Bar with Camera" />
                <option value="BluRay/DVD/VCR" />
              </datalist>
            </div>

            {/* Vendor */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Integrator / Vendor</label>
              <input
                type="text"
                value={formData.vendor || ''}
                onChange={(e) => handleChange('vendor', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Install Date */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Installation Date</label>
              <input
                type="date"
                value={formData.installDate}
                onChange={(e) => handleChange('installDate', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Shelflife Years (Interactive simulation!) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Predetermined Shelflife (Years)</label>
                <span className="text-[11px] font-mono text-sky-600 font-bold">{formData.shelflifeYears} yrs</span>
              </div>
              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={formData.shelflifeYears}
                onChange={(e) => handleChange('shelflifeYears', Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>2 yrs</span>
                <span>6 yrs</span>
                <span>12 yrs</span>
              </div>
            </div>

            {/* Replacement Hardware Cost */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hardware Replacement Cost ($)</label>
              <input
                type="number"
                value={formData.replacementCost}
                onChange={(e) => handleChange('replacementCost', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Installation Labor Cost */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Installation / Labor Cost ($)</label>
              <input
                type="number"
                value={formData.installationLaborCost}
                onChange={(e) => handleChange('installationLaborCost', Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Maintenance Status */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operational Status</label>
              <select
                value={formData.maintenanceStatus}
                onChange={(e) => handleChange('maintenanceStatus', e.target.value as MaintenanceStatus)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                <option value="Operational">Operational</option>
                <option value="Requires Service">Requires Service</option>
                <option value="Scheduled Repair">Scheduled Repair</option>
                <option value="Out of Service">Out of Service (Classroom Down)</option>
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange('condition', e.target.value as EquipmentCondition)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Active Issue */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Active Ticket / Issue Description</label>
              <textarea
                rows={2}
                value={formData.activeIssue || ''}
                onChange={(e) => handleChange('activeIssue', e.target.value)}
                placeholder="Log active hardware problem, error codes, or degradation..."
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Technician & Quarter */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Technician</label>
              <input
                type="text"
                value={formData.assignedTech || ''}
                onChange={(e) => handleChange('assignedTech', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Turnover Quarter</label>
              <input
                type="text"
                value={formData.scheduledQuarter || ''}
                onChange={(e) => handleChange('scheduledQuarter', e.target.value)}
                placeholder="e.g. 2026-Q4"
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-mono">
              Total CapEx: <strong className="text-slate-900">${formData.totalReplacementCost.toLocaleString()}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded hover:bg-sky-500 shadow-xs flex items-center gap-1.5"
              >
                {hasSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{hasSaved ? 'Updated!' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
