import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsApi } from "@/lib/google-maps";

interface UseGoogleMapsOptions {
  center: google.maps.LatLngLiteral;
  zoom?: number;
}

interface UseGoogleMapsResult {
  mapRef: React.RefObject<HTMLDivElement | null>;
  map: google.maps.Map | null;
  isLoaded: boolean;
  error: Error | null;
}

export function useGoogleMaps(options: UseGoogleMapsOptions): UseGoogleMapsResult {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { lat, lng } = options.center;
  const zoom = options.zoom ?? 14;

  useEffect(() => {
    if (!mapRef.current || map) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        const maps = await loadGoogleMapsApi();

        if (!isMounted || !mapRef.current) return;

        const mapInstance = new maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setMap(mapInstance);
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load Google Maps:", err);
        setError(err instanceof Error ? err : new Error("Failed to load Google Maps"));
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [lat, lng, zoom]);

  return { mapRef, map, isLoaded, error };
}
