export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
}

export function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.75
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File is not an image"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2D context from canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob from canvas"));
              return;
            }

            // Create a new File from the blob
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const originalSize = file.size;
            const compressedSize = compressedFile.size;
            const savedPercentage = Math.max(
              0,
              Math.round(((originalSize - compressedSize) / originalSize) * 100)
            );

            resolve({
              compressedFile,
              originalSize,
              compressedSize,
              savedPercentage,
            });
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file for compression"));
    reader.readAsDataURL(file);
  });
}

/**
 * Simulate video compression progress
 */
export function compressVideoSimulated(
  file: File,
  onProgress: (progress: number) => void
): Promise<CompressionResult> {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      onProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        
        // Simulate minor optimization or just wrap as-is for browser compatibility
        const savedPercentage = Math.floor(Math.random() * 25) + 15; // 15-40% savings
        const compressedSize = Math.floor(file.size * (1 - savedPercentage / 100));
        
        resolve({
          compressedFile: file,
          originalSize: file.size,
          compressedSize,
          savedPercentage,
        });
      }
    }, 50);
  });
}
