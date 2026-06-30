import React, { useState, useEffect } from "react";
import { Issue, IssueCategory } from "../types";
import { BarChart, PieChart, TrendingUp, Zap, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import IssueViewModal from "./IssueViewModal";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ImpactDashboardProps {
  issues: Issue[];
  userId: string;
}

export default function ImpactDashboard({ issues, userId }: ImpactDashboardProps) {
  const [activeCategoryTab, setActiveCategoryTab] = useState<IssueCategory | "ALL">("ALL");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const myIssues = issues
    .filter(i => i.reporterId === userId)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("My Filed Reports Summary", 14, 15);
    
    const tableColumn = ["Title", "Category", "Status", "Date"];
    const tableRows: any[] = [];

    myIssues.forEach(issue => {
      const issueData = [
        issue.title,
        issue.category,
        issue.status,
        new Date(issue.createdAt).toLocaleDateString(),
      ];
      tableRows.push(issueData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
    });
    doc.save("filed_reports.pdf");
  };

  const exportSingleToPDF = (issue: Issue) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = [16, 185, 129]; // Emerald
    const darkSlate = [15, 23, 42]; // Slate 900
    const lightGray = [241, 245, 249]; // Slate 100

    doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CIVIC WATCH PORTAL", 15, 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text("COMMUNITY WATCH & INFRASTRUCTURE RADAR", 15, 25);

    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 18);
    doc.text(`System ID: CW-${issue.id || "TEMP"}`, 145, 24);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 40, 210, 3, "F");

    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("COMMUNITY CONCERN REPORT", 15, 55);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 58, 195, 58);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Report Title:", 15, 68);
    doc.setFont("Helvetica", "normal");
    doc.text(issue.title || "N/A", 50, 68);

    doc.setFont("Helvetica", "bold");
    doc.text("Category:", 15, 76);
    doc.setFont("Helvetica", "normal");
    doc.text(String(issue.category || "N/A").replace("_", " "), 50, 76);

    doc.setFont("Helvetica", "bold");
    doc.text("Severity Level:", 15, 84);
    doc.setFont("Helvetica", "normal");
    doc.text(issue.severity || "N/A", 50, 84);

    doc.setFont("Helvetica", "bold");
    doc.text("Current Status:", 15, 92);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(issue.status || "REPORTED", 50, 92);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Location Information", 15, 105);
    doc.line(15, 107, 195, 107);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Street Address:", 15, 115);
    doc.setFont("Helvetica", "normal");
    doc.text(issue.address || "Pinned Location", 50, 115);

    doc.setFont("Helvetica", "bold");
    doc.text("GPS Coordinates:", 15, 123);
    doc.setFont("Helvetica", "normal");
    doc.text(`Lat: ${issue.latitude || "N/A"}, Lng: ${issue.longitude || "N/A"}`, 50, 123);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Reporter Information", 15, 136);
    doc.line(15, 138, 195, 138);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Citizen ID:", 15, 146);
    doc.setFont("Helvetica", "normal");
    doc.text(userId || "Anonymous Citizen", 50, 146);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detailed Description", 15, 167);
    doc.line(15, 169, 195, 169);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    
    const splitDescription = doc.splitTextToSize(issue.description || "No description provided.", 180);
    doc.text(splitDescription, 15, 177);

    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, 250, 180, 25, "F");

    doc.setTextColor(71, 85, 105);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for your active participation in making our city safer and cleaner.", 20, 258);
    doc.text("This report is recorded in the Civic Watch blockchain catalog. Verified responses undergo", 20, 263);
    doc.text("active municipal triage within 24 to 48 hours.", 20, 268);

    doc.save(`civic_report_${issue.id}.pdf`);
  };

  const totalReported = issues.length;
  const totalResolved = issues.filter((i) => i.status === "RESOLVED").length;
  const totalInProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;
  const totalVerified = issues.filter((i) => i.status === "VERIFIED").length;
  const totalOpen = issues.filter((i) => i.status === "REPORTED").length;

  const resolutionRate = totalReported > 0 ? Math.round((totalResolved / totalReported) * 100) : 0;
  const averageResolutionDays = 3.4;

  const categoryCounts: Record<IssueCategory, number> = {
    POTHOLES: 0,
    WATER_LEAKAGE: 0,
    STREETLIGHTS: 0,
    WASTE_MANAGEMENT: 0,
    PUBLIC_INFRASTRUCTURE: 0,
    OTHER: 0,
  };

  issues.forEach((issue) => {
    if (categoryCounts[issue.category] !== undefined) {
      categoryCounts[issue.category]++;
    } else {
      categoryCounts.OTHER++;
    }
  });

  const categoryConfig = [
    { key: "POTHOLES", label: "Potholes & Roads", color: "#f59e0b", count: categoryCounts.POTHOLES },
    { key: "WATER_LEAKAGE", label: "Water Leakages", color: "#3b82f6", count: categoryCounts.WATER_LEAKAGE },
    { key: "STREETLIGHTS", label: "Streetlights Out", color: "#8b5cf6", count: categoryCounts.STREETLIGHTS },
    { key: "WASTE_MANAGEMENT", label: "Waste Management", color: "#10b981", count: categoryCounts.WASTE_MANAGEMENT },
    { key: "PUBLIC_INFRASTRUCTURE", label: "Public Structures", color: "#ef4444", count: categoryCounts.PUBLIC_INFRASTRUCTURE },
    { key: "OTHER", label: "Other Minor Issues", color: "#6b7280", count: categoryCounts.OTHER },
  ];

  const validCategories = categoryConfig.filter(c => c.count > 0);
  const totalValidCount = validCategories.reduce((sum, c) => sum + c.count, 0);

  let accumulatedPercentage = 0;
  const donutSlices = validCategories.map((cat) => {
    const percentage = totalValidCount > 0 ? (cat.count / totalValidCount) * 100 : 0;
    const startAngle = (accumulatedPercentage / 100) * 360;
    accumulatedPercentage += percentage;
    const endAngle = (accumulatedPercentage / 100) * 360;
    
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
      ].join(" ");
    };

    return {
      ...cat,
      percentage,
      pathD: percentage === 100 
        ? `M 150 50 A 100 100 0 1 1 149.9 50`
        : describeArc(150, 150, 95, startAngle, endAngle),
    };
  });

  return (
    <div id="impact-dashboard-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-6">
      {selectedIssue && (
        <IssueViewModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
      )}
      
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <div>
          <h2 className="text-lg font-semibold font-display text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Civic Impact Dashboard
          </h2>
          <p className="text-xs text-slate-500">Live accountability statistics & response time monitoring</p>
        </div>
        <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>City Target Met: 94%</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50/55 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Total Reported</span>
          <span className="text-2xl font-bold font-display text-slate-800 mt-1">{totalReported}</span>
          <span className="text-[9px] text-slate-400 mt-2">100% cataloged and tracked</span>
        </div>

        <div className="bg-blue-50/20 rounded-xl p-4 border border-blue-100/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider font-display">Resolved Tickets</span>
          <span className="text-2xl font-bold font-display text-blue-800 mt-1">{totalResolved}</span>
          <span className="text-[9px] text-blue-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolution rate: {resolutionRate}%</span>
          </span>
        </div>

        <div className="bg-amber-50/30 rounded-xl p-4 border border-amber-100/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider font-display">Active & Verified</span>
          <span className="text-2xl font-bold font-display text-amber-800 mt-1">{totalVerified + totalInProgress}</span>
          <span className="text-[9px] text-amber-600 mt-2">Currently in queue</span>
        </div>

        <div className="bg-indigo-50/30 rounded-xl p-4 border border-indigo-100/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider font-display">Avg Resolution Speed</span>
          <span className="text-2xl font-bold font-display text-indigo-800 mt-1">{averageResolutionDays} Days</span>
          <span className="text-[9px] text-indigo-500 mt-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>42% faster than last month</span>
          </span>
        </div>
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-2">
        {/* Category Share Donut Chart */}
        <div className="md:col-span-5 bg-slate-50/40 rounded-2xl border border-slate-100 p-5 flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 self-start font-display">Issue Type Breakdown</h3>
          
          {totalValidCount === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs italic text-slate-400">No reported data available</div>
          ) : (
            <div className="relative w-full flex flex-col items-center">
              <svg viewBox="0 0 300 240" className="w-48 h-48">
                {/* Donut Slices */}
                {donutSlices.map((slice, i) => (
                  <path
                    key={i}
                    d={slice.pathD}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="18"
                    className="hover:stroke-[24px] transition-all duration-300 cursor-pointer"
                  />
                ))}
                {/* Center Core Display */}
                <circle cx="150" cy="150" r="75" fill="#ffffff" />
                <text x="150" y="145" textAnchor="middle" fill="#1e293b" fontSize="18" fontWeight="bold" className="font-display">
                  {totalReported}
                </text>
                <text x="150" y="165" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="500">
                  TOTAL CASES
                </text>
              </svg>

              {/* Legend List */}
              <div className="grid grid-cols-2 gap-2 mt-4 w-full text-[10px] text-slate-600 font-medium border-t border-slate-100 pt-3">
                {categoryConfig.map((cat) => (
                  <div key={cat.key} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.label} ({cat.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Accountability & Resolution Speed Matrix */}
        <div className="md:col-span-7 bg-slate-50/40 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-display">Municipal Response Indicators</h3>
            
            <div className="flex flex-col gap-4">
              {/* Category Performance Rows */}
              {[
                { label: "Potholes & Roads", target: 5, current: averageResolutionDays, pct: 85, color: "bg-amber-500" },
                { label: "Water Pipeline Outages", target: 2, current: 1.2, pct: 95, color: "bg-blue-500" },
                { label: "Electrical Utilities & Lighting", target: 7, current: 6.8, pct: 92, color: "bg-purple-500" },
                { label: "Sanitation & Solid Waste", target: 3, current: 2.1, pct: 90, color: "bg-emerald-500" },
                { label: "Structural Railings & Sidewalks", target: 4, current: 3.9, pct: 88, color: "bg-rose-500" },
              ].map((row, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-700">{row.label}</span>
                    <span className="text-slate-500">Avg: <strong className="text-slate-800">{row.current}d</strong> / Target: {row.target}d</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full ${row.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${row.pct}%` }} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span>Performance Rating</span>
                    <span className="font-semibold text-emerald-600">SLA met: {row.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-white/95 border border-slate-100 p-3 rounded-xl flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-[10px] text-slate-500 leading-snug">
              <strong className="text-slate-700">Predictive Dispatch Engine Active:</strong> Intelligent work order assignment has cut response latency by 32 hours across high-density sectors.
            </div>
          </div>
        </div>
        {/* My History Section */}
        <div className="bg-slate-50/40 rounded-2xl border border-slate-100 p-5 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">My Filed Reports History</h3>
            <div className="flex gap-2">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              {/* Removed main Export PDF button as requested, individual export options exist for each report */}
            </div>
          </div>
          {myIssues.length === 0 ? (
            <p className="text-xs italic text-slate-400">No reports filed yet.</p>
          ) : (
            <div className="space-y-4">
              {myIssues.map(issue => (
                <div key={issue.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex gap-4 flex-wrap">
                    {issue.imageUrl && (
                      <img src={issue.imageUrl} alt={issue.title} className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    {issue.videoUrl && (
                      <video src={issue.videoUrl} className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{issue.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{issue.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          issue.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
                          issue.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {issue.status}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedIssue(issue)}
                      className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg hover:bg-blue-100 cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      onClick={() => exportSingleToPDF(issue)}
                      className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-lg hover:bg-emerald-100 cursor-pointer"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
