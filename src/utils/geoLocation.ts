export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

export function getGeoLocation(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    const requestPos = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
          });
        },
        (error) => {
          if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
            console.warn("High accuracy geolocation failed. Retrying with standard accuracy...");
            requestPos(false);
          } else {
            let msg = "Failed to get location";
            if (error.code === error.PERMISSION_DENIED) {
              msg = "Location permission denied";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              msg = "Location position unavailable";
            } else if (error.code === error.TIMEOUT) {
              msg = "Location request timed out";
            }
            reject(new Error(msg));
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 5000 : 15000, maximumAge: highAccuracy ? 0 : 300000 }
      );
    };

    requestPos(true);
  });
}
