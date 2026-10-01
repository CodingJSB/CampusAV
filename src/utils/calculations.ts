import { AVItem, ClassroomPackage, FiscalYearBudget, InventoryStats, LifecycleStatus, QuarterExpense, BudgetPlanningMode } from '../types/inventory';

// Reference date for calculations (defaults to current date, or fallback to current simulation time)
export const SYSTEM_NOW = new Date();

/**
 * Standard baseline turnkey renovation cost benchmarks by space type (Option B fallback).
 * Represents total classroom project costs (hardware, infrastructure, millwork, cabling, commissioning).
 */
export function getStandardRoomBaselineCost(spaceType?: string): number {
  const s = String(spaceType || '').toLowerCase();
  if (s.includes('lecture') || s.includes('auditorium') || s.includes('hall') || s.includes('tiered')) {
    return 90000;
  }
  if (s.includes('lab') || s.includes('active') || s.includes('studio') || s.includes('tl') || s.includes('computer')) {
    return 55000;
  }
  if (s.includes('conf') || s.includes('board') || s.includes('meeting')) {
    return 25000;
  }
  if (s.includes('seminar') || s.includes('small')) {
    return 30000;
  }
  // Standard General Classroom baseline
  return 35000;
}

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
 * Calculate age in decimal years from installDate or 4-digit installYear to reference date.
 */
export function calculateAgeInYears(installDateStr?: string | number, refDate: Date = SYSTEM_NOW): number {
  if (!installDateStr) return 0;
  const str = String(installDateStr).trim();

  // If 4-digit year like "2021" or 2021
  if (/^(19|20)\d{2}$/.test(str)) {
    const year = parseInt(str, 10);
    // Academic installation defaults to July 1 of that year
    const installDate = new Date(year, 6, 1);
    const diffMs = refDate.getTime() - installDate.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.round(diffYears * 10) / 10);
  }

  const installDate = new Date(str);
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
  // Normalize installYear and installDate
  const rawInstallYear = item.installYear || (item.installDate && /^(19|20)\d{2}/.test(String(item.installDate)) ? parseInt(String(item.installDate).slice(0, 4), 10) : 2022);
  const installYear = isNaN(Number(rawInstallYear)) ? 2022 : Number(rawInstallYear);
  const installDate = item.installDate && String(item.installDate).length > 4 ? String(item.installDate) : `${installYear}-07-01`;

  const ageYears = calculateAgeInYears(installDate, refDate);
  const remainingYears = Math.round((item.shelflifeYears - ageYears) * 10) / 10;
  
  let lifecycleStatus: LifecycleStatus = 'Mid-Lifecycle';
  if (remainingYears <= 0) {
    lifecycleStatus = 'Past Lifespan / Overdue';
  } else if (remainingYears <= 1.0) {
    lifecycleStatus = 'Nearing End of Life';
  } else if (ageYears <= 2.0) {
    lifecycleStatus = 'Optimal';
  }

  // Calculate projected replacement date: installYear + shelflifeYears
  const replacementYear = installYear + (item.shelflifeYears || 6);
  const replacementDate = new Date(replacementYear, 6, 1);

  // If already overdue, it is budgeted for the current fiscal year
  const currentFY = getFiscalYearFromDate(refDate);
  const calculatedFY = getFiscalYearFromDate(replacementDate);
  const replacementFiscalYear = remainingYears <= 0 ? currentFY : calculatedFY;

  const totalReplacementCost = Number(item.replacementCost || 0) + Number(item.installationLaborCost || 0);

  // If scheduledQuarter not provided, compute from replacementDate (Summer Q3 overhaul)
  const scheduledQuarter = item.scheduledQuarter || (remainingYears <= 0 ? getQuarterFromDate(refDate) : `${replacementYear}-Q3`);

  return {
    ...item,
    installYear,
    installDate,
    ageYears,
    remainingYears,
    replacementFiscalYear,
    lifecycleStatus,
    totalReplacementCost,
    scheduledQuarter,
  };
}

/**
 * Computes the Room Equipment Agedness & Readiness Composite Index (0–100).
 * Weighted by component replacement cost so major items (projector, switcher, DSP)
 * carry proportional influence over the overall readiness of the room.
 */
export function calculateRoomReadinessScore(roomItems: AVItem[], refDate: Date = SYSTEM_NOW): {
  score: number;
  rating: 'Optimal' | 'Good' | 'Fair' | 'Critical / Due';
  averageAge: number;
  newestAge: number;
  oldestAge: number;
} {
  if (!roomItems || roomItems.length === 0) {
    return { score: 100, rating: 'Optimal', averageAge: 0, newestAge: 0, oldestAge: 0 };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let sumAge = 0;
  let minAge = 999;
  let maxAge = 0;

  roomItems.forEach((item) => {
    const age = calculateAgeInYears(item.installDate, refDate);
    sumAge += age;
    if (age < minAge) minAge = age;
    if (age > maxAge) maxAge = age;

    const shelf = Math.max(1, item.shelflifeYears || 6);
    // Fractional remaining shelf life from 1.0 (fresh) down to 0 (EOL/overdue)
    const remainingFraction = Math.max(0, (shelf - age) / shelf);
    let itemScore = remainingFraction * 100;

    // Deductions for hardware faults / maintenance flags
    if (item.maintenanceStatus === 'Out of Service' || item.issueSeverity === 'Critical') {
      itemScore = Math.min(itemScore, 10);
    } else if (item.maintenanceStatus === 'Requires Service' || item.maintenanceStatus === 'Scheduled Repair') {
      itemScore = Math.max(0, itemScore - 30);
    } else if (item.condition === 'Poor') {
      itemScore = Math.max(0, itemScore - 20);
    }

    // Weight by replacement cost (major equipment carries higher impact on classroom functionality)
    const weight = Math.max(500, Number(item.totalReplacementCost || item.replacementCost || 500));
    totalWeightedScore += itemScore * weight;
    totalWeight += weight;
  });

  const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 75;
  const clampedScore = Math.max(0, Math.min(100, finalScore));

  let rating: 'Optimal' | 'Good' | 'Fair' | 'Critical / Due' = 'Good';
  if (clampedScore >= 80) rating = 'Optimal';
  else if (clampedScore >= 60) rating = 'Good';
  else if (clampedScore >= 40) rating = 'Fair';
  else rating = 'Critical / Due';

  const averageAge = Math.round((sumAge / roomItems.length) * 10) / 10;
  const newestAge = minAge === 999 ? 0 : Math.round(minAge * 10) / 10;
  const oldestAge = Math.round(maxAge * 10) / 10;

  return {
    score: clampedScore,
    rating,
    averageAge,
    newestAge,
    oldestAge,
  };
}

/**
 * Aggregates fiscal year budget projections across all forecasted years chronologically.
 * Supports both Whole-Room Turnkey Renovation (Inflation-Adjusted) and Individual Component Swaps.
 */
export function calculateFiscalYearBudgets(
  items: AVItem[],
  baseYear?: number,
  planningMode: BudgetPlanningMode = 'whole_room',
  classroomPackages?: ClassroomPackage[]
): FiscalYearBudget[] {
  const currentFY = getFiscalYearFromDate(SYSTEM_NOW);
  const currentYearNum = baseYear || parseInt(currentFY.replace('FY', ''), 10) || 2026;

  // Determine maximum projected year across all items and packages
  let maxYearNum = currentYearNum + 5;
  items.forEach((item) => {
    if (item.replacementFiscalYear) {
      const parsedYear = parseInt(item.replacementFiscalYear.replace('FY', ''), 10);
      if (!isNaN(parsedYear) && parsedYear > maxYearNum) {
        maxYearNum = parsedYear;
      }
    }
  });

  if (classroomPackages) {
    classroomPackages.forEach((pkg) => {
      const parsedYear = parseInt(pkg.projectedFiscalYear.replace('FY', ''), 10);
      if (!isNaN(parsedYear) && parsedYear > maxYearNum) {
        maxYearNum = parsedYear;
      }
    });
  }

  // Generate continuous chronological fiscal years from current year to max projected year
  const fiscalYears: string[] = [];
  for (let y = currentYearNum; y <= maxYearNum; y++) {
    fiscalYears.push(`FY${y}`);
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
      planningMode,
      wholeRoomCost: 0,
      wholeRoomCount: 0,
      inflationDelta: 0,
      roomPackages: [],
    };
  });

  if (planningMode === 'whole_room' && classroomPackages && classroomPackages.length > 0) {
    // 1. WHOLE-ROOM TURNKEY RENOVATIONS (Compounded 5% Inflation)
    classroomPackages.forEach((pkg) => {
      let fy = pkg.projectedFiscalYear || fiscalYears[0];
      const pkgFYNum = parseInt(fy.replace('FY', ''), 10);
      if (isNaN(pkgFYNum) || pkgFYNum < currentYearNum) {
        fy = fiscalYears[0];
      } else if (pkgFYNum > maxYearNum) {
        fy = fiscalYears[fiscalYears.length - 1];
      }

      if (!budgetMap[fy]) {
        budgetMap[fy] = {
          fiscalYear: fy,
          hardwareCost: 0,
          laborCost: 0,
          totalCost: 0,
          itemCount: 0,
          categories: {},
          items: [],
          planningMode,
          wholeRoomCost: 0,
          wholeRoomCount: 0,
          inflationDelta: 0,
          roomPackages: [],
        };
        if (!fiscalYears.includes(fy)) fiscalYears.push(fy);
      }

      const b = budgetMap[fy];
      b.wholeRoomCost = (b.wholeRoomCost || 0) + pkg.projectedOverhaulCost;
      b.wholeRoomCount = (b.wholeRoomCount || 0) + 1;
      b.inflationDelta = (b.inflationDelta || 0) + pkg.inflationDeltaCost;
      b.totalCost += pkg.projectedOverhaulCost;
      b.hardwareCost += pkg.totalHardwareCost;
      // Remainder represents integration, commissioning, infrastructure & inflation
      b.laborCost += Math.max(0, pkg.projectedOverhaulCost - pkg.totalHardwareCost);
      b.itemCount += pkg.itemCount;
      b.roomPackages?.push(pkg);
      pkg.items.forEach((it) => {
        b.items.push(it);
        b.categories[it.category] = (b.categories[it.category] || 0) + it.totalReplacementCost;
      });
    });

    // 2. Add premature urgent repairs (items that fail prior to the room's master overhaul year)
    classroomPackages.forEach((pkg) => {
      pkg.prematureSwaps.forEach((swapItem) => {
        let swapFY = swapItem.replacementFiscalYear || fiscalYears[0];
        const swapFYNum = parseInt(swapFY.replace('FY', ''), 10);
        if (isNaN(swapFYNum) || swapFYNum < currentYearNum) {
          swapFY = fiscalYears[0];
        }
        if (budgetMap[swapFY] && swapFY !== pkg.projectedFiscalYear) {
          const b = budgetMap[swapFY];
          b.hardwareCost += Number(swapItem.replacementCost || 0);
          b.laborCost += Number(swapItem.installationLaborCost || 0);
          b.totalCost += swapItem.totalReplacementCost;
          b.itemCount += 1;
          if (!b.items.some((it) => it.id === swapItem.id)) {
            b.items.push(swapItem);
          }
        }
      });
    });
  } else {
    // INDIVIDUAL COMPONENT LINE-ITEM REPLACEMENTS
    items.forEach((item) => {
      let fy = item.replacementFiscalYear || fiscalYears[0];
      const itemFYNum = parseInt(fy.replace('FY', ''), 10);
      if (isNaN(itemFYNum) || itemFYNum < currentYearNum) {
        fy = fiscalYears[0];
      } else if (itemFYNum > maxYearNum) {
        fy = fiscalYears[fiscalYears.length - 1];
      }

      if (!budgetMap[fy]) {
        budgetMap[fy] = {
          fiscalYear: fy,
          hardwareCost: 0,
          laborCost: 0,
          totalCost: 0,
          itemCount: 0,
          categories: {},
          items: [],
          planningMode,
          wholeRoomCost: 0,
          wholeRoomCount: 0,
          inflationDelta: 0,
          roomPackages: [],
        };
        if (!fiscalYears.includes(fy)) {
          fiscalYears.push(fy);
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
  }

  // Sort strictly in ascending chronological order
  fiscalYears.sort((a, b) => parseInt(a.replace('FY', ''), 10) - parseInt(b.replace('FY', ''), 10));

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
export function calculateInventoryStats(
  items: AVItem[],
  planningMode: BudgetPlanningMode = 'whole_room',
  classroomPackages?: ClassroomPackage[]
): InventoryStats {
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

  // Next Fiscal Year Budget based on active planning mode
  const currentFY = getFiscalYearFromDate(SYSTEM_NOW);
  const budgets = calculateFiscalYearBudgets(items, undefined, planningMode, classroomPackages);
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
export function groupItemsIntoClassroomPackages(items: AVItem[], inflationRate: number = 0.05): ClassroomPackage[] {
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

    const roomFriendlyName = roomItems[0]?.roomName;
    const roomDisplayName = roomFriendlyName && roomFriendlyName !== 'Classroom' ? `${roomName} (${roomFriendlyName})` : roomName;
    const spaceType = roomItems[0]?.spaceType || '';
    const vendor = roomItems[0]?.vendor || 'AVC';

    // 1. Historical Renovation Tracking: Last Renovation Year & Baseline Project Cost
    const explicitYear = roomItems.find((it) => it.roomLastRenovationYear)?.roomLastRenovationYear;
    const oldestInstallYear = parseInt(lastOverhaulDate.slice(0, 4), 10) || 2021;
    const lastRenovationYear = explicitYear || oldestInstallYear;

    const explicitCost = roomItems.find((it) => it.roomBaselineCost && it.roomBaselineCost > 0)?.roomBaselineCost;
    const isDefaultBaselineCost = !explicitCost;
    // If not explicitly set in CSV or modal, fallback to Option (B) standard space-type benchmark
    const lastRenovationCost = explicitCost || getStandardRoomBaselineCost(spaceType);

    // 2. Compounding Inflation Forecasting: (1 + inflationRate)^years
    const projectedFYNum = parseInt(projectedFiscalYear.replace('FY', ''), 10) || (lastRenovationYear + shelflifeYears);
    const deltaYears = Math.max(0, projectedFYNum - lastRenovationYear);
    const inflationFactor = Math.pow(1 + inflationRate, deltaYears);
    const projectedOverhaulCost = Math.round(lastRenovationCost * inflationFactor);
    const inflationDeltaCost = Math.max(0, projectedOverhaulCost - lastRenovationCost);

    // 3. Room Equipment Agedness & Readiness Composite Index (0–100)
    const readiness = calculateRoomReadinessScore(roomItems);

    // Populate calculated fields back onto room items for reporting & CSV export
    roomItems.forEach((it) => {
      it.roomLastRenovationYear = lastRenovationYear;
      it.roomBaselineCost = lastRenovationCost;
      it.roomProjectedOverhaulCost = projectedOverhaulCost;
      it.roomReadinessScore = readiness.score;
    });

    packages.push({
      roomName,
      roomDisplayName,
      building,
      spaceType,
      vendor,
      items: roomItems,
      itemCount: roomItems.length,
      totalHardwareCost,
      totalLaborCost,
      totalPackageCost,
      lastRenovationYear,
      lastRenovationCost,
      isDefaultBaselineCost,
      projectedOverhaulCost,
      inflationRate,
      inflationDeltaCost,
      readinessScore: readiness.score,
      readinessRating: readiness.rating,
      averageComponentAgeYears: readiness.averageAge,
      newestComponentAgeYears: readiness.newestAge,
      oldestComponentAgeYears: readiness.oldestAge,
      lastOverhaulDate,
      shelflifeYears,
      projectedFiscalYear,
      scheduledQuarter: anchorItem?.scheduledQuarter || `${projectedFYNum - 1}-Q3`,
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

