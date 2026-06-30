import { useState, useCallback, useRef } from "react";
import { uploadMedia, uploadMediaChunked, UploadResponse, UploadProgressInfo } from "../utils/storageAPI";
import { compressImage, compressVideoSimulated } from "../utils/fileCompression";
import { getGeoLocation } from "../utils/geoLocation";

export interface QueueItem {
  id: string;
  file: File;
  status: "pending" | "compressing" | "uploading" | "completed" | "failed";
  progress: number;
  originalSize: number;
  compressedSize?: number;
  savedPercentage?: number;
  estimatedSecRemaining?: number;
  response?: UploadResponse;
  error?: string;
  sessionId?: string; // for chunked session identification
}

export function useUpload() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  const updateQueueItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const addFilesToQueue = useCallback((files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      file,
      status: "pending",
      progress: 0,
      originalSize: file.size,
      sessionId: file.size > 2 * 1024 * 1024 ? `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}` : undefined,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    return newItems;
  }, []);

  const processUploadItem = useCallback(async (item: QueueItem, issueId?: string) => {
    const id = item.id;
    
    // 1. Capture Location Metadata
    let location: { latitude?: number; longitude?: number } = {};
    try {
      const coords = await getGeoLocation();
      location = { latitude: coords.latitude, longitude: coords.longitude };
    } catch (e) {
      console.warn("Could not retrieve GPS coordinates for metadata tagging", e);
    }

    // 2. Pre-Upload Compression
    updateQueueItem(id, { status: "compressing", progress: 0 });
    let fileToUpload = item.file;
    let compressedSize = item.file.size;
    let savedPercentage = 0;

    try {
      if (item.file.type.startsWith("image/")) {
        const compRes = await compressImage(item.file);
        fileToUpload = compRes.compressedFile;
        compressedSize = compRes.compressedSize;
        savedPercentage = compRes.savedPercentage;
      } else if (item.file.type.startsWith("video/")) {
        const compRes = await compressVideoSimulated(item.file, (p) => {
          updateQueueItem(id, { progress: p });
        });
        compressedSize = compRes.compressedSize;
        savedPercentage = compRes.savedPercentage;
      }
      
      updateQueueItem(id, { 
        compressedSize, 
        savedPercentage, 
        status: "uploading", 
        progress: 0 
      });
    } catch (err: any) {
      console.warn("Client pre-compression bypassed or failed, using original file:", err);
      updateQueueItem(id, { status: "uploading", progress: 0 });
    }

    // 3. Network upload transmission
    try {
      const onProgress = (prog: UploadProgressInfo) => {
        updateQueueItem(id, { 
          progress: prog.percent,
          estimatedSecRemaining: prog.estimatedSecRemaining
        });
      };

      const uploadOpts = {
        issueId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
        onProgress,
        sessionId: item.sessionId,
      };

      let response: UploadResponse;
      if (fileToUpload.size > 2 * 1024 * 1024) {
        response = await uploadMediaChunked(fileToUpload, uploadOpts);
      } else {
        response = await uploadMedia(fileToUpload, uploadOpts);
      }

      updateQueueItem(id, {
        status: "completed",
        progress: 100,
        estimatedSecRemaining: undefined,
        response,
      });
      return response;
    } catch (err: any) {
      console.error(`Media transmission failed for queue ID ${id}:`, err);
      updateQueueItem(id, {
        status: "failed",
        error: err.message || "Upload stopped due to connection issues.",
        estimatedSecRemaining: undefined,
      });
      throw err;
    }
  }, [updateQueueItem]);

  const startUpload = useCallback(async (id: string, issueId?: string) => {
    const item = queueRef.current.find((it) => it.id === id);
    if (!item) return;
    try {
      await processUploadItem(item, issueId);
    } catch (err) {
      // Handled in processUploadItem
    }
  }, [processUploadItem]);

  const uploadAll = useCallback(async (issueId?: string) => {
    const pendingItems = queueRef.current.filter((item) => item.status === "pending" || item.status === "failed");
    const promises = pendingItems.map((item) => processUploadItem(item, issueId));
    return Promise.allSettled(promises);
  }, [processUploadItem]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const removeQueueItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    queue,
    addFilesToQueue,
    startUpload,
    uploadAll,
    clearQueue,
    removeQueueItem,
    updateQueueItem,
  };
}
