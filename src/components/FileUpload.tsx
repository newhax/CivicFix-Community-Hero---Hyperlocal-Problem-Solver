import React, { useState, useRef } from "react";
import { Upload, FileImage, FileVideo, AlertCircle } from "lucide-react";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  error: string | null;
  warning: string | null;
}

export default function FileUpload({ onFilesSelected, error, warning }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      onFilesSelected(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      onFilesSelected(filesArray);
    }
  };

  const triggerSelect = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerSelect}
        className={`w-full py-8 px-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? "border-blue-500 bg-blue-50/40 scale-[0.99]"
            : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 mb-3.5">
          <Upload className="w-5 h-5 text-blue-600" />
        </div>

        <h3 className="text-xs font-bold text-slate-800 font-display">
          Drag & drop photos or videos here
        </h3>
        <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-relaxed">
          Or click to browse device folders. Supports JPEG, PNG, WebP (max 10MB) and MP4, MOV, WebM (max 100MB).
        </p>

        <div className="flex gap-4 items-center mt-4 text-[10px] text-slate-400 border-t border-slate-100 pt-3 w-full justify-center">
          <span className="flex items-center gap-1">
            <FileImage className="w-3.5 h-3.5 text-slate-400" />
            Photos &lt; 10MB
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
          <span className="flex items-center gap-1">
            <FileVideo className="w-3.5 h-3.5 text-slate-400" />
            Videos &lt; 100MB
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-150 p-3.5 rounded-xl flex gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-rose-950">File Validation Error</span>
            <p className="text-rose-700 text-[11px] mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {warning && (
        <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-xl flex gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-950">Heuristic Alert</span>
            <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">{warning}</p>
          </div>
        </div>
      )}
    </div>
  );
}
