import { Coordinates } from '../types';

// Haversine formula to calculate distance between two points in meters
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Simulation of a "Smart Route" check
export const checkRouteDeviation = (current: Coordinates, expectedRoutePoints: Coordinates[]): boolean => {
  // If the student is further than 500m from ANY point on their expected route, flag it.
  const minDistance = Math.min(...expectedRoutePoints.map(p => calculateDistance(current, p)));
  return minDistance > 500;
};

// Mock Battery Safe Mode Logic
export const getTrackingConfig = (batterySaver: boolean) => {
  if (batterySaver) {
    return {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 30000 // Accept positions up to 30 seconds old
    };
  }
  return {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };
};