import React, { useState, useEffect } from "react";
import { PredictiveInsight } from "../types";
import { BrainCircuit, AlertTriangle, Play, ShieldAlert, Sparkles, RefreshCw, Eye } from "lucide-react";

export default function PredictiveInsightsPanel() {
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState("local-simulation");

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/predictive-insights");
      const data = await response.json();
      setInsights(data.insights || []);
      setModelUsed(data.modelUsed || "local-simulation");
    } catch (err) {
      console.error("Error loading predictive insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getRiskStyles = (level: "LOW" | "MEDIUM" | "HIGH") => {
    switch (level) {
      case "LOW":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "HIGH":
        return "bg-rose-100 text-rose-800 border-rose-200";
    }
  };

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case "POTHOLES": return "🛣️";
      case "WATER_LEAKAGE": return "💧";
      case "STREETLIGHTS": return "💡";
      case "WASTE_MANAGEMENT": return "♻️";
      case "PUBLIC_INFRASTRUCTURE": return "🌉";
      default: return "⚠️";
    }
  };

  return (
    <div id="predictive-insights-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold font-display text-slate-800 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-500 animate-pulse" />
            AI Predictive Forecaster
          </h2>
          <p className="text-xs text-slate-500">Forecasting municipal hotspots using Gemini machine-learning modeling</p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Recomputing..." : "Recompute Models"}
        </button>
      </div>

      <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100/30 rounded-xl p-4 flex gap-3.5">
        <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-slate-800 font-display">How Predictive Dispatch Works</p>
          <p className="text-slate-600 leading-relaxed mt-1">
            By analyzing current report density, upvote counts, weather forecasting (precipitation/freeze cycles), and historical infrastructure life logs, the platform models upcoming stress points in the utility grid up to 14 days in advance.
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-mono">
            <span>ACTIVE ENGINE:</span>
            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold text-[9px] uppercase">
              {modelUsed}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-56 flex flex-col items-center justify-center gap-2 text-xs italic text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
          <span>Crunching structural wear models & weather grids...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="bg-slate-50/40 hover:bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">
                    {getCategoryEmoji(insight.category)} {insight.category.replace("_", " ")}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRiskStyles(insight.riskLevel)}`}>
                    {insight.riskLevel} Risk
                  </span>
                </div>

                <h3 className="text-xs font-bold font-display text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                  {insight.title}
                </h3>
                <p className="text-[11px] text-slate-600 mt-1 leading-normal">
                  {insight.description}
                </p>

                <div className="mt-3 bg-white border border-slate-100 p-2.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Proactive recommendation</span>
                  <p className="text-[10px] text-slate-700 leading-normal mt-0.5 font-medium">{insight.recommendedAction}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100/50 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-500">Confidence:</span>
                  <span className="font-bold text-emerald-600">{insight.probability}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
