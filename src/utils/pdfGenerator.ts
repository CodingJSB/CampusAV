import { jsPDF } from 'jspdf';
import { AVItem, FiscalYearBudget, InventoryStats, QuarterExpense } from '../types/inventory';

interface PDFReportData {
  collegeName?: string;
  departmentName?: string;
  stats: InventoryStats;
  fiscalBudgets: FiscalYearBudget[];
  nextQuarter: QuarterExpense;
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

  // PAGE 1: Executive Summary & Next Quarter Budget Breakdown
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
    { label: 'Next Quarter Outlay', value: `$${data.nextQuarter.totalProjectedCost.toLocaleString()}` },
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

  // SECTION 1: Next Quarter Projected Expenses
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`NEXT QUARTER PROJECTED EXPENSES: ${data.nextQuarter.quarter}`, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    `Estimated immediate capital outlay required for scheduled replacements and critical repairs in ${data.nextQuarter.label}:`,
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

  // Table Rows (top 9 next quarter items)
  const quarterRows = data.nextQuarter.items.slice(0, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (quarterRows.length === 0) {
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text('No urgent replacements or repairs scheduled for this quarter.', margin + 4, y + 6);
    y += 12;
  } else {
    quarterRows.forEach((item, rIdx) => {
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

  // Next Quarter Total row
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Total Next Quarter Requirement:', margin + contentWidth - 75, y);
  doc.text(`$${data.nextQuarter.totalProjectedCost.toLocaleString()}`, margin + contentWidth - 18, y);

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
  const filename = `College_AV_Budget_Plan_${data.nextQuarter.quarter}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
