import { useState, useRef, useEffect, useCallback } from "react";

export function useVideoRecorder(cameraStream: MediaStream | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0); // in seconds
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxDuration = 5 * 60; // 5 minutes (300 seconds)

  const stopAudio = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    setError(null);
    setRecordedBlob(null);
    setRecordingDuration(0);
    chunksRef.current = [];
    stopAudio();

    if (!cameraStream) {
      setError("No camera active. Start the camera before recording.");
      return;
    }

    const runRecording = async () => {
      let recordingStream = cameraStream;
      
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
        if (audioStream) {
          audioStreamRef.current = audioStream;
          const combinedTracks = [
            ...cameraStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ];
          recordingStream = new MediaStream(combinedTracks);
        }
      } catch (err) {
        console.warn("Could not attach audio tracks, proceeding as video only", err);
      }

      // Supported MIME types
      const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
      let selectedMimeType = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      try {
        const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
        const mediaRecorder = new MediaRecorder(recordingStream, options);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: selectedMimeType || "video/webm" });
          setRecordedBlob(blob);
          setIsRecording(false);
          stopAudio();
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        };

        mediaRecorder.start(1000);
        setIsRecording(true);

        timerRef.current = setInterval(() => {
          setRecordingDuration((prev) => {
            if (prev >= maxDuration - 1) {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
              }
              return maxDuration;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (err) {
        console.error("Failed to start MediaRecorder:", err);
        setError("Your browser does not support video recording with these settings.");
        stopAudio();
      }
    };

    runRecording();
  }, [cameraStream, stopAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }
    stopAudio();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
    chunksRef.current = [];
    setRecordedBlob(null);
  }, [stopAudio]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    recordingDuration,
    recordedBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
