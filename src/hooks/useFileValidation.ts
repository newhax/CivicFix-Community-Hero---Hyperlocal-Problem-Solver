import { useState, useCallback } from "react";
import {
  validateFileBasics,
  validateImageDimensions,
  validateVideoMetadata,
} from "../utils/fileValidation";

export function useFileValidation() {
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    setError(null);
    setWarning(null);
    setIsValidating(true);

    try {
      const basicResult = validateFileBasics(file);
      if (!basicResult.isValid) {
        setError(basicResult.error || "File check failed.");
        setIsValidating(false);
        return false;
      }

      if (basicResult.warning) {
        setWarning(basicResult.warning);
      }

      if (file.type.startsWith("image/")) {
        const dimResult = await validateImageDimensions(file);
        if (!dimResult.isValid) {
          setError(dimResult.error || "Image dimension validation failed.");
          setIsValidating(false);
          return false;
        }
      } else if (file.type.startsWith("video/")) {
        const videoResult = await validateVideoMetadata(file);
        if (!videoResult.isValid) {
          setError(videoResult.error || "Video verification failed.");
          setIsValidating(false);
          return false;
        }
      }

      setIsValidating(false);
      return true;
    } catch (err) {
      console.error("Validation error:", err);
      setError("Failed to complete file specifications check.");
      setIsValidating(false);
      return false;
    }
  }, []);

  const clearValidation = useCallback(() => {
    setError(null);
    setWarning(null);
  }, []);

  return {
    error,
    warning,
    isValidating,
    validateFile,
    clearValidation,
  };
}
