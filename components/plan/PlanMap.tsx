"use client";

import { useEffect, useState } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { createNumberedMarker, calculateRoute, createPolyline } from "@/lib/google-maps";
import { Loader2 } from "lucide-react";

interface Spot {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  order: number;
}

interface PlanMapProps {
  spots: Spot[];
  className?: string;
}

export function PlanMap({ spots, className }: PlanMapProps) {
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polylines, setPolylines] = useState<google.maps.Polyline[]>([]);

  const center =
    spots.length > 0 ? { lat: spots[0].lat, lng: spots[0].lng } : { lat: 35.6812, lng: 139.7671 };

  const { mapRef, map, isLoaded, error } = useGoogleMaps({ center, zoom: 14 });

  useEffect(() => {
    if (!map || !isLoaded || spots.length === 0) return;

    markers.forEach((marker) => marker.setMap(null));
    polylines.forEach((polyline) => polyline.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const bounds = new google.maps.LatLngBounds();

    spots.forEach((spot, index) => {
      const position = { lat: spot.lat, lng: spot.lng };

      const marker = createNumberedMarker({
        position,
        map,
        label: String(spot.order),
        title: spot.name,
      });

      newMarkers.push(marker);
      bounds.extend(position);
    });

    setMarkers(newMarkers);

    if (spots.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(15);
    } else {
      map.fitBounds(bounds);
    }

    if (spots.length > 1) {
      const origin = { lat: spots[0].lat, lng: spots[0].lng };
      const destination = { lat: spots[spots.length - 1].lat, lng: spots[spots.length - 1].lng };
      const waypoints = spots.slice(1, -1).map((spot) => ({
        location: { lat: spot.lat, lng: spot.lng },
        stopover: true,
      }));

      calculateRoute({ origin, destination, waypoints })
        .then((result) => {
          const route = result.routes[0];
          if (route && route.overview_path) {
            const polyline = createPolyline(route.overview_path, map);
            setPolylines([polyline]);
          }
        })
        .catch((err) => {
          console.error("Failed to calculate route:", err);
        });
    }

    return () => {
      markers.forEach((marker) => marker.setMap(null));
      polylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [map, isLoaded, spots]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <p className="text-red-600 font-medium mb-2">地図の読み込みに失敗しました</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">地図を読み込み中...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full rounded-lg" />
    </div>
  );
}
