import { jsPDF } from 'jspdf';
import { AVItem, ClassroomPackage, FiscalYearBudget, InventoryStats } from '../types/inventory';
import { getFiscalYearFromDate, getRoomReadinessExplanation, SYSTEM_NOW } from './calculations';

interface PDFReportData {
  collegeName?: string;
  departmentName?: string;
  stats: InventoryStats;
  fiscalBudgets: FiscalYearBudget[];
  items: AVItem[];
}

export function generateBudgetPlanningPDF(data: PDFReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const college = data.collegeName || 'Higher Education Academic Campus';
  const department = data.departmentName || 'Classroom AV & Instructional Technology';
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Colors
  const primaryDark = [15, 23, 42]; // #0F172A
  const slate600 = [71, 85, 105]; // #475569
  const accentBlue = [2, 132, 199]; // #0284C7
  const borderGray = [226, 232, 240]; // #E2E8F0
  const lightBg = [248, 250, 252]; // #F8FAFC
  const alertRed = [220, 38, 38]; // #DC2626

  // PAGE 1: Executive Summary & Upcoming Fiscal Year Budget Breakdown
  let y = 18;

  // Header Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(college.toUpperCase(), margin, y);
  
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`${department} · Classroom AV Technology Lifecycle & Budget Report`, margin, y);

  y += 4;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + contentWidth, y);

  y += 7;
  // Report metadata bar
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Generated: ${currentDate}`, margin, y);
  doc.text(`Privacy Level: Confidential Client-Side Report (No Server Data)`, margin + contentWidth - 85, y);

  y += 8;
  // Executive Summary Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('EXECUTIVE FLEET & CAPITAL OUTLAY SUMMARY', margin + 6, y + 7);

  // 4 Metrics in a row
  const colWidth = (contentWidth - 12) / 4;
  const metrics = [
    { label: 'Active AV Fleet', value: `${data.stats.totalItems} Units` },
    { label: 'Total Fleet Value', value: `$${data.stats.totalFleetReplacementValue.toLocaleString()}` },
    { label: 'Upcoming FY CapEx', value: `$${data.stats.nextFiscalYearBudget.toLocaleString()}` },
    { label: 'Past Shelflife', value: `${data.stats.overdueCount} Overdue` },
  ];

  metrics.forEach((m, idx) => {
    const mx = margin + 6 + idx * colWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(m.label, mx, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(m.value, mx, y + 26);
  });

  // Secondary subline in summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    `Fleet Health: ${data.stats.overdueCount} items overdue replacement · ${data.stats.activeIssuesCount} active maintenance tickets · Average fleet age: ${data.stats.averageAgeYears} yrs`,
    margin + 6,
    y + 34
  );

  y += 46;

  // SECTION 1: Upcoming Fiscal Year Capital Schedule
  const currentFY = getFiscalYearFromDate(SYSTEM_NOW);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`UPCOMING FISCAL YEAR CAPITAL REPLACEMENT SCHEDULE: ${currentFY}`, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    `Classroom equipment scheduled for replacement or overdue for overhaul in ${currentFY}:`,
    margin,
    y + 5
  );

  y += 10;

  // Table Header
  const qCols = [
    { title: 'Room / Space', width: 42 },
    { title: 'Equipment Model', width: 58 },
    { title: 'Category', width: 34 },
    { title: 'Status / Need', width: 26 },
    { title: 'Estimated ($)', width: 18 },
  ];

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  let curX = margin + 2;
  qCols.forEach((col) => {
    doc.text(col.title, curX, y + 4.8);
    curX += col.width;
  });

  y += 7;

  // Table Rows (top 9 upcoming FY items)
  const upcomingRows = data.items
    .filter((it) => it.replacementFiscalYear === currentFY || it.lifecycleStatus === 'Past Lifespan / Overdue')
    .slice(0, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (upcomingRows.length === 0) {
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(`No urgent replacements scheduled for ${currentFY}.`, margin + 4, y + 6);
    y += 12;
  } else {
    upcomingRows.forEach((item, rIdx) => {
      if (rIdx % 2 === 1) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }

      curX = margin + 2;
      doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
      
      // Room
      const roomStr = item.room.length > 24 ? item.room.substring(0, 22) + '...' : item.room;
      doc.text(roomStr, curX, y + 4.5);
      curX += qCols[0].width;

      // Model
      const modelStr = item.makeModel.length > 34 ? item.makeModel.substring(0, 32) + '...' : item.makeModel;
      doc.text(modelStr, curX, y + 4.5);
      curX += qCols[1].width;

      // Category
      doc.text(item.category, curX, y + 4.5);
      curX += qCols[2].width;

      // Status
      let statusStr = item.lifecycleStatus === 'Past Lifespan / Overdue' ? 'Overdue EOL' : item.maintenanceStatus;
      if (item.lifecycleStatus === 'Past Lifespan / Overdue') {
        doc.setTextColor(alertRed[0], alertRed[1], alertRed[2]);
      } else {
        doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      }
      doc.text(statusStr, curX, y + 4.5);
      curX += qCols[3].width;

      // Cost
      doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
      doc.text(`$${item.totalReplacementCost.toLocaleString()}`, curX, y + 4.5);

      y += 6.5;
    });
  }

  // Upcoming FY Total row
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`Total ${currentFY} Requirement:`, margin + contentWidth - 75, y);
  doc.text(`$${data.stats.nextFiscalYearBudget.toLocaleString()}`, margin + contentWidth - 18, y);

  y += 12;

  // SECTION 2: Maintenance Risk Alert
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('CRITICAL CLASSROOM RISK & IMMEDIATE ACTION TICKETS', margin, y);
  y += 4;

  const urgentIssues = data.items
    .filter((it) => it.maintenanceStatus === 'Out of Service' || it.maintenanceStatus === 'Requires Service')
    .slice(0, 4);

  if (urgentIssues.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text('All classroom AV equipment currently operational. Zero open service-disrupting tickets.', margin, y + 4);
    y += 10;
  } else {
    urgentIssues.forEach((issue) => {
      doc.setFillColor(254, 242, 242); // light red
      doc.roundedRect(margin, y, contentWidth, 11, 1, 1, 'F');
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(margin, y, contentWidth, 11, 1, 1, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(alertRed[0], alertRed[1], alertRed[2]);
      doc.text(`${issue.room} · ${issue.category}`, margin + 3, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text(`Issue: ${issue.activeIssue || 'Hardware degraded'} · Tech: ${issue.assignedTech || 'Unassigned'}`, margin + 3, y + 8.5);

      y += 13;
    });
  }

  // Footer on page 1
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Page 1 of 2 · Classroom AV Capital Budget Planning System', margin, pageHeight - 10);
  doc.text('College AV Operations · Client-Side Private Document', margin + contentWidth - 65, pageHeight - 10);

  // PAGE 2: Multi-Year Fiscal Year CapEx Projections
  doc.addPage();
  y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('MULTI-YEAR CAPITAL EXPENDITURE (CapEx) FORECAST', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Long-term equipment replacement forecast based on predetermined device shelf lives:', margin, y);

  y += 9;

  // Fiscal Year Table Header
  const fyCols = [
    { title: 'Fiscal Year', width: 28 },
    { title: 'Target Refresh Items', width: 34 },
    { title: 'Hardware Cost ($)', width: 38 },
    { title: 'Installation / Labor ($)', width: 40 },
    { title: 'Total Budget ($)', width: 38 },
  ];

  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, y, contentWidth, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  curX = margin + 2;
  fyCols.forEach((col) => {
    doc.text(col.title, curX, y + 5);
    curX += col.width;
  });

  y += 7.5;

  let grandTotal = 0;
  data.fiscalBudgets.forEach((fb, idx) => {
    grandTotal += fb.totalCost;
    if (idx % 2 === 1) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(margin, y, contentWidth, 7, 'F');
    }

    curX = margin + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(fb.fiscalYear, curX, y + 5);
    curX += fyCols[0].width;

    doc.setFont('helvetica', 'normal');
    doc.text(`${fb.itemCount} units`, curX, y + 5);
    curX += fyCols[1].width;

    doc.text(`$${fb.hardwareCost.toLocaleString()}`, curX, y + 5);
    curX += fyCols[2].width;

    doc.text(`$${fb.laborCost.toLocaleString()}`, curX, y + 5);
    curX += fyCols[3].width;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
    doc.text(`$${fb.totalCost.toLocaleString()}`, curX, y + 5);

    y += 7;
  });

  // Grand Total Line
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Cumulative 6-Year CapEx Projection:', margin + 2, y);
  doc.setTextColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.text(`$${grandTotal.toLocaleString()}`, margin + contentWidth - 30, y);

  y += 16;

  // Replacement Guidelines & Shelf-Life Matrix
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('CAMPUS AV SHELF-LIFE & DEPRECIATION STANDARDS', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Predetermined replacement cycles adopted for academic budget forecasting:', margin, y);

  y += 6;

  const standards = [
    { cat: 'Laser Projectors', life: '5 Years', note: '20,000 hr solid-state diode threshold; optical engine degradation.' },
    { cat: 'Interactive Touch Panels', life: '6 Years', note: 'Touch digitizer durability; onboard Android OS security support.' },
    { cat: 'AV Matrix / Crestron / Extron', life: '7–8 Years', note: 'HDMI/HDCP revision cycles, EDID firmware, network switch ports.' },
    { cat: 'Ceiling Array Mics / DSP', life: '8–10 Years', note: 'Acoustic voice lift, Dante/AES67 network standard support.' },
    { cat: 'Wireless Presentation Gateways', life: '4 Years', note: 'Wi-Fi 6/7 protocols, OS client app compatibility, security.' },
    { cat: 'HyFlex PTZ Cameras', life: '5 Years', note: 'Mechanical motor wear, sensor resolution, USB-C/NDI standard.' },
  ];

  standards.forEach((std) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(`• ${std.cat} (${std.life}):`, margin + 2, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(std.note, margin + 46, y);

    y += 5.5;
  });

  y += 14;

  // Authorization Sign-off Block
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('BUDGET AUTHORIZATION & INSTITUTIONAL REVIEW', margin + 6, y + 6);

  const signCols = [
    { title: 'AV Systems Director', note: 'Signature & Date' },
    { title: 'Chief Information Officer (CIO)', note: 'Signature & Date' },
    { title: 'Provost / VP Academic Affairs', note: 'Signature & Date' },
  ];

  const signWidth = (contentWidth - 16) / 3;
  signCols.forEach((s, idx) => {
    const sx = margin + 6 + idx * signWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(s.title, sx, y + 14);

    doc.setDrawColor(slate600[0], slate600[1], slate600[2]);
    doc.line(sx, y + 26, sx + signWidth - 8, y + 26);
    doc.setFontSize(6.5);
    doc.text(s.note, sx, y + 29.5);
  });

  // Footer on page 2
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Page 2 of 2 · End of Report', margin, pageHeight - 10);
  doc.text(`Generated on ${currentDate}`, margin + contentWidth - 45, pageHeight - 10);

  // Save / Trigger Download
  const filename = `College_AV_Budget_Plan_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export interface RoomReadinessPDFData {
  collegeName?: string;
  departmentName?: string;
  packages: ClassroomPackage[];
  filterLevel?: 'all' | 'green' | 'yellow' | 'red';
  filterBuilding?: string;
}

/**
 * Generates an executive, color-coded Red-Yellow-Green "Room Readiness Report" PDF
 * detailing instructional spaces, composite readiness scores (0-100), and factor-by-factor explanations.
 */
export function generateRoomReadinessPDF(data: RoomReadinessPDFData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const college = data.collegeName || 'Higher Education Academic Campus';
  const department = data.departmentName || 'Classroom AV & Instructional Media';
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Color Palette
  const primaryDark = [15, 23, 42]; // #0F172A
  const slate700 = [51, 65, 85]; // #334155
  const slate600 = [71, 85, 105]; // #475569
  const slate500 = [100, 116, 139]; // #64748B
  const slate400 = [148, 163, 184]; // #94A3B8
  const borderGray = [226, 232, 240]; // #E2E8F0
  const lightBg = [248, 250, 252]; // #F8FAFC

  // Red-Yellow-Green Palette
  const colorGreen = {
    fill: [240, 253, 244], // #F0FDF4
    stroke: [187, 247, 208], // #BBF7D0
    accent: [22, 163, 74], // #16A34A
    text: [20, 83, 45], // #14532D
    label: 'GREEN · OPTIMAL / GOOD',
  };

  const colorYellow = {
    fill: [254, 252, 232], // #FEFCE8
    stroke: [254, 240, 138], // #FEF08A
    accent: [217, 119, 6], // #D97706
    text: [113, 63, 18], // #713F12
    label: 'YELLOW · FAIR / MONITOR',
  };

  const colorRed = {
    fill: [254, 242, 242], // #FEF2F2
    stroke: [254, 202, 202], // #FECACA
    accent: [220, 38, 38], // #DC2626
    text: [127, 29, 29], // #7F1D1D
    label: 'RED · CRITICAL / DUE',
  };

  // Filter packages if user specified filters
  let filteredPackages = [...data.packages];
  if (data.filterBuilding && data.filterBuilding !== 'all') {
    filteredPackages = filteredPackages.filter((p) => p.building === data.filterBuilding);
  }
  if (data.filterLevel && data.filterLevel !== 'all') {
    filteredPackages = filteredPackages.filter((p) => {
      const exp = getRoomReadinessExplanation(p);
      return exp.level === data.filterLevel;
    });
  }

  // Calculate fleet readiness distribution
  const totalRooms = data.packages.length;
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;
  let totalScoreSum = 0;

  data.packages.forEach((pkg) => {
    totalScoreSum += pkg.readinessScore;
    if (pkg.readinessScore >= 60) greenCount++;
    else if (pkg.readinessScore >= 40) yellowCount++;
    else redCount++;
  });

  const avgFleetScore = totalRooms > 0 ? Math.round(totalScoreSum / totalRooms) : 0;

  let y = 16;

  // Running Header Helper
  const printPageTopBanner = (pageNum: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(college.toUpperCase(), margin, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(`${department} · Official Room Readiness & Operational Health Audit`, margin, y);

    y += 3.5;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentWidth, y);
    y += 5;
  };

  // PAGE 1: Header + Executive Fleet Summary + Scoring Methodology
  printPageTopBanner(1);

  // Document Title Banner
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ROOM READINESS REPORT: RED-YELLOW-GREEN AUDIT', margin + 6, y + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate400[0], slate400[1], slate400[2]);
  doc.text(`Audited Date: ${currentDate} · Active Fleet: ${totalRooms} Classrooms`, margin + contentWidth - 75, y + 7.5);

  y += 15;

  // Executive Fleet Distribution KPI Bar
  const kpiBoxWidth = (contentWidth - 9) / 4;

  // Card 1: Fleet Average
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, kpiBoxWidth, 20, 1.5, 1.5, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, kpiBoxWidth, 20, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('CAMPUS FLEET READINESS', margin + 4, y + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`${avgFleetScore} / 100`, margin + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`${totalRooms} instructional spaces`, margin + 4, y + 17.5);

  // Card 2: Green Rooms (Optimal / Good >= 60)
  const gX = margin + kpiBoxWidth + 3;
  doc.setFillColor(colorGreen.fill[0], colorGreen.fill[1], colorGreen.fill[2]);
  doc.roundedRect(gX, y, kpiBoxWidth, 20, 1.5, 1.5, 'F');
  doc.setDrawColor(colorGreen.stroke[0], colorGreen.stroke[1], colorGreen.stroke[2]);
  doc.roundedRect(gX, y, kpiBoxWidth, 20, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(colorGreen.text[0], colorGreen.text[1], colorGreen.text[2]);
  doc.text('GREEN · OPTIMAL / GOOD', gX + 4, y + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorGreen.accent[0], colorGreen.accent[1], colorGreen.accent[2]);
  doc.text(`${greenCount} Rooms`, gX + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(totalRooms > 0 ? `${Math.round((greenCount / totalRooms) * 100)}% of campus fleet` : '0%', gX + 4, y + 17.5);

  // Card 3: Yellow Rooms (Fair 40-59)
  const yX = gX + kpiBoxWidth + 3;
  doc.setFillColor(colorYellow.fill[0], colorYellow.fill[1], colorYellow.fill[2]);
  doc.roundedRect(yX, y, kpiBoxWidth, 20, 1.5, 1.5, 'F');
  doc.setDrawColor(colorYellow.stroke[0], colorYellow.stroke[1], colorYellow.stroke[2]);
  doc.roundedRect(yX, y, kpiBoxWidth, 20, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(colorYellow.text[0], colorYellow.text[1], colorYellow.text[2]);
  doc.text('YELLOW · FAIR / MONITOR', yX + 4, y + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorYellow.accent[0], colorYellow.accent[1], colorYellow.accent[2]);
  doc.text(`${yellowCount} Rooms`, yX + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(totalRooms > 0 ? `${Math.round((yellowCount / totalRooms) * 100)}% of campus fleet` : '0%', yX + 4, y + 17.5);

  // Card 4: Red Rooms (Critical < 40)
  const rX = yX + kpiBoxWidth + 3;
  doc.setFillColor(colorRed.fill[0], colorRed.fill[1], colorRed.fill[2]);
  doc.roundedRect(rX, y, kpiBoxWidth, 20, 1.5, 1.5, 'F');
  doc.setDrawColor(colorRed.stroke[0], colorRed.stroke[1], colorRed.stroke[2]);
  doc.roundedRect(rX, y, kpiBoxWidth, 20, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(colorRed.text[0], colorRed.text[1], colorRed.text[2]);
  doc.text('RED · CRITICAL / DUE', rX + 4, y + 5.5);

  doc.setFontSize(12);
  doc.setTextColor(colorRed.accent[0], colorRed.accent[1], colorRed.accent[2]);
  doc.text(`${redCount} Rooms`, rX + 4, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(totalRooms > 0 ? `${Math.round((redCount / totalRooms) * 100)}% urgent action` : '0%', rX + 4, y + 17.5);

  y += 24;

  // Explanation Methodology Box: How the Score is Reached
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('HOW THE COMPOSITE READINESS SCORE (0–100) IS CALCULATED:', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    '1. Base Lifespan Score: Calculated from fractional remaining shelf life (1.0 down to 0) based on installation date vs academic shelf-life.',
    margin + 4,
    y + 10.5
  );
  doc.text(
    '2. Maintenance & Fault Penalties: -90 pts / capped at 10% for Out-of-Service/Critical tickets; -30 pts for active repair tickets; -20 pts for Poor condition.',
    margin + 4,
    y + 15
  );
  doc.text(
    '3. Replacement Cost Weighting: Scores are weighted by hardware replacement value so primary display & switching gear drive classroom readiness.',
    margin + 4,
    y + 19.5
  );
  doc.text(
    '4. Thresholds: GREEN (60–100) = Healthy & Operational · YELLOW (40–59) = Fair / Approaching Overhaul · RED (0–39) = Critical / Urgent Refresh.',
    margin + 4,
    y + 24
  );

  y += 31;

  // Section Heading for Room Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('INSTRUCTIONAL ROOM-BY-ROOM READINESS AUDIT & SCORE EXPLANATIONS', margin, y);
  y += 5;

  // Render Each Room as a Color-Coded Card with full explanation
  filteredPackages.forEach((pkg) => {
    const explanation = getRoomReadinessExplanation(pkg);
    const pal = explanation.level === 'red' ? colorRed : explanation.level === 'yellow' ? colorYellow : colorGreen;

    // Estimate card height: base 31mm + wrapped text lines
    const summaryLines = doc.splitTextToSize(`Score Explanation: ${explanation.summary}`, contentWidth - 12);
    const factorLine = `Factors: ${explanation.lifecycleFactor} ${explanation.maintenanceFactor}`;
    const wrappedFactorLines = doc.splitTextToSize(factorLine, contentWidth - 12);
    const cardHeight = 22 + (summaryLines.length + wrappedFactorLines.length) * 3.2;

    // Check if card fits on current page
    if (y + cardHeight > pageHeight - 14) {
      doc.addPage();
      y = 16;
      printPageTopBanner(doc.getNumberOfPages());
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
      doc.text('INSTRUCTIONAL ROOM-BY-ROOM READINESS AUDIT (CONTINUED)', margin, y);
      y += 5;
    }

    // Card background
    doc.setFillColor(pal.fill[0], pal.fill[1], pal.fill[2]);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(pal.stroke[0], pal.stroke[1], pal.stroke[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, 'D');

    // Left color accent bar
    doc.setFillColor(pal.accent[0], pal.accent[1], pal.accent[2]);
    doc.roundedRect(margin, y, 3, cardHeight, 1, 1, 'F');

    // Top Row: Building & Room Name + Color-Coded Score Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    const roomTitle = `${pkg.building} — Room ${pkg.roomDisplayName}`;
    doc.text(roomTitle, margin + 6, y + 5);

    // Color-Coded Readiness Badge
    const badgeText = `${explanation.score}/100 · ${pal.label}`;
    const badgeWidth = doc.getTextWidth(badgeText) + 6;
    const badgeX = margin + contentWidth - badgeWidth - 3;
    doc.setFillColor(pal.accent[0], pal.accent[1], pal.accent[2]);
    doc.roundedRect(badgeX, y + 2, badgeWidth, 5.2, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, badgeX + 3, y + 5.7);

    // Sub-row: Space Type, Vendor, Overhaul Cycle, Replacement Cost
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    const spaceInfo = `Space Type: ${pkg.spaceType || 'General Classroom'} · Vendor: ${pkg.vendor || 'AVC'} · Hardware BOM: $${pkg.totalPackageCost.toLocaleString()} (${pkg.itemCount} items) · Target Refresh: ${pkg.projectedFiscalYear}`;
    doc.text(spaceInfo, margin + 6, y + 9.5);

    // Equipment Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    doc.text(`Equipment: `, margin + 6, y + 13.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(pkg.primaryEquipmentSummary, margin + 22, y + 13.5);

    // Dynamic Explanation text (wrapped)
    let textY = y + 17.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(pal.text[0], pal.text[1], pal.text[2]);

    summaryLines.forEach((line: string) => {
      doc.text(line, margin + 6, textY);
      textY += 3.2;
    });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    wrappedFactorLines.forEach((line: string) => {
      doc.text(line, margin + 6, textY);
      textY += 3.2;
    });

    // Recommended Action
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pal.text[0], pal.text[1], pal.text[2]);
    doc.text(`Action: `, margin + 6, textY);
    doc.setFont('helvetica', 'normal');
    doc.text(explanation.actionRecommendation, margin + 17, textY);

    y += cardHeight + 3.5;
  });

  // Stamp Running Footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(`Room Readiness Report · Page ${i} of ${totalPages}`, margin, pageHeight - 7);
    doc.text(
      `Confidential Client-Side Audit · Generated ${currentDate} · CampusAV`,
      margin + contentWidth - 75,
      pageHeight - 7
    );
  }

  // Trigger browser download
  const filename = `Room_Readiness_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

