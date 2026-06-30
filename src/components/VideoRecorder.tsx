import React, { useEffect } from "react";
import { Video, Square, Moon, RefreshCw, AlertTriangle } from "lucide-react";

interface VideoRecorderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  facingMode: "user" | "environment";
  isLowLight: boolean;
  onToggleFacing: () => void;
  onToggleLowLight: () => void;
  isRecording: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancel: () => void;
  error: string | null;
  isLoading?: boolean;
}

export default function VideoRecorder({
  videoRef,
  stream,
  devices,
  isLowLight,
  onToggleFacing,
  onToggleLowLight,
  isRecording,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onCancel,
  error,
  isLoading,
}: VideoRecorderProps) {
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isNearingLimit = recordingDuration >= 240; 
  const isExceedingSizeWarning = recordingDuration >= 150; 

  return (
    <div className="relative w-full aspect-video md:aspect-[16/10] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center group">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm z-20">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-all ${
            isLowLight ? "brightness-125 contrast-105 saturate-110 filter hue-rotate-15" : ""
          } ${isRecording ? "scale-[1.01]" : ""}`}
        />
      )}

      {stream && !isRecording && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
          <div className="border-r border-b border-white/40"></div>
          <div className="border-r border-b border-white/40"></div>
          <div className="border-b border-white/40"></div>
          <div className="border-r border-b border-white/40"></div>
          <div className="border-r border-b border-white/40"></div>
          <div className="border-b border-white/40"></div>
          <div className="border-r border-white/40"></div>
          <div className="border-r border-white/40"></div>
          <div></div>
        </div>
      )}

      {isRecording && (
        <div className="absolute inset-0 border-2 border-rose-500 animate-pulse pointer-events-none rounded-2xl z-20"></div>
      )}

      {error && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <Video className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-display">Video Recorder Offline</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">{error}</p>
        </div>
      )}

      {!stream && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/60">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 animate-pulse">Initializing device camera feed...</p>
        </div>
      )}

      {stream && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-10">
          <div className="flex items-center gap-1.5">
            {isRecording ? (
              <div className="flex items-center gap-1.5 bg-rose-500/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold font-mono shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>REC {formatDuration(recordingDuration)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 text-[10px] font-bold text-blue-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>VIDEO STANDBY</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isRecording && (
              <>
                <button
                  type="button"
                  onClick={onToggleLowLight}
                  className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                    isLowLight
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 ring-1 ring-amber-500"
                      : "bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                  title="Toggle Low Light Mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={onToggleFacing}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 backdrop-blur-md hover:bg-slate-800 transition-all"
                    title="Switch camera lens"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {isRecording && (isNearingLimit || isExceedingSizeWarning) && (
        <div className="absolute top-16 left-4 right-4 z-20 flex justify-center">
          <div className="flex items-center gap-2 bg-amber-500/90 text-slate-950 px-3 py-1.5 rounded-xl border border-amber-400 shadow-lg text-[10px] font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {isNearingLimit
                ? "Approaching maximum 5-minute limit! Video will auto-stop soon."
                : "Large video file detected (simulated size exceeds 50MB)."}
            </span>
          </div>
        </div>
      )}

      {stream && (
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 z-10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-800 backdrop-blur-md transition-all"
          >
            {isRecording ? "Cancel" : "Close Feed"}
          </button>

          {isRecording ? (
            <button
              type="button"
              onClick={onStopRecording}
              className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl border-4 border-slate-900 ring-2 ring-rose-500"
              title="Stop Recording"
            >
              <Square className="w-5 h-5 text-white fill-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartRecording}
              className="w-14 h-14 rounded-full bg-white text-rose-600 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl border-4 border-slate-900 ring-2 ring-white"
              title="Start Recording"
            >
              <span className="w-4 h-4 rounded-full bg-rose-600 animate-ping absolute"></span>
              <span className="w-4 h-4 rounded-full bg-rose-600 relative"></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
