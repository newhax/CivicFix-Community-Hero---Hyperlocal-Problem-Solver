import React, { useState, useRef } from "react";
import { RotateCw, RotateCcw, X, Check, Loader2 } from "lucide-react";

interface PreviewModalProps {
  mediaSrc: string; // base64 or blob URL
  mimeType: string;
  onConfirm: (finalFile: File) => void;
  onCancel: () => void;
  fileName: string;
}

export default function PreviewModal({
  mediaSrc,
  mimeType,
  onConfirm,
  onCancel,
  fileName,
}: PreviewModalProps) {
  const isVideo = mimeType.startsWith("video/");
  
  const [rotation, setRotation] = useState(0); 
  const [brightness, setBrightness] = useState(100); 
  const [contrast, setContrast] = useState(100); 
  const [isProcessing, setIsProcessing] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleConfirmEdits = () => {
    if (isVideo) {
      fetch(mediaSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const finalFile = new File([blob], fileName, { type: mimeType });
          onConfirm(finalFile);
        })
        .catch((err) => {
          console.error("Error creating file from video blob", err);
          alert("An error occurred preparing the video for attach.");
        });
      return;
    }

    setIsProcessing(true);
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    const isSideways = rotation === 90 || rotation === 270;
    canvas.width = isSideways ? img.naturalHeight : img.naturalWidth;
    canvas.height = isSideways ? img.naturalWidth : img.naturalHeight;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);

    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    const bMul = brightness / 100;
    const cMul = contrast / 100;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * bMul));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * bMul));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * bMul));

      if (cMul !== 1) {
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * cMul + 128));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * cMul + 128));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * cMul + 128));
      }
    }

    ctx.putImageData(imgData, 0, 0);

    canvas.toBlob((blob) => {
      setIsProcessing(false);
      if (blob) {
        const finalFile = new File([blob], fileName.replace(/\.[^/.]+$/, "") + ".jpg", {
          type: "image/jpeg",
        });
        onConfirm(finalFile);
      } else {
        alert("Failed to finalize image edits.");
      }
    }, "image/jpeg", 0.9);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-display">Confirm Media Selection</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Review and adjust properties before finalizing report attachment.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-900 p-4 sm:p-6 flex items-center justify-center relative flex-1 min-h-[180px] sm:min-h-[250px] max-h-[350px] sm:max-h-[400px]">
          {isVideo ? (
            <video
              src={mediaSrc}
              controls
              autoPlay
              className="max-h-full max-w-full rounded-xl object-contain shadow-lg"
            />
          ) : (
            <div className="relative flex items-center justify-center max-h-full max-w-full overflow-hidden">
              <img
                ref={imageRef}
                src={mediaSrc}
                alt="Attached View"
                className="max-h-[300px] max-w-full rounded-xl object-contain shadow-lg transition-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                }}
              />
            </div>
          )}
        </div>

        {!isVideo && (
          <div className="px-5 py-4 bg-slate-50 border-y border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Adjustment Tools</span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium text-slate-500">Angle rotation</span>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                  Rotate {rotation}°
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-slate-500 flex justify-between">
                  <span>Brightness</span>
                  <span className="font-mono">{brightness}%</span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-slate-500 flex justify-between">
                  <span>Contrast</span>
                  <span className="font-mono">{contrast}%</span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        <div className="px-5 py-4 flex gap-3 justify-end border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
            disabled={isProcessing}
          >
            Retake / Reject
          </button>
          
          <button
            type="button"
            onClick={handleConfirmEdits}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Confirm & Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
