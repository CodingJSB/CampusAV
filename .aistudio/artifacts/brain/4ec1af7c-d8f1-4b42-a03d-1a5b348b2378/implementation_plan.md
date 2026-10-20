# Implementation Plan: Non-Destructive Multi-Scenario Budget Leveling & Capital Planning Engine

## Executive Summary
This plan addresses all architectural gaps identified across the four audit rounds:
1. **Decoupling Mechanical EOL from Target Financial FY:** An asset's physical expiration and risk score remain permanently grounded in hardware reality, while its planned funding year can be independently scheduled.
2. **Overlay State & Multi-Scenario Architecture:** A pure in-memory scenario engine maintaining an immutable `masterItems` baseline and lightweight scenario overlay deltas with JSON export/import.
3. **Dual Leveling Workflows:**
   - **Interactive Multi-Year Kanban:** A visual board with fiscal year columns, budget ceiling lines, and drag-and-drop / 1-click move controls.
   - **1-Click Smart Budget Leveler:** An automated triage algorithm that smooths backlog spikes and defers low-risk assets into future fiscal years while respecting annual spending caps.
4. **Batch Scheduling:** Multi-select table checkboxes and a floating batch action toolbar.
5. **Non-Destructive Dual-Track Export:** Exports both physical baseline specs and scenario planning overrides in separate, designated columns.

---

## Architecture & Data Modeling

### 1. Model Augmentation (`src/types/inventory.ts`)
```typescript
export interface ItemPlanningOverride {
  targetFiscalYear?: string;
  notes?: string;
  priority?: 'Critical' | 'Standard' | 'Elective';
}

export interface RoomPlanningOverride {
  targetFiscalYear?: string;
  customBaselineCost?: number;
  notes?: string;
}

export interface PlanningScenario {
  id: string;
  name: string; // e.g., "Baseline (Mechanical EOL)", "5-Year Levelized CapEx", "Conservative Triage"
  description: string;
  isBaseline: boolean; // True for read-only mechanical baseline
  annualBudgetCeiling: number; // e.g., $250,000 per fiscal year
  inflationRate: number; // e.g., 0.05 (5% / year)
  itemOverrides: Record<string, ItemPlanningOverride>; // Keyed by item ID
  roomOverrides: Record<string, RoomPlanningOverride>; // Keyed by "Building::Room"
  createdAt: string;
  updatedAt: string;
}
```

### 2. Decoupled Fields on `AVItem` & `ClassroomPackage`
* `mechanicalEOLYear: number` (Calculated: `installYear + shelflifeYears`)
* `mechanicalFiscalYear: string` (e.g. `"FY2023 (Overdue)"` or `"FY2028"`)
* `targetFiscalYear: string` (User/algorithm planned year; defaults to `mechanicalFiscalYear`)
* `isOverdue: boolean` (Strictly based on `mechanicalEOLYear < currentYear`; **never cleared by deferral**)
* `deferralYears: number` (`targetYear - mechanicalEOLYear`; positive indicates deferral, negative indicates early swap)
* `deferralRiskLevel: 'None' | 'Moderate' | 'High' | 'Severe'` (Calculated based on readiness score + deferral age)

### 3. In-Memory State Schema (`src/App.tsx`)
```typescript
// Immutable master dataset loaded from CSV or sample
const [masterItems, setMasterItems] = useState<AVItem[]>(() => getSampleInventory());

// Multi-scenario storage
const [scenarios, setScenarios] = useState<PlanningScenario[]>(() => [
  createDefaultBaselineScenario(),
  createLevelizedScenarioPreset(),
]);
const [activeScenarioId, setActiveScenarioId] = useState<string>('baseline');
```

---

## User Workflows & Components

### 1. Scenario Management Header Bar
* **Scenario Switcher Tabs:** Switch seamlessly between "Baseline (Mechanical EOL)", "5-Year Levelized Plan", or custom user branches.
* **Scenario Operations:**
  - `+ New Branch` (Clone current scenario or start fresh).
  - `Rename / Edit Ceiling` (Adjust annual cap slider or input).
  - `Export Scenario (JSON)` (Download `.json` scenario package for transient portability).
  - `Import Scenario (JSON)` (Load saved scenario deltas without needing any server).

### 2. Multi-Year Interactive Kanban Board (`src/components/BudgetKanbanBoard.tsx`)
* Columns for: `Backlog / Overdue`, `FY2026`, `FY2027`, `FY2028`, `FY2029`, `FY2030`, `Deferred / Horizon`.
* **Column Header Metrics:**
  - Total Scheduled Spend (hardware + labor + compounding inflation).
  - Annual Budget Ceiling comparison with visual progress bar.
  - Variance status badge (e.g., `+$42k available` green, or `-$65k over cap` red).
* **Card Representation:**
  - Whole Room cards or Component cards (depending on planning mode toggle).
  - Displays room name, readiness score badge (color-coded), total projected overhaul cost, and deferral indicator.
  - Drag-and-drop or Quick-Move buttons (`← Defer` / `Advance →`) to reassign between fiscal years.

### 3. 1-Click Automated Budget Leveler / Triage Engine
* **Algorithm Logic:**
  1. Identifies the active `annualBudgetCeiling`.
  2. Detects fiscal years where projected spend exceeds the ceiling.
  3. Evaluates candidates for deferral based on:
     - Health & Readiness Score (rooms/items with higher readiness and no critical failures are prioritized for deferral).
     - Component age and condition.
  4. Moves low-risk assets into the earliest subsequent fiscal year that has remaining headroom below the cap.
  5. Critical failures and severely deteriorated items are locked in the earliest possible year.
* **Interactive Triage Preview Modal:**
  - Displays a before/after waterfall comparison of spend per fiscal year.
  - Lists proposed moves with clear justification (e.g., *"Deferred NH-204 from FY2026 to FY2027; Readiness Score 78/100, no active issues"*).
  - "Apply to Scenario" button.

### 4. Batch Reassignment Toolbar (`src/components/BatchActionToolbar.tsx`)
* Checkboxes on each row in the inventory grid and classroom list.
* Floating action bar showing count: `"8 items selected"`.
* Actions:
  - Bulk move to Target Fiscal Year (`FY2026`, `FY2027`, `FY2028`, etc.).
  - Bulk set Priority (`Critical`, `Standard`, `Elective`).
  - Clear selected overrides back to baseline.

### 5. Dual-Track CSV & Excel Export Engine (`src/utils/spreadsheet.ts`)
* **Retains all physical baseline columns:**
  `Building`, `Room`, `Category`, `Make & Model`, `Install Year`, `Shelflife (Years)`, `Mechanical EOL Year`, `Mechanical Fiscal Year`, `Physical Condition`.
* **Appends explicit scenario planning columns:**
  `Scenario Name`, `Target Fiscal Year`, `Deferral Years`, `Deferral Risk Assessment`, `Inflation Adjusted Planned Cost ($)`, `Budget Cap Variance Status`.

---

## Step-by-Step Implementation Sequence

### Phase 1: Type Definitions & Calculation Utilities
1. Update `/src/types/inventory.ts` with `PlanningScenario`, `ItemPlanningOverride`, `RoomPlanningOverride`, and augmented `AVItem` / `ClassroomPackage` fields.
2. Update `/src/utils/calculations.ts` to compute:
   - Mechanical vs. Target fiscal year separation.
   - Deferral years and risk classification.
   - Scenario resolution helper: `resolveScenarioItems(masterItems, scenario) => AVItem[]`.
   - Automated budget leveling algorithm: `generateLevelingProposal(items, packages, annualCap)`.

### Phase 2: State Management & Scenario Navigation in `App.tsx`
1. Refactor `App.tsx` state to hold immutable `masterItems` and mutable `scenarios` array.
2. Implement scenario actions: `handleCreateScenario`, `handleSwitchScenario`, `handleUpdateScenarioCap`, `handleExportScenarioJson`, `handleImportScenarioJson`.
3. Compute derived `activeItems` and `activePackages` using `resolveScenarioItems`.

### Phase 3: Interactive Kanban & Budget Leveling UI
1. Create `BudgetKanbanBoard.tsx` with drag-and-drop / button moves, column budget ceilings, and variance indicators.
2. Create `AutoLevelerModal.tsx` for 1-click triage with before/after spend visualizations and proposed deferral diffs.
3. Add a dedicated "CapEx Leveling Kanban" view toggle alongside Table, Matrix, Analytics, and Turnkey packages.

### Phase 4: Batch Selection & Action Bar
1. Add multi-select checkbox column to `InventoryTable.tsx` and room selection to classroom views.
2. Implement `BatchActionToolbar.tsx` with quick target year dropdown and instant scenario delta commits.

### Phase 5: Dual-Track CSV/JSON Export & Verification
1. Enhance `exportActiveInventory` in `/src/utils/spreadsheet.ts` with dual baseline + scenario columns.
2. Add "Export Scenario Package (JSON)" and "Import Scenario Package" buttons to the data toolbar.
3. Run `compile_applet` and test all workflows.

---

## Verification & Test Plan
* **Baseline Immutability:** Verify that shifting rooms or items across scenarios never modifies `masterItems`. Switching back to "Baseline (Mechanical EOL)" immediately restores the raw physical forecast.
* **Risk Integrity:** Verify that an overdue item (e.g. 2017 install, 5-year shelflife) deferred to FY2028 retains its Red "Overdue / High Risk" condition badge while reflecting FY2028 in budget calculations.
* **JSON Scenario Portability:** Export a scenario with 15 overrides, reload the application, and import the JSON file to verify exact restoration of overrides and budget ceilings.
* **Export Schema Fidelity:** Export CSV and verify that `Mechanical Fiscal Year` and `Target Planned Fiscal Year` exist side-by-side without data loss.
