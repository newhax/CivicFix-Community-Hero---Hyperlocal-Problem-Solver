export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

export function validateFileBasics(file: File): FileValidationResult {
  const allowedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];
  
  const isPhoto = allowedPhotoTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type);
  
  if (!isPhoto && !isVideo) {
    return {
      isValid: false,
      error: "Unsupported format. Only JPEG, PNG, WebP photos and MP4, MOV, WebM videos are supported.",
    };
  }
  
  if (isPhoto) {
    const maxPhotoSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxPhotoSize) {
      return {
        isValid: false,
        error: "Photo exceeds size limit of 10MB.",
      };
    }
  } else {
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const warningVideoSize = 50 * 1024 * 1024; // 50MB
    
    if (file.size > maxVideoSize) {
      return {
        isValid: false,
        error: "Video exceeds size limit of 100MB.",
      };
    }
    if (file.size > warningVideoSize) {
      return {
        isValid: true,
        warning: "Large file size. Upload may take longer and consume more bandwidth.",
      };
    }
  }
  
  return { isValid: true };
}

export function validateImageDimensions(file: File): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      const minW = 640, minH = 480;
      const maxW = 4096, maxH = 2160;
      
      if (width < minW || height < minH) {
        resolve({
          isValid: false,
          error: `Photo resolution too low (${width}x${height}px). Min required is 640x480px.`,
        });
      } else if (width > maxW || height > maxH) {
        resolve({
          isValid: false,
          error: `Photo resolution too high (${width}x${height}px). Max allowed is 4096x2160px.`,
        });
      } else {
        resolve({
          isValid: true,
          metadata: { width, height }
        });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        error: "Failed to load image for resolution validation.",
      });
    };
    img.src = url;
  });
}

export function validateVideoMetadata(file: File): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      
      const minW = 640, minH = 480;
      const maxW = 4096, maxH = 2160;
      const maxDuration = 5 * 60; // 5 minutes
      
      if (duration > maxDuration) {
        resolve({
          isValid: false,
          error: `Video length exceeds limit. Max length is 5 minutes. (Current: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s)`,
        });
      } else if (width > 0 && height > 0 && (width < minW || height < minH)) {
        resolve({
          isValid: false,
          error: `Video resolution too low (${width}x${height}px). Min required is 640x480px.`,
        });
      } else if (width > 0 && height > 0 && (width > maxW || height > maxH)) {
        resolve({
          isValid: false,
          error: `Video resolution too high (${width}x${height}px). Max allowed is 4096x2160px.`,
        });
      } else {
        resolve({
          isValid: true,
          metadata: { width, height, duration }
        });
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        error: "Failed to load video metadata. This might be an unsupported codec.",
      });
    };
    
    video.src = url;
  });
}
