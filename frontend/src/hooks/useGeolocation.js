import { useState } from "react";

export default function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLoading(false);
      },
      (err) => {
        setLoading(false);

        if (err.code === 1) {
          setError("Location permission was denied.");
        } else if (err.code === 2) {
          setError("Your location could not be determined.");
        } else if (err.code === 3) {
          setError("Location request timed out.");
        } else {
          setError("Unable to get your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return {
    location,
    loading,
    error,
    getLocation,
  };
}