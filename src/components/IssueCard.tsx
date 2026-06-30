import React, { useState } from "react";
import { Issue, Comment, IssueCategory, IssueStatus, SeverityLevel } from "../types";
import { 
  ThumbsUp, MessageSquare, ShieldCheck, MapPin, 
  Calendar, CheckCircle2, AlertTriangle, Play,
  ChevronDown, ChevronUp, Send, Flag, Clock
} from "lucide-react";

interface IssueCardProps {
  key?: string | number;
  issue: Issue;
  currentUserId: string;
  onVote: (id: string, direction: "up" | "down") => any;
  onValidate: (id: string, voteType: "VALIDATE" | "FLAG") => any;
  onAddComment: (id: string, text: string) => any;
  onStatusUpdate?: (id: string, status: IssueStatus, note: string) => any;
}

export default function IssueCard({
  issue,
  currentUserId,
  onVote,
  onValidate,
  onAddComment,
  onStatusUpdate,
}: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [selectedNextStatus, setSelectedNextStatus] = useState<IssueStatus | "">("");
  const [showStatusForm, setShowStatusForm] = useState(false);

  const getCategoryStyles = (category: IssueCategory) => {
    switch (category) {
      case "POTHOLES":
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pothole / Road" };
      case "WATER_LEAKAGE":
        return { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Water Leakage" };
      case "STREETLIGHTS":
        return { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Streetlight Out" };
      case "WASTE_MANAGEMENT":
        return { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Waste / Garbage" };
      case "PUBLIC_INFRASTRUCTURE":
        return { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "Infrastructure" };
      default:
        return { bg: "bg-slate-50 text-slate-700 border-slate-200", label: "Other" };
    }
  };

  const getStatusStyles = (status: IssueStatus) => {
    switch (status) {
      case "REPORTED":
        return { bg: "bg-blue-100/80 text-blue-800", dot: "bg-blue-500", label: "Reported" };
      case "VERIFIED":
        return { bg: "bg-amber-100 text-amber-800", dot: "bg-amber-500", label: "Verified" };
      case "IN_PROGRESS":
        return { bg: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500", label: "In Progress" };
      case "RESOLVED":
        return { bg: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", label: "Resolved" };
    }
  };

  const getSeverityStyles = (severity: SeverityLevel) => {
    switch (severity) {
      case "LOW":
        return "bg-slate-50 text-slate-600 border-slate-200";
      case "MEDIUM":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "HIGH":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200 animate-pulse border";
    }
  };

  const hasUpvoted = issue.upvotedBy?.includes(currentUserId);
  const userValidation = issue.votes?.find(v => v.userId === currentUserId)?.voteType;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(issue.id, commentText);
    setCommentText("");
  };

  const handleStatusChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNextStatus || !statusNote.trim() || !onStatusUpdate) return;
    onStatusUpdate(issue.id, selectedNextStatus, statusNote);
    setStatusNote("");
    setSelectedNextStatus("");
    setShowStatusForm(false);
  };

  return (
    <div 
      id={`issue-card-${issue.id}`}
      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col ${
        isExpanded ? "shadow-md border-blue-100" : "hover:shadow-sm border-slate-100"
      }`}
    >
      {/* Visual Header / Content Area */}
      <div className="p-5 flex flex-col sm:flex-row gap-5">
        {/* Aspect Ratio Preserved Image Section */}
        {issue.imageUrl && (
          <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden bg-slate-50 relative flex-shrink-0 border border-slate-100">
            <img 
              src={issue.imageUrl} 
              alt={issue.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
            <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
              <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-sm bg-slate-900/80 text-white`}>
                {issue.category}
              </span>
            </div>
            {issue.videoUrl && (
              <div className="absolute bottom-2 right-2 bg-slate-900/80 p-1.5 rounded-full text-white">
                <Play className="w-3 h-3 fill-current" />
              </div>
            )}
          </div>
        )}

        {/* Textual Core details */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getCategoryStyles(issue.category).bg}`}>
                  {getCategoryStyles(issue.category).label}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getSeverityStyles(issue.severity)}`}>
                  {issue.severity} Severity
                </span>
              </div>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${getStatusStyles(issue.status).bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusStyles(issue.status).dot}`} />
                {getStatusStyles(issue.status).label}
              </span>
            </div>

            <h3 className="text-base font-bold font-display text-slate-800 leading-snug hover:text-blue-600 transition-colors cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              {issue.title}
            </h3>

            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {issue.description}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-50 pt-3">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700 truncate max-w-[180px] sm:max-w-xs">{issue.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span>By <strong className="text-slate-600">{issue.reporterName}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Engagement Counter Toolbar */}
      <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onVote(issue.id, "up")}
            className={`flex items-center gap-1.5 font-medium transition-colors ${
              hasUpvoted 
                ? "text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200" 
                : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
            }`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? "fill-current text-blue-600" : "text-slate-400"}`} />
            <span>{hasUpvoted ? "Liked" : "Like"} ({issue.upvotes})</span>
          </button>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{issue.comments?.length || 0} Discussions</span>
          </button>
        </div>

        {/* Validation Engine Options */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onValidate(issue.id, "VALIDATE")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors border ${
              userValidation === "VALIDATE"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border-slate-200 shadow-sm"
            }`}
            title="Validate this is a real issue that needs fixing"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Validate ({issue.validationsCount})</span>
          </button>

          <button 
            onClick={() => onValidate(issue.id, "FLAG")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors border ${
              userValidation === "FLAG"
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border-slate-200 shadow-sm"
            }`}
            title="Flag as duplicate, resolved, or incorrect"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Flag ({issue.flagsCount})</span>
          </button>
        </div>
      </div>

      {/* Expanded Interactive Detail Section */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/20 p-5 flex flex-col gap-5">
          {/* Detailed Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-display">Full Narrative</h4>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
              {issue.description}
            </p>
          </div>

          {/* Attached Video Evidence */}
          {issue.videoUrl && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-display">Attached Video Evidence</h4>
              <div className="aspect-video w-full max-w-sm sm:max-w-md bg-slate-950 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <video 
                  src={issue.videoUrl} 
                  controls 
                  playsInline
                  className="w-full h-full object-contain" 
                />
              </div>
            </div>
          )}

          {/* Status Updates Progress Timeline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Resolution Progress log</h4>
              {onStatusUpdate && (
                <button
                  onClick={() => setShowStatusForm(!showStatusForm)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                >
                  {showStatusForm ? "Cancel Action" : "Official Action"}
                </button>
              )}
            </div>

            {/* Official Status Override Form */}
            {showStatusForm && (
              <form onSubmit={handleStatusChangeSubmit} className="bg-slate-100/80 p-3 rounded-xl border border-slate-200/50 mb-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    value={selectedNextStatus}
                    onChange={(e) => setSelectedNextStatus(e.target.value as IssueStatus)}
                    className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 flex-1"
                    required
                  >
                    <option value="">-- Select Next Status --</option>
                    <option value="VERIFIED">VERIFIED (Confirm Validity)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS (Begin Work Order)</option>
                    <option value="RESOLVED">RESOLVED (Confirm Fixed)</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Official status note (e.g. dispatched unit #3C...)"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 w-full"
                  required
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] py-1 px-3 rounded self-end font-bold"
                >
                  Publish Update
                </button>
              </form>
            )}

            {/* Timeline */}
            <div className="flex flex-col gap-3 pl-2 mt-2">
              {issue.statusHistory?.map((history, idx) => (
                <div key={idx} className="flex gap-3 text-xs">
                  <div className="relative flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full z-10 ${getStatusStyles(history.status).dot}`} />
                    {idx < (issue.statusHistory?.length || 0) - 1 && (
                      <span className="w-0.5 bg-slate-200 flex-1 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 capitalize">{history.status.toLowerCase().replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(history.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{history.note}</p>
                    <p className="text-[9px] text-slate-400">Recorded by: {history.updatedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Citizen Discussions Board */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Citizen Discussions</h4>
            <div className="flex flex-col gap-3 max-h-56 overflow-y-auto mb-3 pr-1">
              {issue.comments?.length === 0 ? (
                <p className="text-xs italic text-slate-400 p-2 text-center bg-slate-50 rounded">No discussion points posted yet. Start the conversation!</p>
              ) : (
                issue.comments?.map((comment) => (
                  <div 
                    key={comment.id} 
                    className={`p-3 rounded-xl border text-xs flex gap-2.5 ${
                      comment.isOfficial 
                        ? "bg-blue-50/50 border-blue-100" 
                        : "bg-white border-slate-100"
                    }`}
                  >
                    {comment.authorAvatar ? (
                      <img 
                        src={comment.authorAvatar} 
                        alt={comment.authorName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-[10px] uppercase flex-shrink-0">
                        {comment.authorName.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          {comment.authorName}
                          {comment.isOfficial && (
                            <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Official
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-snug">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Write comment input form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Suggest workarounds, verify updates, or comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 flex items-center justify-center transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
