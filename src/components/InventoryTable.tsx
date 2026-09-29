import React, { useState, useMemo } from 'react';
import { AVItem, FilterState } from '../types/inventory';
import { exportActiveInventory } from '../utils/spreadsheet';
import { Search, Download, ArrowUpDown, ChevronDown, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface InventoryTableProps {
  items: AVItem[];
  onSelectItem: (item: AVItem) => void;
  selectedFY?: string | null;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onSelectItem,
  selectedFY,
}) => {
  const [search, setSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLifecycle, setSelectedLifecycle] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'room' | 'age' | 'cost' | 'installDate' | 'status'>('cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Unique filters
  const buildings = useMemo(() => Array.from(new Set(items.map((i) => i.building))).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);

  // Filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFY && item.replacementFiscalYear !== selectedFY) return false;
      if (selectedBuilding !== 'all' && item.building !== selectedBuilding) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedLifecycle !== 'all' && item.lifecycleStatus !== selectedLifecycle) return false;
      if (selectedStatus !== 'all' && item.maintenanceStatus !== selectedStatus) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchRoom = item.room.toLowerCase().includes(query);
        const matchModel = item.makeModel.toLowerCase().includes(query);
        const matchSerial = item.serialNumber.toLowerCase().includes(query);
        const matchBuilding = item.building.toLowerCase().includes(query);
        const matchIssue = (item.activeIssue || '').toLowerCase().includes(query);
        return matchRoom || matchModel || matchSerial || matchBuilding || matchIssue;
      }

      return true;
    });
  }, [items, selectedFY, selectedBuilding, selectedCategory, selectedLifecycle, selectedStatus, search]);

  // Sorting
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'cost') {
        comparison = a.totalReplacementCost - b.totalReplacementCost;
      } else if (sortBy === 'age') {
        comparison = a.ageYears - b.ageYears;
      } else if (sortBy === 'room') {
        comparison = a.room.localeCompare(b.room);
      } else if (sortBy === 'installDate') {
        comparison = new Date(a.installDate).getTime() - new Date(b.installDate).getTime();
      } else if (sortBy === 'status') {
        comparison = a.lifecycleStatus.localeCompare(b.lifecycleStatus);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortBy, sortOrder]);

  const handleSort = (field: 'room' | 'age' | 'cost' | 'installDate' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search classroom, model, serial, issue..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportActiveInventory(sortedItems, 'xlsx')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => exportActiveInventory(sortedItems, 'csv')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Buildings ({buildings.length})</option>
            {buildings.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedLifecycle}
            onChange={(e) => setSelectedLifecycle(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Lifecycle States</option>
            <option value="Past Lifespan / Overdue">Past Lifespan / Overdue</option>
            <option value="Nearing End of Life">Nearing End of Life (&lt;1 yr)</option>
            <option value="Mid-Lifecycle">Mid-Lifecycle</option>
            <option value="Optimal">Optimal (Recent)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:ring-1 focus:ring-sky-500"
          >
            <option value="all">All Service Statuses</option>
            <option value="Operational">Operational</option>
            <option value="Requires Service">Requires Service</option>
            <option value="Scheduled Repair">Scheduled Repair</option>
            <option value="Out of Service">Out of Service</option>
          </select>

          {(selectedBuilding !== 'all' || selectedCategory !== 'all' || selectedLifecycle !== 'all' || selectedStatus !== 'all' || search) && (
            <button
              onClick={() => {
                setSelectedBuilding('all');
                setSelectedCategory('all');
                setSelectedLifecycle('all');
                setSelectedStatus('all');
                setSearch('');
              }}
              className="text-sky-600 hover:text-sky-800 underline font-medium ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] tracking-wider select-none">
              <th
                onClick={() => handleSort('room')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Classroom / Room</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4">Equipment & Serial</th>
              <th className="py-2.5 px-4">Category</th>
              <th
                onClick={() => handleSort('age')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Age / Shelflife</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="py-2.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Lifecycle & Health</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4">Target FY</th>
              <th
                onClick={() => handleSort('cost')}
                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total CapEx</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No classroom AV assets match your active filters.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const isOverdue = item.lifecycleStatus === 'Past Lifespan / Overdue';
                const isFailing = item.maintenanceStatus === 'Out of Service';

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      <div>{item.room}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{item.building}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      <div className="font-medium group-hover:text-sky-600 transition-colors">
                        {item.makeModel}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{item.serialNumber}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {item.category}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                      {item.ageYears} yrs / {item.shelflifeYears} yrs
                    </td>
                    <td className="py-2.5 px-4">
                      {isOverdue ? (
                        <div className="text-rose-700 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Overdue Replacement</span>
                        </div>
                      ) : item.lifecycleStatus === 'Nearing End of Life' ? (
                        <div className="text-amber-700 font-medium">
                          Nearing EOL (&lt;1 yr)
                        </div>
                      ) : (
                        <div className="text-slate-600">
                          {item.lifecycleStatus}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.maintenanceStatus} · {item.condition}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-slate-800">
                      {item.replacementFiscalYear}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ${item.totalReplacementCost.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono">
        <div>
          Showing {sortedItems.length} of {items.length} fleet assets
        </div>
        <div>
          Filtered Total CapEx:{' '}
          <strong className="text-slate-900">
            ${sortedItems.reduce((acc, i) => acc + i.totalReplacementCost, 0).toLocaleString()}
          </strong>
        </div>
      </div>
    </div>
  );
};
