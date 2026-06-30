import React, { useState, useEffect } from "react";
import { Camera, Video, UploadCloud, Trash2, ShieldAlert } from "lucide-react";
import { useCamera } from "../hooks/useCamera";
import { useVideoRecorder } from "../hooks/useVideoRecorder";
import { useFileValidation } from "../hooks/useFileValidation";
import { useUpload } from "../hooks/useUpload";
import CameraPreview from "./CameraPreview";
import VideoRecorder from "./VideoRecorder";
import FileUpload from "./FileUpload";
import UploadProgress from "./UploadProgress";
import PreviewModal from "./PreviewModal";

interface MediaCaptureProps {
  onMediaUploaded: (media: { url: string; type: string }[]) => void;
  attachedMedia: { url: string; type: string }[];
  onRemoveAttached: (url: string) => void;
}

export default function MediaCapture({
  onMediaUploaded,
  attachedMedia,
  onRemoveAttached,
}: MediaCaptureProps) {
  const [activeTab, setActiveTab] = useState<"PHOTO" | "VIDEO" | "UPLOAD">("UPLOAD");
  const [isInitializing, setIsInitializing] = useState(false);
  
  const [capturedSrc, setCapturedSrc] = useState<string | null>(null);
  const [capturedMime, setCapturedMime] = useState<string>("");
  const [capturedFileName, setCapturedFileName] = useState<string>("");

  const camera = useCamera();
  const videoRecorder = useVideoRecorder(camera.stream);
  const validator = useFileValidation();
  const uploader = useUpload();

  useEffect(() => {
    const currentAttachedUrls = new Set(attachedMedia.map((m) => m.url));
    const newCompletedItems = uploader.queue
      .filter((item) => item.status === "completed" && item.response?.url && !currentAttachedUrls.has(item.response.url))
      .map((item) => ({
        url: item.response!.url,
        type: item.file.type,
      }));

    if (newCompletedItems.length > 0) {
      onMediaUploaded(newCompletedItems);
    }
  }, [uploader.queue, attachedMedia, onMediaUploaded]);

  const handleStartCamera = async () => {
    handleStopCamera();
    setIsInitializing(true);
    await camera.startCamera();
    setIsInitializing(false);
  };

  const handleStopCamera = () => {
    camera.stopCamera();
    videoRecorder.cancelRecording();
  };

  const handleCapturePhoto = () => {
    const dataUrl = camera.capturePhoto();
    if (dataUrl) {
      setCapturedSrc(dataUrl);
      setCapturedMime("image/jpeg");
      setCapturedFileName(`capture-${Date.now()}.jpg`);
      camera.stopCamera();
    }
  };

  const handleStopRecordingVideo = () => {
    videoRecorder.stopRecording();
  };

  useEffect(() => {
    if (videoRecorder.recordedBlob) {
      const url = URL.createObjectURL(videoRecorder.recordedBlob);
      setCapturedSrc(url);
      setCapturedMime(videoRecorder.recordedBlob.type || "video/webm");
      setCapturedFileName(`record-${Date.now()}.webm`);
      camera.stopCamera();
    }
  }, [videoRecorder.recordedBlob]);

  const handleFilesSelected = async (files: File[]) => {
    validator.clearValidation();
    
    for (const file of files) {
      const isValid = await validator.validateFile(file);
      if (isValid) {
        uploader.addFilesToQueue([file]);
      }
    }
  };

  const handleConfirmPreview = (finalFile: File) => {
    uploader.addFilesToQueue([finalFile]);
    setCapturedSrc(null);
    handleStopCamera();
    setActiveTab("UPLOAD");
  };

  const handleCancelPreview = () => {
    setCapturedSrc(null);
    videoRecorder.cancelRecording();
    handleStartCamera();
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-white border border-slate-200/50 rounded-2xl p-4 shadow-sm">
      <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("UPLOAD");
            handleStopCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "UPLOAD"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Files</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("PHOTO");
            handleStartCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "PHOTO"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Snap Photo</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("VIDEO");
            handleStartCamera();
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "VIDEO"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Record Video</span>
        </button>
      </div>

      <div className="min-h-[140px] flex flex-col items-center justify-center w-full">
        {activeTab === "UPLOAD" && (
          <FileUpload
            onFilesSelected={handleFilesSelected}
            error={validator.error}
            warning={validator.warning}
          />
        )}

        {activeTab === "PHOTO" && (
          <div className="w-full flex flex-col gap-3">
            <CameraPreview
              videoRef={camera.videoRef}
              stream={camera.stream}
              devices={camera.devices}
              activeDeviceId={camera.activeDeviceId}
              facingMode={camera.facingMode}
              isLowLight={camera.isLowLight}
              onToggleFacing={camera.toggleFacingMode}
              onToggleLowLight={() => camera.setIsLowLight(!camera.isLowLight)}
              onCapture={handleCapturePhoto}
              onStop={handleStopCamera}
              error={camera.error}
              isLoading={isInitializing}
            />
          </div>
        )}

        {activeTab === "VIDEO" && (
          <div className="w-full flex flex-col gap-3">
            <VideoRecorder
              videoRef={camera.videoRef}
              stream={camera.stream}
              devices={camera.devices}
              facingMode={camera.facingMode}
              isLowLight={camera.isLowLight}
              onToggleFacing={camera.toggleFacingMode}
              onToggleLowLight={() => camera.setIsLowLight(!camera.isLowLight)}
              isRecording={videoRecorder.isRecording}
              recordingDuration={videoRecorder.recordingDuration}
              onStartRecording={videoRecorder.startRecording}
              onStopRecording={handleStopRecordingVideo}
              onCancel={handleStopCamera}
              error={videoRecorder.error || camera.error}
              isLoading={isInitializing}
            />
          </div>
        )}
      </div>

      <UploadProgress
        queue={uploader.queue}
        onStartUpload={(id) => uploader.startUpload(id)}
        onRemoveItem={(id) => uploader.removeQueueItem(id)}
        onRetryItem={(id) => uploader.startUpload(id)}
      />

      {uploader.queue.some((it) => it.status === "pending") && (
        <button
          type="button"
          onClick={() => uploader.uploadAll()}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Queue Files ({uploader.queue.filter((it) => it.status === "pending").length} Pending)</span>
        </button>
      )}

      {attachedMedia.length > 0 && (
        <div className="flex flex-col gap-2 mt-2 border-t border-slate-150 pt-3 w-full">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Attached Evidence ({attachedMedia.length})
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {attachedMedia.map((media, index) => {
              const isVideoUrl = media.type.startsWith("video/") || media.url.endsWith(".mp4") || media.url.endsWith(".webm") || media.url.endsWith(".mov");
              return (
                <div key={index} className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group">
                  {isVideoUrl ? (
                    <video src={media.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={media.url} alt="Evidence Preview" className="w-full h-full object-cover" />
                  )}

                  <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    {isVideoUrl ? "VIDEO" : "PHOTO"}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveAttached(media.url)}
                    className="absolute inset-0 bg-slate-950/85 flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold gap-1"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Remove</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {capturedSrc && (
        <PreviewModal
          mediaSrc={capturedSrc}
          mimeType={capturedMime}
          fileName={capturedFileName}
          onConfirm={handleConfirmPreview}
          onCancel={handleCancelPreview}
        />
      )}

      <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/50 mt-1">
        <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-600">Privacy Notice:</span> Submitted photos/videos are securely saved on our civic engagement portal. We automatically strip coordinate tags or private metadata on request. Blurring faces and license plates can be processed on-demand.
        </p>
      </div>
    </div>
  );
}
