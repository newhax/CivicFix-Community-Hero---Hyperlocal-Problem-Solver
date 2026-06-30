import React from "react";
import { QueueItem } from "../hooks/useUpload";
import { Play, X, Check, RefreshCw, Sparkles, Loader2, AlertCircle } from "lucide-react";

interface UploadProgressProps {
  queue: QueueItem[];
  onStartUpload: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
}

export default function UploadProgress({
  queue,
  onStartUpload,
  onRemoveItem,
  onRetryItem,
}: UploadProgressProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (queue.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full bg-slate-50 border border-slate-200/50 p-4 rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-200/50 pb-2 mb-1">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">
          Upload Queue ({queue.length})
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">
          {queue.filter((item) => item.status === "completed").length} / {queue.length} Done
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        {queue.map((item) => {
          const isPhoto = item.file.type.startsWith("image/");
          
          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200/60 rounded-xl p-3 flex flex-col gap-2 text-xs relative overflow-hidden group shadow-sm animate-fadeIn"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 truncate">{item.file.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>{formatBytes(item.originalSize)}</span>
                    <span>•</span>
                    <span className="capitalize">{isPhoto ? "Photo" : "Video"}</span>
                    {item.savedPercentage && item.savedPercentage > 0 ? (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          Saved {item.savedPercentage}%
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => onStartUpload(item.id)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Start Upload"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  {item.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => onRetryItem(item.id)}
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                      title="Retry Upload"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.status !== "uploading" && item.status !== "compressing" && (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {item.status === "compressing" && (
                <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-medium bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Optimizing media files... {item.progress}%</span>
                </div>
              )}

              {item.status === "uploading" && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                      <span>Uploading to secure server...</span>
                    </span>
                    <span>
                      {item.progress}%
                      {item.estimatedSecRemaining !== undefined && (
                        <span className="ml-1 text-slate-400">
                          ({item.estimatedSecRemaining}s remaining)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {item.status === "completed" && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100/50 p-1.5 rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ready to attach to report!</span>
                </div>
              )}

              {item.status === "failed" && (
                <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold bg-rose-50 border border-rose-100/50 p-1.5 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Error: {item.error || "Connection failure."}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
