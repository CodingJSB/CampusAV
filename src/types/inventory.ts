export type EquipmentCategory =
  | 'Projector'
  | 'Projector (Short-throw)'
  | 'Screen'
  | 'Controller'
  | 'Switcher'
  | 'Flat-Panel'
  | 'Wireless Presentation'
  | 'Document Camera'
  | 'Camera'
  | 'Ceiling Mic'
  | 'TV Bar with Camera'
  | 'BluRay/DVD/VCR'
  | 'Laser Projector'
  | 'Lamp Projector'
  | 'Interactive Touch Display'
  | 'Commercial Flat Panel'
  | 'AV Matrix Switcher / Controller'
  | 'Audio DSP & Mic Array'
  | 'Wireless Presentation Gateway'
  | 'HyFlex PTZ Camera'
  | 'Control Touchpanel'
  | 'Assistive Listening System'
  | 'Lectern PC & Doc Cam'
  | string;

export type MaintenanceStatus =
  | 'Operational'
  | 'Requires Service'
  | 'Scheduled Repair'
  | 'Out of Service';

export type EquipmentCondition =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'Critical';

export type LifecycleStatus =
  | 'Optimal'
  | 'Mid-Lifecycle'
  | 'Nearing End of Life'
  | 'Past Lifespan / Overdue';

export interface ItemPlanningOverride {
  targetFiscalYear?: string;
  notes?: string;
  priority?: 'Critical' | 'Standard' | 'Elective';
}

export interface RoomPlanningOverride {
  targetFiscalYear?: string;
  customBaselineCost?: number;
  notes?: string;
  priority?: 'Critical' | 'Standard' | 'Elective';
}

export interface PlanningScenario {
  id: string;
  name: string; // e.g. "Baseline (Mechanical EOL)", "5-Year Levelized CapEx", "Conservative Triage"
  description: string;
  isBaseline: boolean; // True for read-only mechanical baseline
  annualBudgetCeiling: number; // e.g., 250000 ($250k / year)
  inflationRate: number; // e.g. 0.05
  itemOverrides: Record<string, ItemPlanningOverride>; // Keyed by item.id
  roomOverrides: Record<string, RoomPlanningOverride>; // Keyed by `${building}::${room}`
  createdAt: string;
  updatedAt: string;
}

export interface AVItem {
  id: string; // e.g. "AV-NH-105-1"
  room: string; // e.g. "NH-105"
  roomName?: string; // e.g. "Ecology Lab"
  building: string; // e.g. "Nobel Hall"
  spaceType?: string; // e.g. "Lab (TL)", "Active Classroom"
  category: EquipmentCategory;
  makeModel: string; // e.g. "Epson EB-L630U"
  serialNumber: string;
  installDate: string; // YYYY-MM-DD
  installYear?: number | string; // e.g. 2025
  shelflifeYears: number; // e.g. 7
  replacementCost: number; // USD
  installationLaborCost: number; // USD
  vendor?: string; // e.g. "AVC"
  condition: EquipmentCondition;
  maintenanceStatus: MaintenanceStatus;
  activeIssue?: string;
  issueSeverity?: 'Low' | 'Medium' | 'High' | 'Critical';
  lastMaintenanceDate?: string;
  assignedTech?: string;
  notes?: string;

  // Calculated fields
  ageYears: number;
  remainingYears: number;
  replacementFiscalYear: string; // Active fiscal year (defaults to target or mechanical)
  lifecycleStatus: LifecycleStatus;
  totalReplacementCost: number; // replacementCost + installationLaborCost
  isPrematureSwap?: boolean; // Flagged for early component replacement before room overhaul
  roomPackageId?: string; // Grouping identifier for the classroom

  // Decoupled Mechanical EOL vs Financial Target FY
  mechanicalEOLYear: number; // Raw installYear + shelflifeYears
  mechanicalFiscalYear: string; // Raw mechanical replacement FY (e.g. "FY2023" or "FY2027")
  targetFiscalYear: string; // Financial scheduled FY (editable in scenario branches)
  isOverdue: boolean; // Strictly based on hardware age (installYear + shelflifeYears <= currentYear). NEVER cleared by deferral!
  deferralYears: number; // Difference between target fiscal year and mechanical EOL
  deferralRiskLevel: 'None' | 'Moderate' | 'High' | 'Severe';
  planningPriority?: 'Critical' | 'Standard' | 'Elective';

  // Whole-room renovation & inflation fields
  roomLastRenovationYear?: number;
  roomBaselineCost?: number;
  roomProjectedOverhaulCost?: number;
  roomReadinessScore?: number;
}

export type BudgetPlanningMode = 'whole_room' | 'individual_components';

export interface ClassroomPackage {
  roomName: string; // e.g. "NH-105"
  roomDisplayName: string; // e.g. "NH-105 (Ecology Lab)"
  building: string;
  spaceType?: string; // e.g. "Lab (TL)", "Active Classroom"
  roomTier?: string;
  vendor?: string; // e.g. "AVC"
  items: AVItem[];
  itemCount: number;
  totalHardwareCost: number;
  totalLaborCost: number;
  totalPackageCost: number; // Raw sum of line items

  // Historical Renovation & Inflation Forecasting
  lastRenovationYear: number; // Year room was last fully renovated (e.g. 2021)
  lastRenovationCost: number; // Baseline project cost valued in current-year dollars (e.g. $35,000 / $55,000)
  isDefaultBaselineCost: boolean; // True if standard room benchmark was used as fallback
  projectedOverhaulCost: number; // Inflation-adjusted projected cost for the whole-room overhaul
  inflationRate: number; // Compounding inflation rate (e.g. 0.05 for 5%/year)
  inflationDeltaCost: number; // Additional budget needed due to inflation compounding
  baseYear?: number; // Base valuation year (current year 2026)
  inflationYears?: number; // Number of compounding years from current year (2026) to projected overhaul

  // Room Equipment Agedness & Readiness Composite Index (0-100)
  readinessScore: number; // 0-100 composite index
  readinessRating: 'Optimal' | 'Good' | 'Fair' | 'Critical / Due';
  averageComponentAgeYears: number;
  newestComponentAgeYears: number; // Captures recent partial swap (e.g., new projector)
  oldestComponentAgeYears: number; // Captures oldest anchor component

  lastOverhaulDate: string; // Last full room upgrade date
  shelflifeYears: number; // Room overhaul cycle (e.g. 7 yrs)
  projectedFiscalYear: string; // FY when whole room is refreshed (Active target)
  
  // Decoupled Mechanical vs Planned FY for Classroom
  mechanicalFiscalYear: string; // Baseline mechanical overhaul FY
  targetFiscalYear: string; // Active scenario planned FY
  isOverdue: boolean; // Overdue condition preserved regardless of deferral
  deferralYears: number; // targetYear - mechanicalYear
  planningPriority?: 'Critical' | 'Standard' | 'Elective';

  targetSeason: string; // e.g. "Summer Overhaul", "Winter Break", "Mid-Year"
  overallCondition: EquipmentCondition;
  hasCriticalFailure: boolean;
  activeIssues: string[];
  prematureSwaps: AVItem[]; // Items failing ahead of master room overhaul
  primaryEquipmentSummary: string; // e.g. "Epson EB-L630U + Extron MLC 55 + Da-Lite"
}

export type PlanningMode = 'bundled_rooms' | 'component_assets';

export interface FiscalYearBudget {
  fiscalYear: string; // "FY2026", "FY2027", etc.
  hardwareCost: number;
  laborCost: number;
  totalCost: number;
  itemCount: number;
  categories: Record<string, number>;
  items: AVItem[];

  // Whole-room inflation-adjusted budgeting fields
  planningMode?: BudgetPlanningMode;
  wholeRoomCost?: number; // Total inflation-adjusted whole room overhaul project budget
  wholeRoomCount?: number; // Number of classrooms scheduled for overhaul in this FY
  inflationDelta?: number; // Additional cost attributed to compounding inflation
  roomPackages?: ClassroomPackage[]; // Classroom packages scheduled for overhaul in this FY

  // Budget Ceiling & Variance Fields
  annualBudgetCeiling?: number;
  ceilingVariance?: number; // ceiling - totalCost (positive = available headroom, negative = over cap)
  isOverCeiling?: boolean;
}

export interface InventoryStats {
  totalItems: number;
  totalFleetReplacementValue: number;
  nextFiscalYearBudget: number;
  overdueCount: number;
  nearingEolCount: number;
  activeIssuesCount: number;
  outOfServiceCount: number;
  averageAgeYears: number;
  // Scenario leveling stats
  budgetCeiling?: number;
  overCeilingYearsCount?: number;
  deferredCount?: number;
}

export interface FilterState {
  searchQuery: string;
  building: string;
  category: string;
  maintenanceStatus: string;
  lifecycleStatus: string;
  fiscalYear: string;
  sortBy: 'room' | 'age' | 'cost' | 'installDate' | 'status';
  sortOrder: 'asc' | 'desc';
}

