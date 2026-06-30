import React, { useEffect } from "react";
import { Camera, RefreshCw, Moon } from "lucide-react";

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  activeDeviceId: string;
  facingMode: "user" | "environment";
  isLowLight: boolean;
  onToggleFacing: () => void;
  onToggleLowLight: () => void;
  onCapture: () => void;
  onStop: () => void;
  error: string | null;
  isLoading?: boolean;
}

export default function CameraPreview({
  videoRef,
  stream,
  devices,
  isLowLight,
  onToggleFacing,
  onToggleLowLight,
  onCapture,
  onStop,
  error,
  isLoading,
}: CameraPreviewProps) {
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

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
          }`}
        />
      )}

      {stream && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 transition-opacity group-hover:opacity-30">
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

      {error && (
        <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
            <Camera className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-display">Camera Offline</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">{error}</p>
        </div>
      )}

      {!stream && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/60">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-400 animate-pulse">Initializing device camera stream...</p>
        </div>
      )}

      {stream && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-10">
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 text-[10px] font-bold text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LIVE VIEWPORT</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLowLight}
              className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                isLowLight
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30 ring-1 ring-amber-500"
                  : "bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
              title="Toggle Low Light mode"
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
          </div>
        </div>
      )}

      {stream && (
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-4 z-10">
          <button
            type="button"
            onClick={onStop}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-800 backdrop-blur-md transition-all"
          >
            Close Feed
          </button>
          
          <button
            type="button"
            onClick={onCapture}
            className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl border-4 border-slate-900 ring-2 ring-white/50"
            title="Snap photo"
          >
            <Camera className="w-6 h-6 text-slate-900" />
          </button>
        </div>
      )}
    </div>
  );
}
