import {
  AVItem,
  ClassroomPackage,
  FiscalYearBudget,
  InventoryStats,
  LifecycleStatus,
  BudgetPlanningMode,
  PlanningScenario,
  ItemPlanningOverride,
  RoomPlanningOverride,
} from '../types/inventory';

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
  item: Omit<AVItem, 'ageYears' | 'remainingYears' | 'replacementFiscalYear' | 'lifecycleStatus' | 'totalReplacementCost' | 'mechanicalEOLYear' | 'mechanicalFiscalYear' | 'targetFiscalYear' | 'isOverdue' | 'deferralYears' | 'deferralRiskLevel'> & Partial<AVItem>,
  refDate: Date = SYSTEM_NOW
): AVItem {
  // Normalize installYear and installDate
  const rawInstallYear = item.installYear || (item.installDate && /^(19|20)\d{2}/.test(String(item.installDate)) ? parseInt(String(item.installDate).slice(0, 4), 10) : 2022);
  const installYear = isNaN(Number(rawInstallYear)) ? 2022 : Number(rawInstallYear);
  const installDate = item.installDate && String(item.installDate).length > 4 ? String(item.installDate) : `${installYear}-07-01`;

  const ageYears = calculateAgeInYears(installDate, refDate);
  const remainingYears = Math.round((item.shelflifeYears - ageYears) * 10) / 10;
  
  // Physical hardware lifecycle status - STRICTLY independent of financial planning year
  let lifecycleStatus: LifecycleStatus = 'Mid-Lifecycle';
  if (remainingYears <= 0) {
    lifecycleStatus = 'Past Lifespan / Overdue';
  } else if (remainingYears <= 1.0) {
    lifecycleStatus = 'Nearing End of Life';
  } else if (ageYears <= 2.0) {
    lifecycleStatus = 'Optimal';
  }

  // 1. Mechanical EOL: installYear + shelflifeYears
  const mechanicalEOLYear = installYear + (item.shelflifeYears || 6);
  const mechanicalDate = new Date(mechanicalEOLYear, 6, 1);
  const calculatedFY = getFiscalYearFromDate(mechanicalDate);
  const currentFY = getFiscalYearFromDate(refDate);

  const isOverdue = remainingYears <= 0 || mechanicalEOLYear <= refDate.getFullYear();
  const mechanicalFiscalYear = isOverdue ? `${calculatedFY} (Overdue)` : calculatedFY;

  // 2. Financial Target Fiscal Year: defaults to item.targetFiscalYear or replacementFiscalYear or mechanical
  let targetFiscalYear = item.targetFiscalYear || item.replacementFiscalYear;
  if (!targetFiscalYear) {
    targetFiscalYear = isOverdue ? currentFY : calculatedFY;
  }
  // Ensure targetFiscalYear does not contain "(Overdue)" suffix when scheduling into future financial buckets
  targetFiscalYear = targetFiscalYear.replace(/\s*\(Overdue\)/i, '').trim();

  // Active replacement fiscal year reflects the scheduled financial year
  const replacementFiscalYear = targetFiscalYear;

  // 3. Deferral Calculation
  const targetYearNum = parseInt(targetFiscalYear.replace('FY', ''), 10) || mechanicalEOLYear;
  const deferralYears = Math.max(-5, targetYearNum - mechanicalEOLYear);

  let deferralRiskLevel: 'None' | 'Moderate' | 'High' | 'Severe' = 'None';
  if (isOverdue) {
    if (deferralYears >= 2 || item.maintenanceStatus === 'Out of Service' || item.issueSeverity === 'Critical') {
      deferralRiskLevel = 'Severe';
    } else if (deferralYears > 0) {
      deferralRiskLevel = 'High';
    } else {
      deferralRiskLevel = 'Moderate';
    }
  } else if (deferralYears >= 2) {
    deferralRiskLevel = 'Moderate';
  }

  const totalReplacementCost = Number(item.replacementCost || 0) + Number(item.installationLaborCost || 0);

  return {
    ...item,
    installYear,
    installDate,
    ageYears,
    remainingYears,
    replacementFiscalYear,
    targetFiscalYear,
    mechanicalEOLYear,
    mechanicalFiscalYear,
    isOverdue,
    deferralYears,
    deferralRiskLevel,
    lifecycleStatus,
    totalReplacementCost,
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

export interface RoomReadinessExplanation {
  score: number;
  rating: 'Optimal' | 'Good' | 'Fair' | 'Critical / Due';
  level: 'green' | 'yellow' | 'red';
  levelLabel: string; // e.g. "Optimal / Good (Green)", "Fair / Moderate (Yellow)", "Critical / Due (Red)"
  colorCode: {
    badgeBg: string;
    badgeText: string;
    border: string;
    hex: string;
  };
  summary: string;
  lifecycleFactor: string;
  maintenanceFactor: string;
  weightingFactor: string;
  actionRecommendation: string;
}

/**
 * Returns a clear, structured explanation of how a classroom's composite readiness score
 * was calculated based on its specific component ages, shelf-life, maintenance flags, and replacement costs.
 */
export function getRoomReadinessExplanation(pkg: ClassroomPackage): RoomReadinessExplanation {
  const score = pkg.readinessScore;
  let level: 'green' | 'yellow' | 'red' = 'green';
  let levelLabel = 'Optimal / Good (Green)';
  let colorCode = {
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    border: 'border-emerald-300',
    hex: '#16A34A',
  };

  if (score >= 60) {
    level = 'green';
    levelLabel = score >= 80 ? 'Optimal (Green)' : 'Good (Green)';
    colorCode = {
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      border: 'border-emerald-300',
      hex: '#16A34A',
    };
  } else if (score >= 40) {
    level = 'yellow';
    levelLabel = 'Fair / Moderate (Yellow)';
    colorCode = {
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      border: 'border-amber-300',
      hex: '#D97706',
    };
  } else {
    level = 'red';
    levelLabel = 'Critical / Due (Red)';
    colorCode = {
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      border: 'border-rose-300',
      hex: '#DC2626',
    };
  }

  const avgAge = pkg.averageComponentAgeYears;
  const cycle = pkg.shelflifeYears || 6;
  const remainingLifePct = Math.max(0, Math.round(((cycle - avgAge) / cycle) * 100));

  let lifecycleFactor = `Average component age is ${avgAge} yrs vs a ${cycle}-yr academic overhaul cycle (~${remainingLifePct}% remaining shelf-life).`;
  if (pkg.oldestComponentAgeYears >= cycle) {
    lifecycleFactor += ` Oldest anchor unit is ${pkg.oldestComponentAgeYears} yrs old (overdue for refresh).`;
  } else {
    lifecycleFactor += ` Oldest component is ${pkg.oldestComponentAgeYears} yrs; newest component is ${pkg.newestComponentAgeYears} yrs.`;
  }

  // Maintenance & hardware health deductions
  const deductions: string[] = [];
  const outOfServiceItems = pkg.items.filter((it) => it.maintenanceStatus === 'Out of Service' || it.issueSeverity === 'Critical');
  const serviceItems = pkg.items.filter((it) => it.maintenanceStatus === 'Requires Service' || it.maintenanceStatus === 'Scheduled Repair');
  const poorItems = pkg.items.filter((it) => it.condition === 'Poor');

  if (outOfServiceItems.length > 0) {
    const names = outOfServiceItems.map((i) => `${i.category} (${i.makeModel})`).join(', ');
    deductions.push(`Out-of-Service / Critical item [${names}] caps individual device score at 10%.`);
  }
  if (serviceItems.length > 0) {
    const names = serviceItems.map((i) => `${i.category}`).join(', ');
    deductions.push(`-30 pt maintenance penalty applied for active repair ticket on ${names}.`);
  }
  if (poorItems.length > 0) {
    deductions.push(`-20 pt physical condition deduction applied for ${poorItems.length} unit in Poor condition.`);
  }

  let maintenanceFactor = '';
  if (deductions.length > 0) {
    maintenanceFactor = deductions.join(' ');
  } else {
    maintenanceFactor = `All ${pkg.itemCount} devices operational with zero open maintenance tickets and ${pkg.overallCondition.toLowerCase()} physical condition.`;
  }

  const weightingFactor = `Individual component scores are weighted by hardware replacement value ($${pkg.totalPackageCost.toLocaleString()} total package value across ${pkg.itemCount} assets), ensuring high-impact display and switching equipment dominate classroom readiness.`;

  // Brief combined summary explanation
  let summary = '';
  let actionRecommendation = '';

  if (level === 'green') {
    if (deductions.length === 0) {
      summary = `Score of ${score}/100: Healthy operational lifecycle with ${remainingLifePct}% remaining shelf-life (${avgAge} yrs avg age vs ${cycle}-yr cycle). All ${pkg.itemCount} components operational with zero open service tickets. Weighted by $${pkg.totalPackageCost.toLocaleString()} replacement value.`;
      actionRecommendation = `Operating within optimal parameters. Maintain standard preventative maintenance.`;
    } else {
      summary = `Score of ${score}/100: Good baseline age (${avgAge} yrs avg) with minor service penalty: ${deductions[0]}. Weighted by $${pkg.totalPackageCost.toLocaleString()} replacement value.`;
      actionRecommendation = `Resolve minor pending service ticket to return room to optimal status.`;
    }
  } else if (level === 'yellow') {
    if (deductions.length > 0) {
      summary = `Score of ${score}/100: Impacted by active maintenance flags (${deductions[0]}) combined with mid-to-late lifecycle hardware (${avgAge} yrs avg age vs ${cycle}-yr cycle). Weighted by $${pkg.totalPackageCost.toLocaleString()} replacement value.`;
      actionRecommendation = `Dispatch technician for active repairs and monitor for upcoming ${pkg.projectedFiscalYear} capital retrofit.`;
    } else {
      summary = `Score of ${score}/100: Hardware nearing end of useful lifespan (~${remainingLifePct}% shelf-life remaining, oldest component ${pkg.oldestComponentAgeYears} yrs). Weighted by $${pkg.totalPackageCost.toLocaleString()} replacement value.`;
      actionRecommendation = `Prioritize room for overhaul in ${pkg.projectedFiscalYear} budget allocation.`;
    }
  } else {
    // Red
    if (outOfServiceItems.length > 0) {
      summary = `Critical Score of ${score}/100: Immediate classroom disruption! Contains ${outOfServiceItems.length} Out-of-Service / Critical device (${outOfServiceItems.map((i) => i.category).join(', ')}) capping score, plus ${avgAge} yrs avg equipment age. Heavy weighting on failed primary equipment ($${pkg.totalPackageCost.toLocaleString()} room value).`;
      actionRecommendation = `Immediate field intervention required. Expedite component swap or emergency overhaul.`;
    } else {
      summary = `Critical Score of ${score}/100: Classroom hardware severely past academic shelf-life (${avgAge} yrs avg age exceeds ${cycle}-yr cycle, oldest ${pkg.oldestComponentAgeYears} yrs). High risk of unannounced in-class failure across $${pkg.totalPackageCost.toLocaleString()} fleet value.`;
      actionRecommendation = `Include in highest priority Tier 1 CapEx replacement request for immediate funding.`;
    }
  }

  return {
    score,
    rating: pkg.readinessRating,
    level,
    levelLabel,
    colorCode,
    summary,
    lifecycleFactor,
    maintenanceFactor,
    weightingFactor,
    actionRecommendation,
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
  classroomPackages?: ClassroomPackage[],
  annualBudgetCeiling?: number
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
      annualBudgetCeiling,
      ceilingVariance: annualBudgetCeiling ? annualBudgetCeiling : undefined,
      isOverCeiling: false,
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
          annualBudgetCeiling,
          ceilingVariance: annualBudgetCeiling ? annualBudgetCeiling : undefined,
          isOverCeiling: false,
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
          annualBudgetCeiling,
          ceilingVariance: annualBudgetCeiling ? annualBudgetCeiling : undefined,
          isOverCeiling: false,
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

  // Calculate variances against annualBudgetCeiling
  Object.values(budgetMap).forEach((b) => {
    if (annualBudgetCeiling !== undefined && annualBudgetCeiling > 0) {
      b.annualBudgetCeiling = annualBudgetCeiling;
      b.ceilingVariance = annualBudgetCeiling - b.totalCost;
      b.isOverCeiling = b.totalCost > annualBudgetCeiling;
    }
  });

  // Sort strictly in ascending chronological order
  fiscalYears.sort((a, b) => parseInt(a.replace('FY', ''), 10) - parseInt(b.replace('FY', ''), 10));

  return fiscalYears.map((fy) => budgetMap[fy]).filter(Boolean);
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

  return {
    totalItems,
    totalFleetReplacementValue,
    nextFiscalYearBudget: nextFYBudget,
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
export function groupItemsIntoClassroomPackages(
  items: AVItem[],
  inflationRate: number = 0.05,
  refDate: Date = SYSTEM_NOW
): ClassroomPackage[] {
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

    // Target overhaul window
    const targetSeason = 'Annual Summer Recess Overhaul';

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

    // 2. Compounding Inflation Forecasting: (1 + inflationRate)^years from CURRENT YEAR (2026)
    const baseYear = (refDate || SYSTEM_NOW).getFullYear() || 2026;
    const projectedFYNum = parseInt(projectedFiscalYear.replace('FY', ''), 10) || baseYear;
    const deltaYears = Math.max(0, projectedFYNum - baseYear);
    const inflationFactor = Math.pow(1 + inflationRate, deltaYears);
    const projectedOverhaulCost = Math.round(lastRenovationCost * inflationFactor);
    const inflationDeltaCost = Math.max(0, projectedOverhaulCost - lastRenovationCost);

    // 3. Room Equipment Agedness & Readiness Composite Index (0–100)
    const readiness = calculateRoomReadinessScore(roomItems);

    // Decoupled mechanical vs target fiscal years for classroom package
    const mechanicalFiscalYear = anchorItem?.mechanicalFiscalYear || anchorItem?.replacementFiscalYear || getFiscalYearFromDate(SYSTEM_NOW);
    const targetFiscalYear = anchorItem?.targetFiscalYear || anchorItem?.replacementFiscalYear || projectedFiscalYear;
    const isOverdue = anchorItem?.isOverdue || roomItems.some((it) => it.isOverdue);
    const deferralYears = anchorItem?.deferralYears || 0;
    const planningPriority = anchorItem?.planningPriority || roomItems.find((it) => it.planningPriority)?.planningPriority || 'Standard';

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
      baseYear,
      inflationYears: deltaYears,
      readinessScore: readiness.score,
      readinessRating: readiness.rating,
      averageComponentAgeYears: readiness.averageAge,
      newestComponentAgeYears: readiness.newestAge,
      oldestComponentAgeYears: readiness.oldestAge,
      lastOverhaulDate,
      shelflifeYears,
      projectedFiscalYear,
      mechanicalFiscalYear,
      targetFiscalYear,
      isOverdue,
      deferralYears,
      planningPriority,
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

/**
 * Creates the default immutable Mechanical Baseline scenario
 */
export function createDefaultBaselineScenario(): PlanningScenario {
  return {
    id: 'baseline',
    name: 'Baseline (Mechanical EOL)',
    description: 'Hardware lifecycle reality based strictly on physical installation dates and predetermined equipment shelf-life.',
    isBaseline: true,
    annualBudgetCeiling: 250000,
    inflationRate: 0.05,
    itemOverrides: {},
    roomOverrides: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Merges immutable master items with scenario planning overrides without mutating master data
 */
export function resolveScenarioItems(
  masterItems: AVItem[],
  scenario: PlanningScenario,
  refDate: Date = SYSTEM_NOW
): AVItem[] {
  if (
    scenario.isBaseline ||
    (!Object.keys(scenario.itemOverrides).length && !Object.keys(scenario.roomOverrides).length)
  ) {
    return masterItems;
  }

  return masterItems.map((masterItem) => {
    const roomKey = `${masterItem.building}::${masterItem.room}`;
    const roomOverride = scenario.roomOverrides[roomKey];
    const itemOverride = scenario.itemOverrides[masterItem.id];

    if (!roomOverride && !itemOverride) {
      return masterItem;
    }

    const targetFiscalYear =
      itemOverride?.targetFiscalYear || roomOverride?.targetFiscalYear || masterItem.targetFiscalYear;
    const roomBaselineCost =
      roomOverride?.customBaselineCost !== undefined
        ? roomOverride.customBaselineCost
        : masterItem.roomBaselineCost;
    const planningPriority = itemOverride?.priority || roomOverride?.priority || masterItem.planningPriority;

    return enrichAVItem(
      {
        ...masterItem,
        targetFiscalYear,
        roomBaselineCost,
        planningPriority,
      },
      refDate
    );
  });
}

export interface LevelingMove {
  building: string;
  room: string;
  roomDisplayName: string;
  fromFY: string;
  toFY: string;
  cost: number;
  readinessScore: number;
  readinessRating: string;
  reason: string;
  hasCriticalFailure: boolean;
}

export interface LevelingProposal {
  proposedMoves: LevelingMove[];
  proposedRoomOverrides: Record<string, RoomPlanningOverride>;
  initialOverCeilingCount: number;
  remainingOverCeilingCount: number;
}

/**
 * 1-Click Automated Budget Leveling / Triage Engine:
 * Analyzes scheduled project costs across fiscal years against the annualBudgetCeiling.
 * Deferral candidates are prioritized by high readiness scores (healthy rooms deferred first),
 * while protecting critical failures and high-risk rooms from being pushed back.
 */
export function generateLevelingProposal(
  packages: ClassroomPackage[],
  annualBudgetCeiling: number,
  baseYear: number = 2026,
  horizonYears: number = 6
): LevelingProposal {
  const pkgCopies = packages.map((p) => ({
    ...p,
    currentScheduledFY: p.projectedFiscalYear,
  }));

  const horizonFYs: string[] = [];
  for (let i = 0; i < horizonYears; i++) {
    horizonFYs.push(`FY${baseYear + i}`);
  }

  const getYearSpend = () => {
    const map: Record<string, number> = {};
    horizonFYs.forEach((fy) => (map[fy] = 0));
    pkgCopies.forEach((pkg) => {
      const fy = pkg.currentScheduledFY;
      map[fy] = (map[fy] || 0) + pkg.projectedOverhaulCost;
    });
    return map;
  };

  const proposedMoves: LevelingMove[] = [];
  const proposedRoomOverrides: Record<string, RoomPlanningOverride> = {};

  let currentSpend = getYearSpend();
  const initialOverCeilingCount = horizonFYs.filter((fy) => (currentSpend[fy] || 0) > annualBudgetCeiling).length;

  for (let yIdx = 0; yIdx < horizonFYs.length - 1; yIdx++) {
    const currentFY = horizonFYs[yIdx];
    let spend = currentSpend[currentFY] || 0;

    if (spend <= annualBudgetCeiling) continue;

    const candidatesInYear = pkgCopies.filter((p) => p.currentScheduledFY === currentFY);

    // Filter out rooms that cannot be deferred:
    // Protect rooms with critical hardware failures, severe conditions (score < 40), or 'Critical' priority
    const deferrableRooms = candidatesInYear.filter(
      (p) => !p.hasCriticalFailure && p.readinessScore >= 40 && p.planningPriority !== 'Critical'
    );

    // Sort deferrable candidates by readiness score DESCENDING (healthiest rooms with highest readiness deferred first!)
    deferrableRooms.sort((a, b) => b.readinessScore - a.readinessScore);

    for (const roomPkg of deferrableRooms) {
      if ((currentSpend[currentFY] || 0) <= annualBudgetCeiling) {
        break;
      }

      // Search for subsequent FY with headroom below ceiling
      let targetFY: string | null = null;
      for (let nextIdx = yIdx + 1; nextIdx < horizonFYs.length; nextIdx++) {
        const candidateFY = horizonFYs[nextIdx];
        const nextSpend = currentSpend[candidateFY] || 0;
        if (nextSpend + roomPkg.projectedOverhaulCost <= annualBudgetCeiling * 1.05) {
          targetFY = candidateFY;
          break;
        }
      }

      if (!targetFY) {
        const sortedSubsequent = horizonFYs
          .slice(yIdx + 1)
          .sort((a, b) => (currentSpend[a] || 0) - (currentSpend[b] || 0));
        targetFY = sortedSubsequent[0];
      }

      if (targetFY && targetFY !== currentFY) {
        const cost = roomPkg.projectedOverhaulCost;
        const fromFY = currentFY;
        roomPkg.currentScheduledFY = targetFY;

        currentSpend[fromFY] = (currentSpend[fromFY] || 0) - cost;
        currentSpend[targetFY] = (currentSpend[targetFY] || 0) + cost;

        const reason = `Optimal readiness (${roomPkg.readinessScore}/100, ${roomPkg.readinessRating}) allows safe deferral to ${targetFY} to relieve ${fromFY} budget spike ($${Math.round(cost / 1000)}k)`;

        proposedMoves.push({
          building: roomPkg.building,
          room: roomPkg.roomName,
          roomDisplayName: roomPkg.roomDisplayName,
          fromFY,
          toFY: targetFY,
          cost,
          readinessScore: roomPkg.readinessScore,
          readinessRating: roomPkg.readinessRating,
          reason,
          hasCriticalFailure: roomPkg.hasCriticalFailure,
        });

        const roomKey = `${roomPkg.building}::${roomPkg.roomName}`;
        proposedRoomOverrides[roomKey] = {
          targetFiscalYear: targetFY,
          notes: `Auto-leveled from ${fromFY} to ${targetFY} (Readiness ${roomPkg.readinessScore}/100)`,
        };
      }
    }
  }

  const finalSpend = getYearSpend();
  const remainingOverCeilingCount = horizonFYs.filter((fy) => (finalSpend[fy] || 0) > annualBudgetCeiling).length;

  return {
    proposedMoves,
    proposedRoomOverrides,
    initialOverCeilingCount,
    remainingOverCeilingCount,
  };
}

/**
 * Creates a preset 5-Year Levelized Scenario
 */
export function createLevelizedScenarioPreset(masterItems: AVItem[]): PlanningScenario {
  const pkgs = groupItemsIntoClassroomPackages(masterItems);
  const proposal = generateLevelingProposal(pkgs, 250000);
  return {
    id: 'levelized-5yr',
    name: '5-Year Levelized CapEx Plan',
    description: 'Balanced capital distribution smoothing overdue backlog and high-spend spikes beneath $250k annual ceiling.',
    isBaseline: false,
    annualBudgetCeiling: 250000,
    inflationRate: 0.05,
    itemOverrides: {},
    roomOverrides: proposal.proposedRoomOverrides,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}


