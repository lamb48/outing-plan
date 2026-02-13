import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let isLoading = false
let isLoaded = false
let loadPromise: Promise<typeof google.maps> | null = null

export async function loadGoogleMapsApi(): Promise<typeof google.maps> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set')
  }

  if (isLoaded && window.google?.maps) {
    return window.google.maps
  }

  if (isLoading && loadPromise) {
    return loadPromise
  }

  isLoading = true

  loadPromise = (async () => {
    try {
      setOptions({
        key: apiKey,
        v: 'weekly',
      })

      await importLibrary('maps')
      await importLibrary('places')
      await importLibrary('geometry')
      await importLibrary('marker')

      isLoaded = true
      isLoading = false
      return window.google.maps
    } catch (error) {
      isLoading = false
      loadPromise = null
      throw error
    }
  })()

  return loadPromise
}

export interface MarkerOptions {
  position: google.maps.LatLngLiteral
  map: google.maps.Map
  label?: string
  title?: string
}

export function createNumberedMarker(options: MarkerOptions): google.maps.Marker {
  return new google.maps.Marker({
    position: options.position,
    map: options.map,
    label: options.label ? {
      text: options.label,
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: '14px',
    } : undefined,
    title: options.title,
  })
}

export interface RouteOptions {
  origin: google.maps.LatLngLiteral
  destination: google.maps.LatLngLiteral
  waypoints?: google.maps.DirectionsWaypoint[]
}

export async function calculateRoute(
  options: RouteOptions
): Promise<google.maps.DirectionsResult> {
  const directionsService = new google.maps.DirectionsService()

  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin: options.origin,
        destination: options.destination,
        waypoints: options.waypoints,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result)
        } else {
          reject(new Error(`Directions request failed: ${status}`))
        }
      }
    )
  })
}

export function createPolyline(
  path: google.maps.LatLng[],
  map: google.maps.Map
): google.maps.Polyline {
  return new google.maps.Polyline({
    path,
    geodesic: true,
    strokeColor: '#137fec',
    strokeOpacity: 1.0,
    strokeWeight: 3,
    map,
  })
}
