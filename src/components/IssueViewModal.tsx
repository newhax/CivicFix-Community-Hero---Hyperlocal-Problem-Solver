import React from "react";
import { X } from "lucide-react";
import { Issue } from "../types";

interface IssueViewModalProps {
  issue: Issue;
  onClose: () => void;
}

export default function IssueViewModal({ issue, onClose }: IssueViewModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 font-display">Report Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {issue.imageUrl && (
            <img src={issue.imageUrl} alt={issue.title} className="w-full rounded-xl object-cover mb-4" />
          )}
          {issue.videoUrl && (
            <video src={issue.videoUrl} controls className="w-full rounded-xl mb-4" />
          )}
          <h4 className="text-lg font-bold text-slate-800">{issue.title}</h4>
          <p className="text-sm text-slate-600 mt-2">{issue.description}</p>
          <span className="text-xs bg-slate-100 px-3 py-1 rounded text-slate-600 mt-4 inline-block">{issue.status}</span>
        </div>
      </div>
    </div>
  );
}
