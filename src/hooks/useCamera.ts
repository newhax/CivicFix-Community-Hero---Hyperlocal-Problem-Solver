import { useState, useEffect, useRef, useCallback } from "react";

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isLowLight, setIsLowLight] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Get list of cameras
  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !activeDeviceId) {
        const backCam = videoDevices.find((d) => 
          d.label.toLowerCase().includes("back") || 
          d.label.toLowerCase().includes("environment") ||
          d.label.toLowerCase().includes("rear")
        );
        setActiveDeviceId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn("Could not enumerate media devices:", err);
    }
  }, [activeDeviceId]);

  // Start stream
  const startCamera = useCallback(async (deviceId?: string, forceFacingMode?: "user" | "environment") => {
    setError(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 1920, max: 4096 },
        height: { ideal: 1080, max: 2160 },
      },
      audio: true,
    };

    if (deviceId) {
      (constraints.video as MediaTrackConstraints).deviceId = { exact: deviceId };
    } else if (forceFacingMode) {
      (constraints.video as MediaTrackConstraints).facingMode = forceFacingMode;
    } else {
      (constraints.video as MediaTrackConstraints).facingMode = facingMode;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setPermissionState("granted");
      
      const activeTrack = mediaStream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.facingMode) {
          setFacingMode(settings.facingMode as "user" | "environment");
        }
      }

      await refreshDevices();
    } catch (err: any) {
      console.error("Camera connection error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied");
        setError("Camera permission was denied. Please grant permission in your browser or device settings.");
      } else {
        setError("Your camera is in use by another tab, or no physical camera is connected.");
      }
    }
  }, [facingMode, stream, refreshDevices]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Toggle front/back camera
  const toggleFacingMode = useCallback(async () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    await startCamera(undefined, nextFacing);
  }, [facingMode, startCamera]);

  // Switch to specific camera
  const switchDevice = useCallback(async (deviceId: string) => {
    setActiveDeviceId(deviceId);
    await startCamera(deviceId);
  }, [startCamera]);

  // Take photo
  const capturePhoto = useCallback((customCanvas?: HTMLCanvasElement): string | null => {
    if (!videoRef.current || !stream) return null;
    const video = videoRef.current;
    const canvas = customCanvas || document.createElement("canvas");
    
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (isLowLight) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.35);     // Brighter Red
        data[i + 1] = Math.min(255, data[i + 1] * 1.35); // Brighter Green
        data[i + 2] = Math.min(255, data[i + 2] * 1.35); // Brighter Blue
      }
      ctx.putImageData(imgData, 0, 0);
    }

    return canvas.toDataURL("image/jpeg", 0.95);
  }, [stream, isLowLight]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    devices,
    activeDeviceId,
    permissionState,
    error,
    facingMode,
    isLowLight,
    setIsLowLight,
    videoRef,
    startCamera,
    stopCamera,
    toggleFacingMode,
    switchDevice,
    capturePhoto,
  };
}
