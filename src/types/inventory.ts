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
  scheduledQuarter?: string; // e.g. "2026-Q4"
  assignedTech?: string;
  notes?: string;

  // Calculated fields
  ageYears: number;
  remainingYears: number;
  replacementFiscalYear: string; // e.g. "FY2027"
  lifecycleStatus: LifecycleStatus;
  totalReplacementCost: number; // replacementCost + installationLaborCost
  isPrematureSwap?: boolean; // Flagged for early component replacement before room overhaul
  roomPackageId?: string; // Grouping identifier for the classroom

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
  lastRenovationCost: number; // Baseline project cost when renovated (e.g. $55,000)
  isDefaultBaselineCost: boolean; // True if standard room benchmark was used as fallback
  projectedOverhaulCost: number; // Inflation-adjusted projected cost for the whole-room overhaul
  inflationRate: number; // Compounding inflation rate (e.g. 0.05 for 5%/year)
  inflationDeltaCost: number; // Additional budget needed due to inflation compounding

  // Room Equipment Agedness & Readiness Composite Index (0-100)
  readinessScore: number; // 0-100 composite index
  readinessRating: 'Optimal' | 'Good' | 'Fair' | 'Critical / Due';
  averageComponentAgeYears: number;
  newestComponentAgeYears: number; // Captures recent partial swap (e.g., new projector)
  oldestComponentAgeYears: number; // Captures oldest anchor component

  lastOverhaulDate: string; // Last full room upgrade date
  shelflifeYears: number; // Room overhaul cycle (e.g. 7 yrs)
  projectedFiscalYear: string; // FY when whole room is refreshed
  scheduledQuarter: string; // e.g. "2026-Q4", "Summer 2027"
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
}

export interface QuarterExpense {
  quarter: string; // e.g. "2026-Q4", "2027-Q1"
  label: string; // "Q4 2026 (Fall Semester)"
  totalProjectedCost: number;
  replacementCost: number;
  maintenanceCost: number;
  overdueItemsCost: number;
  itemCount: number;
  items: AVItem[];
}

export interface InventoryStats {
  totalItems: number;
  totalFleetReplacementValue: number;
  nextFiscalYearBudget: number;
  nextQuarterProjectedExpense: number;
  overdueCount: number;
  nearingEolCount: number;
  activeIssuesCount: number;
  outOfServiceCount: number;
  averageAgeYears: number;
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
