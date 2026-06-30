export interface UploadProgressInfo {
  percent: number;
  loaded: number;
  total: number;
  estimatedSecRemaining?: number;
}

export interface UploadResponse {
  fileId: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  size: number;
  type: string;
  name: string;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

export function uploadMedia(
  file: File,
  options?: {
    issueId?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
    onProgress?: (progress: UploadProgressInfo) => void;
  }
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    
    if (options?.issueId) formData.append("issueId", options.issueId);
    if (options?.latitude !== undefined) formData.append("latitude", options.latitude.toString());
    if (options?.longitude !== undefined) formData.append("longitude", options.longitude.toString());
    if (options?.timestamp) formData.append("timestamp", options.timestamp);

    const startTime = Date.now();

    if (options?.onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const elapsedMs = Date.now() - startTime;
          let estimatedSecRemaining: number | undefined;
          
          if (elapsedMs > 500 && percent > 0) {
            const bytesPerMs = e.loaded / elapsedMs;
            const bytesRemaining = e.total - e.loaded;
            estimatedSecRemaining = Math.max(0, Math.round((bytesRemaining / bytesPerMs) / 1000));
          }

          options.onProgress?.({
            percent,
            loaded: e.loaded,
            total: e.total,
            estimatedSecRemaining,
          });
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (err) {
          const preview = xhr.responseText ? (xhr.responseText.substring(0, 150) + "...") : "Empty Response";
          reject(new Error(`Invalid response received from server. Preview: ${preview}`));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          reject(new Error(errData.error || `Upload failed with status ${xhr.status}`));
        } catch {
          const preview = xhr.responseText ? (xhr.responseText.substring(0, 150) + "...") : "Empty Response";
          reject(new Error(`Upload failed with status ${xhr.status}. Preview: ${preview}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error. Check your network and try again."));
    };

    xhr.open("POST", "/api/media/upload");

    const userId = localStorage.getItem("civic_watch_user_id");
    if (userId) {
      xhr.setRequestHeader("x-user-id", userId);
    }

    xhr.send(formData);
  });
}

export async function uploadMediaChunked(
  file: File,
  options?: {
    issueId?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
    onProgress?: (progress: UploadProgressInfo) => void;
    sessionId?: string;
  }
): Promise<UploadResponse> {
  const sessionId = options?.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  let chunkIndex = 0;
  
  // Try to retrieve resume index if session exists
  try {
    const statusRes = await fetch(`/api/media/upload-chunked/status?sessionId=${sessionId}`);
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.nextChunkIndex !== undefined) {
        chunkIndex = statusData.nextChunkIndex;
      }
    }
  } catch (err) {
    console.warn("Failed to check resumable status, starting from chunk 0", err);
  }

  const startTime = Date.now();

  while (chunkIndex < totalChunks) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("sessionId", sessionId);
    formData.append("filename", file.name);
    formData.append("mimeType", file.type);
    
    if (options?.issueId) formData.append("issueId", options.issueId);
    if (options?.latitude !== undefined) formData.append("latitude", options.latitude.toString());
    if (options?.longitude !== undefined) formData.append("longitude", options.longitude.toString());
    if (options?.timestamp) formData.append("timestamp", options.timestamp);

    const chunkUploadPromise = () => new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            const preview = xhr.responseText ? (xhr.responseText.substring(0, 150) + "...") : "Empty Response";
            reject(new Error(`Malformed chunk response. Preview: ${preview}`));
          }
        } else {
          const preview = xhr.responseText ? (xhr.responseText.substring(0, 150) + "...") : "Empty Response";
          reject(new Error(`Chunk upload failed with status ${xhr.status}. Preview: ${preview}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network connection error during chunk upload"));
      xhr.open("POST", "/api/media/upload-chunked");

      const userId = localStorage.getItem("civic_watch_user_id");
      if (userId) {
        xhr.setRequestHeader("x-user-id", userId);
      }

      xhr.send(formData);
    });

    const result = await chunkUploadPromise();
    chunkIndex++;

    if (options?.onProgress) {
      const loaded = Math.min(chunkIndex * chunkSize, file.size);
      const percent = Math.round((loaded / file.size) * 100);
      const elapsedMs = Date.now() - startTime;
      let estimatedSecRemaining: number | undefined;

      if (elapsedMs > 500 && percent > 0) {
        const bytesPerMs = loaded / elapsedMs;
        const bytesRemaining = file.size - loaded;
        estimatedSecRemaining = Math.max(0, Math.round((bytesRemaining / bytesPerMs) / 1000));
      }

      options.onProgress({
        percent,
        loaded,
        total: file.size,
        estimatedSecRemaining,
      });
    }

    if (result.uploadComplete) {
      return result;
    }
  }

  throw new Error("Resumable upload did not finalize successfully.");
}

export async function deleteMedia(fileId: string): Promise<void> {
  const res = await fetch(`/api/media/${fileId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to delete file from platform storage.");
  }
}
