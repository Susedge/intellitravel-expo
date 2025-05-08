import axios from 'axios';

const GEOAPIFY_API_KEY = '84bd4ab6f40147c580e54185d36db93d';
const BASE_URL = 'https://api.geoapify.com';

// Ensure we're using HTTPS to avoid CLEAR_TEXT errors
const ensureHttps = (url: string) => {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

export interface GeoapifyPlace {
  place_id: string;
  name: string;
  categories?: string[];
  address_line1?: string;
  address_line2?: string;
  formatted?: string;
  lat: number;
  lon: number;
  distance?: number;
  type?: string;
}

export interface GeoapifyRouteResponse {
  type: string;
  features: Array<{
    type: string;
    properties: {
      mode: string;
      distance: number;
      time: number;
      legs: Array<any>;
    };
    geometry: {
      type: string;
      coordinates: number[][] | number[][][];
    };
  }>;
}

export default {
  // Search for places nearby
  searchPlaces: async (params: {
    lat: number;
    lon: number;
    radius?: number;
    categories?: string[];
    limit?: number;
    name?: string;
  }): Promise<GeoapifyPlace[]> => {
    try {
      const { lat, lon, radius = 5000, categories = [], limit = 20, name } = params;
      
      let url = `${BASE_URL}/v2/places?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;
      
      if (categories.length > 0) {
        url += `&categories=${categories.join(',')}`;
      }
      
      if (name) {
        url += `&name=${encodeURIComponent(name)}`;
      }
      
      const response = await axios.get(ensureHttps(url));
      
      if (response.data && response.data.features) {
        return response.data.features.map((feature: any) => ({
          place_id: feature.properties.place_id,
          name: feature.properties.name || feature.properties.formatted || 'Unnamed Place',
          categories: feature.properties.categories,
          formatted: feature.properties.formatted,
          address_line1: feature.properties.address_line1,
          address_line2: feature.properties.address_line2,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          distance: feature.properties.distance,
          type: feature.properties.category
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error searching places:', error);
      throw error;
    }
  },
  
  // Get routing directions
  getRouteDirections: async (
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    mode: 'drive' | 'walk' | 'bicycle' = 'drive'
  ): Promise<GeoapifyRouteResponse> => {
    try {
      const waypoints = `${startLat},${startLon}|${endLat},${endLon}`;
      const url = `${BASE_URL}/v1/routing?waypoints=${waypoints}&mode=${mode}&details=instruction&apiKey=${GEOAPIFY_API_KEY}`;
      
      const response = await axios.get(ensureHttps(url));
      return response.data;
    } catch (error) {
      console.error('Error getting route directions:', error);
      throw error;
    }
  },
  
  // Geocode an address
  geocodeAddress: async (address: string): Promise<GeoapifyPlace[]> => {
    try {
      const url = `${BASE_URL}/v1/geocode/search?text=${encodeURIComponent(address)}&format=json&apiKey=${GEOAPIFY_API_KEY}`;
      
      const response = await axios.get(ensureHttps(url));
      
      if (response.data && response.data.results) {
        return response.data.results.map((result: any) => ({
          place_id: result.place_id || String(Math.random()),
          name: result.formatted || address,
          formatted: result.formatted,
          address_line1: result.address_line1,
          address_line2: result.address_line2,
          lat: result.lat,
          lon: result.lon,
          type: result.result_type
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  }
};