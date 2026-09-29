import { AVItem, ClassroomPackage, FiscalYearBudget, InventoryStats, LifecycleStatus, QuarterExpense } from '../types/inventory';

// Reference date for calculations (defaults to current date, or fallback to current simulation time)
export const SYSTEM_NOW = new Date();

/**
 * Calculates academic fiscal year for a given date.
 * College fiscal years typically run July 1 to June 30.
 * E.g., Oct 2026 is in FY2027 (July 2026 - June 2027).
 */
export function getFiscalYearFromDate(date: Date, startMonth: number = 7): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  
  if (month >= startMonth) {
    return `FY${year + 1}`;
  } else {
    return `FY${year}`;
  }
}

/**
 * Returns the calendar quarter string for a date (e.g., "2026-Q4")
 */
export function getQuarterFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}

export function getQuarterLabel(quarterStr: string): string {
  const [yearStr, qStr] = quarterStr.split('-');
  const qNum = qStr?.replace('Q', '') || '1';
  const labels: Record<string, string> = {
    '1': 'Winter / Early Spring (Jan–Mar)',
    '2': 'Spring Finals / Summer Prep (Apr–Jun)',
    '3': 'Summer AV Overhaul (Jul–Sep)',
    '4': 'Fall Semester / Winter Break (Oct–Dec)',
  };
  return `${qStr} ${yearStr} · ${labels[qNum] || ''}`;
}

/**
 * Calculate age in decimal years from installDate to reference date.
 */
export function calculateAgeInYears(installDateStr: string, refDate: Date = SYSTEM_NOW): number {
  const installDate = new Date(installDateStr);
  if (isNaN(installDate.getTime())) return 0;
  
  const diffMs = refDate.getTime() - installDate.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.max(0, Math.round(diffYears * 10) / 10);
}

/**
 * Computes all dynamic fields for an AV item
 */
export function enrichAVItem(
  item: Omit<AVItem, 'ageYears' | 'remainingYears' | 'replacementFiscalYear' | 'lifecycleStatus' | 'totalReplacementCost'>,
  refDate: Date = SYSTEM_NOW
): AVItem {
  const ageYears = calculateAgeInYears(item.installDate, refDate);
  const remainingYears = Math.round((item.shelflifeYears - ageYears) * 10) / 10;
  
  let lifecycleStatus: LifecycleStatus = 'Mid-Lifecycle';
  if (remainingYears <= 0) {
    lifecycleStatus = 'Past Lifespan / Overdue';
  } else if (remainingYears <= 1.0) {
    lifecycleStatus = 'Nearing End of Life';
  } else if (ageYears <= 2.0) {
    lifecycleStatus = 'Optimal';
  }

  // Calculate projected replacement date: installDate + shelflifeYears
  const installDate = new Date(item.installDate);
  let replacementDate: Date;
  if (!isNaN(installDate.getTime())) {
    replacementDate = new Date(installDate);
    replacementDate.setFullYear(replacementDate.getFullYear() + item.shelflifeYears);
  } else {
    replacementDate = new Date(refDate);
  }

  // If already overdue, it is budgeted for the current fiscal year
  const currentFY = getFiscalYearFromDate(refDate);
  const calculatedFY = getFiscalYearFromDate(replacementDate);
  const replacementFiscalYear = remainingYears <= 0 ? currentFY : calculatedFY;

  const totalReplacementCost = Number(item.replacementCost || 0) + Number(item.installationLaborCost || 0);

  // If scheduledQuarter not provided, compute from replacementDate
  const scheduledQuarter = item.scheduledQuarter || (remainingYears <= 0 ? getQuarterFromDate(refDate) : getQuarterFromDate(replacementDate));

  return {
    ...item,
    ageYears,
    remainingYears,
    replacementFiscalYear,
    lifecycleStatus,
    totalReplacementCost,
    scheduledQuarter,
  };
}

/**
 * Aggregates fiscal year budget projections for 6 years (e.g., FY26 to FY31)
 */
export function calculateFiscalYearBudgets(items: AVItem[], baseYear?: number): FiscalYearBudget[] {
  const currentFY = getFiscalYearFromDate(SYSTEM_NOW);
  const currentYearNum = baseYear || parseInt(currentFY.replace('FY', ''), 10) || 2026;

  // Generate 6 years of projections: currentFY and next 5 years
  const fiscalYears: string[] = [];
  for (let i = 0; i < 6; i++) {
    fiscalYears.push(`FY${currentYearNum + i}`);
  }

  const budgetMap: Record<string, FiscalYearBudget> = {};
  fiscalYears.forEach((fy) => {
    budgetMap[fy] = {
      fiscalYear: fy,
      hardwareCost: 0,
      laborCost: 0,
      totalCost: 0,
      itemCount: 0,
      categories: {},
      items: [],
    };
  });

  items.forEach((item) => {
    // If overdue, place in the current fiscal year (urgent budget)
    let fy = item.replacementFiscalYear;
    if (!budgetMap[fy]) {
      // If beyond 6 years, cap or place in the last bucket if older
      const itemFYNum = parseInt(fy.replace('FY', ''), 10);
      if (itemFYNum < currentYearNum) {
        fy = fiscalYears[0];
      } else {
        // We can dynamically add or place in later bucket
        if (!budgetMap[fy]) {
          budgetMap[fy] = {
            fiscalYear: fy,
            hardwareCost: 0,
            laborCost: 0,
            totalCost: 0,
            itemCount: 0,
            categories: {},
            items: [],
          };
          fiscalYears.push(fy);
        }
      }
    }

    const b = budgetMap[fy];
    b.hardwareCost += Number(item.replacementCost || 0);
    b.laborCost += Number(item.installationLaborCost || 0);
    b.totalCost += item.totalReplacementCost;
    b.itemCount += 1;
    b.items.push(item);
    b.categories[item.category] = (b.categories[item.category] || 0) + item.totalReplacementCost;
  });

  return fiscalYears.map((fy) => budgetMap[fy]).filter(Boolean);
}

/**
 * Calculates next quarter expense projections with detailed breakdown
 */
export function calculateNextQuarterExpenses(items: AVItem[], targetQuarter?: string): QuarterExpense {
  const currentQuarter = getQuarterFromDate(SYSTEM_NOW);
  
  // Calculate default next quarter: e.g., if current is 2026-Q3, next is 2026-Q4
  let resolvedQuarter = targetQuarter;
  if (!resolvedQuarter) {
    const [yStr, qStr] = currentQuarter.split('-');
    const curYear = parseInt(yStr, 10);
    const curQ = parseInt(qStr.replace('Q', ''), 10);
    if (curQ === 4) {
      resolvedQuarter = `${curYear + 1}-Q1`;
    } else {
      resolvedQuarter = `${curYear}-Q${curQ + 1}`;
    }
  }

  // Filter items that have maintenance issues or are due for replacement in this quarter
  const quarterItems: AVItem[] = [];
  let replacementCost = 0;
  let maintenanceCost = 0;
  let overdueItemsCost = 0;

  items.forEach((item) => {
    let included = false;

    // Check if item is scheduled for replacement in this quarter or overdue
    if (item.scheduledQuarter === resolvedQuarter) {
      quarterItems.push(item);
      replacementCost += item.totalReplacementCost;
      included = true;
    } else if (item.lifecycleStatus === 'Past Lifespan / Overdue' && (item.maintenanceStatus === 'Requires Service' || item.maintenanceStatus === 'Out of Service')) {
      // Overdue items that are failing require immediate next quarter funding
      quarterItems.push(item);
      overdueItemsCost += item.totalReplacementCost;
      included = true;
    } else if (item.maintenanceStatus === 'Scheduled Repair' || item.maintenanceStatus === 'Requires Service') {
      // Standard repair cost estimate (roughly 10-15% of replacement cost or minimum $250)
      const estimatedRepair = Math.max(250, Math.round(item.replacementCost * 0.12));
      quarterItems.push(item);
      maintenanceCost += estimatedRepair;
      included = true;
    }
  });

  const totalProjectedCost = replacementCost + maintenanceCost + overdueItemsCost;

  return {
    quarter: resolvedQuarter,
    label: getQuarterLabel(resolvedQuarter),
    totalProjectedCost,
    replacementCost,
    maintenanceCost,
    overdueItemsCost,
    itemCount: quarterItems.length,
    items: quarterItems,
  };
}

/**
 * Computes high-level fleet statistics
 */
export function calculateInventoryStats(items: AVItem[]): InventoryStats {
  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      totalFleetReplacementValue: 0,
      nextFiscalYearBudget: 0,
      nextQuarterProjectedExpense: 0,
      overdueCount: 0,
      nearingEolCount: 0,
      activeIssuesCount: 0,
      outOfServiceCount: 0,
      averageAgeYears: 0,
    };
  }

  let totalFleetReplacementValue = 0;
  let overdueCount = 0;
  let nearingEolCount = 0;
  let activeIssuesCount = 0;
  let outOfServiceCount = 0;
  let totalAge = 0;

  items.forEach((item) => {
    totalFleetReplacementValue += item.totalReplacementCost;
    totalAge += item.ageYears;

    if (item.lifecycleStatus === 'Past Lifespan / Overdue') {
      overdueCount++;
    } else if (item.lifecycleStatus === 'Nearing End of Life') {
      nearingEolCount++;
    }

    if (item.activeIssue && item.activeIssue !== 'None' && item.activeIssue.trim() !== '') {
      activeIssuesCount++;
    }

    if (item.maintenanceStatus === 'Out of Service') {
      outOfServiceCount++;
    }
  });

  const averageAgeYears = Math.round((totalAge / totalItems) * 10) / 10;

  // Next Fiscal Year Budget
  const currentFY = getFiscalYearFromDate(SYSTEM_NOW);
  const budgets = calculateFiscalYearBudgets(items);
  const nextFYBudget = budgets.find((b) => b.fiscalYear === currentFY)?.totalCost || 0;

  // Next Quarter Projected Expense
  const nextQ = calculateNextQuarterExpenses(items);

  return {
    totalItems,
    totalFleetReplacementValue,
    nextFiscalYearBudget: nextFYBudget,
    nextQuarterProjectedExpense: nextQ.totalProjectedCost,
    overdueCount,
    nearingEolCount,
    activeIssuesCount,
    outOfServiceCount,
    averageAgeYears,
  };
}

/**
 * Groups individual AV equipment into whole-room integrated packages.
 * In college AV, rooms are typically overhauled as a complete bundled package,
 * with individual components swapped out early only if they fail prematurely.
 */
export function groupItemsIntoClassroomPackages(items: AVItem[]): ClassroomPackage[] {
  const roomMap: Record<string, AVItem[]> = {};

  items.forEach((item) => {
    const key = `${item.building}::${item.room}`;
    if (!roomMap[key]) {
      roomMap[key] = [];
    }
    roomMap[key].push(item);
  });

  const packages: ClassroomPackage[] = [];

  Object.entries(roomMap).forEach(([key, roomItems]) => {
    const [building, roomName] = key.split('::');

    let totalHardwareCost = 0;
    let totalLaborCost = 0;
    const activeIssues: string[] = [];
    const prematureSwaps: AVItem[] = [];
    let hasCriticalFailure = false;

    // Find anchor equipment (projector, interactive display, or matrix switcher) to determine room overhaul cycle
    const anchorItem = roomItems.find((it) =>
      it.category.includes('Projector') ||
      it.category.includes('Touch') ||
      it.category.includes('Matrix') ||
      it.category.includes('Panel')
    ) || roomItems[0];

    // Determine oldest install date in the room as the basis for room age
    const sortedDates = roomItems
      .map((it) => it.installDate)
      .filter(Boolean)
      .sort();
    const lastOverhaulDate = sortedDates[0] || '2021-08-01';

    // Room overhaul cycle (default 6 years for college classrooms)
    const shelflifeYears = anchorItem?.shelflifeYears || 6;

    // Projected FY for the entire room overhaul
    const projectedFiscalYear = anchorItem?.replacementFiscalYear || getFiscalYearFromDate(SYSTEM_NOW);

    roomItems.forEach((item) => {
      totalHardwareCost += Number(item.replacementCost || 0);
      totalLaborCost += Number(item.installationLaborCost || 0);

      if (item.maintenanceStatus === 'Out of Service' || item.issueSeverity === 'Critical') {
        hasCriticalFailure = true;
      }

      if (item.activeIssue && item.activeIssue !== 'None' && item.activeIssue.trim() !== '') {
        activeIssues.push(`${item.category}: ${item.activeIssue}`);
      }

      // Check if this component needs premature replacement ahead of the master room overhaul
      const isPastOrFailing =
        item.lifecycleStatus === 'Past Lifespan / Overdue' ||
        item.maintenanceStatus === 'Requires Service' ||
        item.maintenanceStatus === 'Out of Service';

      if (isPastOrFailing && item.replacementFiscalYear !== projectedFiscalYear) {
        prematureSwaps.push(item);
      }
    });

    const totalPackageCost = totalHardwareCost + totalLaborCost;

    // Overall condition
    let overallCondition: any = 'Good';
    if (hasCriticalFailure) overallCondition = 'Critical';
    else if (roomItems.some((it) => it.condition === 'Poor')) overallCondition = 'Poor';
    else if (roomItems.some((it) => it.condition === 'Fair')) overallCondition = 'Fair';
    else if (roomItems.every((it) => it.condition === 'Excellent')) overallCondition = 'Excellent';

    // Summary of primary equipment
    const categoriesPresent = Array.from(new Set(roomItems.map((it) => it.category)));
    const primaryEquipmentSummary = categoriesPresent.slice(0, 3).join(' + ') +
      (categoriesPresent.length > 3 ? ` + ${categoriesPresent.length - 3} more` : '');

    // Target season
    const targetSeason = anchorItem?.scheduledQuarter?.includes('Q3')
      ? 'Summer Recess Overhaul'
      : anchorItem?.scheduledQuarter?.includes('Q4')
      ? 'Winter Break Overhaul'
      : 'Mid-Year Upgrade Window';

    packages.push({
      roomName,
      building,
      items: roomItems,
      itemCount: roomItems.length,
      totalHardwareCost,
      totalLaborCost,
      totalPackageCost,
      lastOverhaulDate,
      shelflifeYears,
      projectedFiscalYear,
      scheduledQuarter: anchorItem?.scheduledQuarter || '2027-Q3',
      targetSeason,
      overallCondition,
      hasCriticalFailure,
      activeIssues,
      prematureSwaps,
      primaryEquipmentSummary,
    });
  });

  return packages.sort((a, b) => b.totalPackageCost - a.totalPackageCost);
}

