import { EstablishmentSearchParams, Establishment, establishmentsAPI } from '@/services/api';

class EstablishmentService {
  // Cache search results to reduce API calls
  private cache: Map<string, { data: Establishment[], timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Generate a cache key from search params
  private generateCacheKey(params: EstablishmentSearchParams): string {
    return `${params.latitude},${params.longitude},${params.radius || ''},${params.type || ''},${params.keyword || ''}`;
  }

  // Check if cache is valid
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < this.CACHE_DURATION;
  }

  // Search for establishments
  async searchEstablishments(params: EstablishmentSearchParams): Promise<Establishment[]> {
    if (!params.latitude || !params.longitude) {
      console.error('Invalid coordinates for establishment search');
      return [];
    }
    
    try {
      const cacheKey = this.generateCacheKey(params);
      
      // Return cached data if valid
      if (this.isCacheValid(cacheKey)) {
        console.log('Using cached establishment data');
        return this.cache.get(cacheKey)!.data;
      }
      
      console.log('Fetching new establishment data:', params);
      // Use the existing API implementation from services/api.ts
      const data = await establishmentsAPI.searchEstablishments(params);
      
      // Cache the results
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      return data;
    } catch (error) {
      console.error('Error searching establishments:', error);
      
      // Try the OSM fallback if the main API fails
      try {
        console.log('Trying OSM fallback for establishments');
        // Use the existing OSM fallback from services/api.ts
        const osmData = await establishmentsAPI.searchOSMEstablishments(params);
        return osmData;
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        return []; // Return empty array instead of throwing
      }
    }
  }

  // Get establishment details
  async getEstablishmentDetails(id: string): Promise<any> {
    try {
      return await establishmentsAPI.getEstablishmentDetails(id);
    } catch (error) {
      console.error('Error getting establishment details:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new EstablishmentService();