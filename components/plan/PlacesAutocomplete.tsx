"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PlacesAutocompleteProps {
  value?: string;
  onPlaceSelect: (place: {
    latitude: number;
    longitude: number;
    name: string;
    address?: string;
  }) => void;
  disabled?: boolean;
  isGettingLocation?: boolean;
  onGetCurrentLocation?: () => void;
  submitButton?: React.ReactNode;
}

export function PlacesAutocomplete({
  value,
  onPlaceSelect,
  disabled,
  isGettingLocation,
  onGetCurrentLocation,
  submitButton,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef(value);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState(value || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        console.log("API Key present:", !!apiKey);

        if (!apiKey) {
          setError("Google Maps APIキーが設定されていません");
          setIsLoading(false);
          return;
        }

        // Google Maps APIスクリプトを動的に読み込む
        if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
          console.log("Loading Google Maps script...");
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ja&loading=async`;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Google Maps script load timeout"));
            }, 10000); // 10秒のタイムアウト

            script.onload = () => {
              clearTimeout(timeout);
              console.log("Google Maps script loaded");
              resolve();
            };
            script.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Failed to load Google Maps script"));
            };
          });
        } else if (!window.google?.maps) {
          console.log("Waiting for Google Maps to initialize...");
          // スクリプトは存在するが、まだロードされていない場合は待機
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Google Maps initialization timeout"));
            }, 10000);

            const checkInterval = setInterval(() => {
              if (window.google?.maps) {
                clearTimeout(timeout);
                clearInterval(checkInterval);
                console.log("Google Maps initialized");
                resolve();
              }
            }, 100);
          });
        }

        // Places ライブラリが確実にロードされるまで待機
        if (!window.google?.maps?.places) {
          console.log("Waiting for Places library to initialize...");
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Places library initialization timeout"));
            }, 10000);

            const checkInterval = setInterval(() => {
              if (window.google?.maps?.places) {
                clearTimeout(timeout);
                clearInterval(checkInterval);
                console.log("Places library initialized");
                resolve();
              }
            }, 100);
          });
        }

        if (!inputRef.current) {
          console.log("Input ref not available");
          setIsLoading(false);
          return;
        }

        console.log("Creating Autocomplete instance...");
        const autocompleteInstance = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ["geometry", "name", "formatted_address"],
          componentRestrictions: { country: "jp" }, // 日本に限定
        });

        autocompleteInstance.addListener("place_changed", () => {
          const place = autocompleteInstance.getPlace();

          if (!place.geometry?.location) {
            console.error("Place has no geometry");
            return;
          }

          const latitude = place.geometry.location.lat();
          const longitude = place.geometry.location.lng();
          const name = place.name || "";
          const address = place.formatted_address;

          setInputValue(name);
          onPlaceSelect({
            latitude,
            longitude,
            name,
            address,
          });
        });

        console.log("Autocomplete initialized successfully");
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading Google Maps:", err);
        setError(err instanceof Error ? err.message : "Google Mapsの読み込みに失敗しました");
        setIsLoading(false);
      }
    };

    initAutocomplete();
  }, [onPlaceSelect]);

  // 外部からのvalue変更を内部状態に反映
  useEffect(() => {
    if (value !== undefined && value !== prevValueRef.current) {
      prevValueRef.current = value;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputValue(value);
    }
  }, [value]);

  return (
    <div className="relative flex items-center gap-2 rounded-full bg-white px-3 py-3 shadow-lg sm:gap-3 sm:px-6 sm:py-4 md:px-8 md:py-5">
      <MapPin className="h-4 w-4 shrink-0 text-gray-500 sm:h-5 sm:w-5 md:h-6 md:w-6" />

      {error ? (
        <div className="flex flex-1 items-center gap-2 text-red-500">
          <span className="text-xs sm:text-sm md:text-base">{error}</span>
        </div>
      ) : isLoading ? (
        <div className="flex flex-1 items-center gap-2 text-gray-400">
          <Loader2 className="h-3 w-3 animate-spin sm:h-4 sm:w-4 md:h-5 md:w-5" />
          <span className="text-xs sm:text-sm md:text-base">読み込み中...</span>
        </div>
      ) : (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 border-0 bg-transparent pr-0 pl-1 text-xs font-medium text-gray-800 placeholder:font-normal placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-sm md:text-base"
          placeholder="どこから出発しますか？"
          disabled={disabled || isLoading}
        />
      )}

      {onGetCurrentLocation && !error && !isLoading && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onGetCurrentLocation}
          disabled={disabled || isGettingLocation}
          className="h-7 w-7 shrink-0 sm:h-8 sm:w-8 md:h-10 md:w-10"
        >
          {isGettingLocation ? (
            <Loader2 className="h-3 w-3 animate-spin text-gray-700 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          ) : (
            <LocateFixed className="h-3 w-3 text-gray-700 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          )}
        </Button>
      )}

      {submitButton && !error && !isLoading && <div className="shrink-0">{submitButton}</div>}
    </div>
  );
}
