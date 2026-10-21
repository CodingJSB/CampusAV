import React, { useState } from 'react';
import { CategoryLifespans, AVItem } from '../types/inventory';
import { DEFAULT_CATEGORY_LIFESPANS } from '../utils/calculations';
import {
  Sliders,
  X,
  RotateCcw,
  Check,
  Tv,
  Projector,
  Camera,
  Mic,
  Monitor,
  FileText,
  Radio,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

interface CategoryLifespanModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLifespans: CategoryLifespans;
  onSaveLifespans: (newLifespans: CategoryLifespans) => void;
  items: AVItem[];
}

export const CategoryLifespanModal: React.FC<CategoryLifespanModalProps> = ({
  isOpen,
  onClose,
  activeLifespans,
  onSaveLifespans,
  items,
}) => {
  const [lifespans, setLifespans] = useState<CategoryLifespans>(activeLifespans);

  if (!isOpen) return null;

  // Calculate live item counts for each category
  const counts = {
    screen: items.filter((it) => it.category.toLowerCase().includes('screen') || it.makeModel.toLowerCase().includes('screen') || it.makeModel.toLowerCase().includes('da-lite')).length,
    switcherControllerProcessor: items.filter((it) => {
      const s = it.category.toLowerCase();
      return s.includes('switch') || s.includes('controller') || s.includes('matrix') || s.includes('processor') || s.includes('touchpanel');
    }).length,
    projectors: items.filter((it) => it.category.toLowerCase().includes('projector') || it.category.toLowerCase().includes('proj')).length,
    documentCamera: items.filter((it) => it.category.toLowerCase().includes('doc') || it.makeModel.toLowerCase().includes('wolfvision') || it.makeModel.toLowerCase().includes('elmo')).length,
    cameraCeilingMics: items.filter((it) => {
      const s = it.category.toLowerCase();
      return s.includes('camera') || s.includes('mic') || s.includes('audio') || s.includes('dsp') || s.includes('vaddio');
    }).length,
    flatPanel: items.filter((it) => {
      const s = it.category.toLowerCase();
      return s.includes('flat') || s.includes('panel') || s.includes('interactive') || s.includes('touch');
    }).length,
    wirelessAndOther: items.filter((it) => {
      const s = it.category.toLowerCase();
      return s.includes('wireless') || s.includes('bluray') || s.includes('dvd') || s.includes('other');
    }).length,
  };

  const handleUpdate = (field: keyof CategoryLifespans, delta: number) => {
    setLifespans((prev) => ({
      ...prev,
      [field]: Math.max(1, Math.min(20, (prev[field] || 7) + delta)),
    }));
  };

  const handleReset = () => {
    setLifespans(DEFAULT_CATEGORY_LIFESPANS);
  };

  const handleSave = () => {
    onSaveLifespans(lifespans);
    onClose();
  };

  const categoriesConfig: {
    key: keyof CategoryLifespans;
    label: string;
    sublabel: string;
    defaultVal: number;
    icon: React.ReactNode;
    count: number;
  }[] = [
    {
      key: 'screen',
      label: 'Projection Screens',
      sublabel: 'Da-Lite, Draper motorized & tensioned screens',
      defaultVal: 10,
      icon: <Monitor className="w-4 h-4 text-emerald-600" />,
      count: counts.screen,
    },
    {
      key: 'switcherControllerProcessor',
      label: 'Switchers, Controllers & Processors',
      sublabel: 'Matrix switchers, Extron/Crestron controllers, DSP processors',
      defaultVal: 7,
      icon: <SlidersHorizontal className="w-4 h-4 text-indigo-600" />,
      count: counts.switcherControllerProcessor,
    },
    {
      key: 'projectors',
      label: 'Classroom Projectors',
      sublabel: 'Laser projectors, standard & ultra short-throw units',
      defaultVal: 7,
      icon: <Projector className="w-4 h-4 text-sky-600" />,
      count: counts.projectors,
    },
    {
      key: 'documentCamera',
      label: 'Document Cameras',
      sublabel: 'Wolfvision, Epson & Elmo tabletop doc cams',
      defaultVal: 7,
      icon: <FileText className="w-4 h-4 text-amber-600" />,
      count: counts.documentCamera,
    },
    {
      key: 'cameraCeilingMics',
      label: 'Cameras & Ceiling Mics',
      sublabel: 'PTZ tracking cameras, beamforming microphone arrays, TV bars',
      defaultVal: 7,
      icon: <Camera className="w-4 h-4 text-rose-600" />,
      count: counts.cameraCeilingMics,
    },
    {
      key: 'flatPanel',
      label: 'Commercial Flat Panels & Touch',
      sublabel: 'Interactive touch displays, commercial 65"-85" monitors',
      defaultVal: 7,
      icon: <Tv className="w-4 h-4 text-teal-600" />,
      count: counts.flatPanel,
    },
    {
      key: 'wirelessAndOther',
      label: 'Wireless Gateways & Media Decks',
      sublabel: 'Airmedia, Solstice, ClickShare & media players',
      defaultVal: 5,
      icon: <Radio className="w-4 h-4 text-purple-600" />,
      count: counts.wirelessAndOther,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Category-Specific Equipment Lifespan Policy
              </h2>
              <p className="text-xs text-slate-500">
                Customize predetermined shelf-life replacement cycles per hardware category
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

        {/* Info Banner */}
        <div className="px-6 py-3 bg-sky-50/70 border-b border-sky-100 flex items-start gap-2.5 text-xs text-sky-900">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p>
            Changes instantly update mechanical end-of-life years, overdue calculations, room readiness scores, and budget forecasting across the entire fleet.
          </p>
        </div>

        {/* Category List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100">
          {categoriesConfig.map((cat) => {
            const currentVal = lifespans[cat.key] || cat.defaultVal;
            const isModified = currentVal !== cat.defaultVal;

            return (
              <div
                key={cat.key}
                className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                    {cat.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{cat.label}</span>
                      {isModified ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.2 rounded border border-amber-200">
                          Custom ({currentVal > cat.defaultVal ? `+${currentVal - cat.defaultVal}y` : `${currentVal - cat.defaultVal}y`})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Default ({cat.defaultVal} yrs)</span>
                      )}
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
                        {cat.count} units
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{cat.sublabel}</p>
                  </div>
                </div>

                {/* Stepper Control */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdate(cat.key, -1)}
                    disabled={currentVal <= 1}
                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Decrease shelf life by 1 year"
                  >
                    -
                  </button>

                  <div className="w-16 text-center font-mono font-bold text-sm text-slate-900 bg-slate-50 border border-slate-200 py-1 rounded">
                    {currentVal} <span className="text-xs font-normal text-slate-500">yrs</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpdate(cat.key, 1)}
                    disabled={currentVal >= 20}
                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Increase shelf life by 1 year"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply Lifespan Policy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
