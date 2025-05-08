import axios from 'axios';

const API_URL = 'https://c4x2t9vybus7.share.zrok.io/api/';
//const API_URL = 'http://192.168.100.4:8080/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interface for user registration data
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// Interface for login data
export interface LoginData {
  email: string;
  password: string;
}

// Interface for register response
export interface RegisterResponse {
  user: {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
  token: string;
}

// Interface for login response
export interface LoginResponse {
  user: {
    id: number;
    name: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
  token: string;
}

// Chat interfaces
export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  last_seen?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: number;
  user: User;
  last_message?: Message;
  unread_count: number;
}

// --- Group Chat Interfaces ---
export interface GroupChat {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  avatar?: string;
  members_count: number;
  created_by: number;
  unread_count: number;
  last_message?: Message;
}

export interface GroupMember {
  id: number;
  user_id: number;
  group_id: number;
  role: 'admin' | 'member';
  joined_at: string;
  user: User;
}

export interface CreateGroupData {
  name: string;
  description?: string;
  member_ids: number[];
}

// Authentication API functions
export const authAPI = {
  // Register new user
  register: async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>('/register', data);
    return response.data;
  },

  // Login user
  login: async (data: LoginData): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/login', data);
    return response.data;
  },

  // Logout user
  logout: async (token: string): Promise<any> => {
    const response = await apiClient.post('/logout', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
};

// Chat API functions
export const chatAPI = {
  // Get all conversations for the current user
  getConversations: async () => {
    const response = await apiClient.get('/conversations');
    return response.data;
  },

  // Get messages between current user and another user
  getMessages: async (userId: number) => {
    const response = await apiClient.get(`/messages/${userId}`);
    return response.data;
  },

  // Send a message to another user
  sendMessage: async (userId: number, content: string) => {
    const response = await apiClient.post('/messages', {
      receiver_id: userId,
      content
    });
    return response.data;
  },

  // Mark messages from a user as read
  markAsRead: async (userId: number) => {
    const response = await apiClient.post(`/messages/${userId}/read`);
    return response.data;
  },

  // Search for users
  searchUsers: async (query: string) => {
    const response = await apiClient.get(`/users/search?query=${query}`);
    return response.data;
  },

  // Get user details
  getUserDetails: async (userId: number) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  // --- Group Chat API functions ---

  // Get all groups the current user is a member of
  getGroups: async () => {
    const response = await apiClient.get('/groups');
    return response.data;
  },

  // Get group details
  getGroupDetails: async (groupId: number) => {
    const response = await apiClient.get(`/groups/${groupId}`);
    return response.data;
  },

  // Create a new group
  createGroup: async (data: CreateGroupData) => {
    const response = await apiClient.post('/groups', data);
    return response.data;
  },

  // Update group (not in routes yet, but stubbed)
  updateGroup: async (groupId: number, data: Partial<CreateGroupData>) => {
    const response = await apiClient.put(`/groups/${groupId}`, data);
    return response.data;
  },

  // Get group members
  getGroupMembers: async (groupId: number) => {
    const response = await apiClient.get(`/groups/${groupId}/members`);
    return response.data;
  },

  // Add a member to a group
  addGroupMember: async (groupId: number, userId: number) => {
    const response = await apiClient.post(`/groups/${groupId}/members`, { user_id: userId });
    return response.data;
  },

  // Remove a member from a group
  removeGroupMember: async (groupId: number, userId: number) => {
    const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  // Leave a group
  leaveGroup: async (groupId: number) => {
    const response = await apiClient.post(`/groups/${groupId}/leave`);
    return response.data;
  },

  // Get messages in a group
  getGroupMessages: async (groupId: number) => {
    const response = await apiClient.get(`/groups/${groupId}/messages`);
    return response.data;
  },

  // Send a message to a group
  sendGroupMessage: async (groupId: number, content: string) => {
    const response = await apiClient.post('/group-messages', {
      group_id: groupId,
      content
    });
    return response.data;
  },

  // Mark group messages as read (not implemented in backend yet, stubbed)
  markGroupMessagesAsRead: async (groupId: number) => {
    const response = await apiClient.post(`/groups/${groupId}/messages/read`);
    return response.data;
  }
};

// Helper to set the auth token after login/registration
export const setAuthToken = (token: string) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Location interfaces
export interface Location {
  id: number; // Changed from id?: number to id: number for created locations
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  average_rating?: number;
  visit_count?: number;
}

export interface LocationCreationData {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  type?: string;
}

export interface LocationVisit {
  latitude: number;
  longitude: number;
  name: string;
  type: string;
  user_id?: number;
}

export interface LocationRating {
  location_id: number;
  rating: number;
  comment?: string;
}

// Location API functions
export const locationsAPI = {
  // Get all locations
  getLocations: async (): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>('/locations');
    return response.data;
  },

  // Get a specific location details
  getLocation: async (id: number): Promise<Location> => {
    const response = await apiClient.get<Location>(`/locations/${id}`);
    return response.data;
  },

  // Search locations by coordinates
  searchNearby: async (latitude: number, longitude: number, radius: number = 5): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>(`/locations/nearby`, {
      params: { lat: latitude, lng: longitude, radius }
    });
    return response.data;
  },

  // Log a location visit
  logVisit: async (data: LocationVisit): Promise<any> => {
    try {
      console.log("API logVisit called with data:", data);
      console.log("API headers:", apiClient.defaults.headers);
      console.log("API baseURL:", apiClient.defaults.baseURL);
      
      const response = await apiClient.post('/locations/visits', data);
      console.log("API logVisit success response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API logVisit error:", error);
      
      // Log more detailed error information
      if (error.response) {
        // The server responded with a status code outside of 2xx range
        console.error("Response error data:", error.response.data);
        console.error("Response error status:", error.response.status);
        console.error("Response error headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Request error:", error.request);
      } else {
        // Something else happened in setting up the request
        console.error("Error message:", error.message);
      }
      
      // Rethrow the error to be caught by the calling code
      throw error;
    }
  },  
  // Rate a location
  rateLocation: async (data: LocationRating): Promise<any> => {
    const response = await apiClient.post('/locations/ratings', data);
    return response.data;
  },

  // Get location analytics
  getLocationAnalytics: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/locations/${id}/analytics`);
    return response.data;
  },

  // Create a new location
  createLocation: async (data: LocationCreationData): Promise<Location> => {
    const response = await apiClient.post<Location>('/locations', data);
    return response.data;
  },

  // Update a location
  updateLocation: async (id: number, data: Partial<LocationCreationData>): Promise<Location> => {
    const response = await apiClient.put<Location>(`/locations/${id}`, data);
    return response.data;
  }
};

// Add these new interfaces for establishment data
export interface Establishment {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  address?: string;
  rating?: number;
  photo_url?: string;
  distance?: number;
}

export interface EstablishmentSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;  // in meters
  type?: string;    // restaurant, hotel, attraction, etc.
  keyword?: string; // search term
  limit?: number;   // max results
}

// Add a new section for external establishment API
export const establishmentsAPI = {
  // Search for nearby establishments
  searchEstablishments: async (params: EstablishmentSearchParams): Promise<Establishment[]> => {
    // We're using OpenTripMap API as it's free and doesn't require a credit card
    // Note: In production, you should move the API key to an environment variable
    const OPENTRIPMAP_API_KEY = '5ae2e3f221c38a28845f05b6a97838eb7841e58adf12536688057374';
    const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';
    
    try {
      // First get list of places
      const radius = params.radius || 1000; // Default 1km
      const limit = params.limit || 20;
      const searchURL = `${BASE_URL}/radius?radius=${radius}&lon=${params.longitude}&lat=${params.latitude}&limit=${limit}&apikey=${OPENTRIPMAP_API_KEY}`;
      
      const response = await axios.get(searchURL);
      
      // Process results into our Establishment format
      const establishments: Establishment[] = [];
      
      if (response.data && response.data.features) {
        // Filter by keyword if provided
        const features = params.keyword 
          ? response.data.features.filter((f: any) => 
              f.properties.name && f.properties.name.toLowerCase().includes(params.keyword!.toLowerCase()))
          : response.data.features;
        
        // Filter by type if provided
        const filteredFeatures = params.type
          ? features.filter((f: any) => f.properties.kinds && f.properties.kinds.includes(params.type))
          : features;
          
        // Get details for each place
        for (const feature of filteredFeatures.slice(0, limit)) {
          if (feature.properties.name) { // Only include places with names
            const place = {
              id: feature.id,
              name: feature.properties.name,
              latitude: feature.geometry.coordinates[1],
              longitude: feature.geometry.coordinates[0],
              type: feature.properties.kinds ? feature.properties.kinds.split(',')[0] : 'place',
              distance: feature.properties.dist,
              rating: feature.properties.rate,
            };
            
            establishments.push(place);
          }
        }
      }
      
      return establishments;
    } catch (error) {
      console.error('Error searching establishments:', error);
      throw error;
    }
  },
  
  // Get details for a specific establishment
  getEstablishmentDetails: async (id: string): Promise<any> => {
    const OPENTRIPMAP_API_KEY = '5ae2e3f221c38a28845f05b6a97838eb7841e58adf12536688057374';
    const url = `https://api.opentripmap.com/0.1/en/places/xid/${id}?apikey=${OPENTRIPMAP_API_KEY}`;
    
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error getting establishment details:', error);
      throw error;
    }
  },
  
  // Alternative API: Using Overpass for OpenStreetMap data (as backup)
  searchOSMEstablishments: async (params: EstablishmentSearchParams): Promise<Establishment[]> => {
    try {
      const radius = params.radius || 1000; // Default 1km
      const typeTag = params.type || 'amenity';
      const typeValue = params.keyword || '';
      
      // Build Overpass query
      const overpassQuery = `
        [out:json];
        (
          node["${typeTag}"${typeValue ? `="${typeValue}"` : ''}](around:${radius},${params.latitude},${params.longitude});
        );
        out body;
      `;
      
      const response = await axios.post(
        'https://overpass-api.de/api/interpreter', 
        overpassQuery,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      
      const establishments: Establishment[] = [];
      
      if (response.data && response.data.elements) {
        response.data.elements.forEach((element: any) => {
          if (element.tags && element.tags.name) {
            establishments.push({
              id: `osm${element.id}`,
              name: element.tags.name,
              latitude: element.lat,
              longitude: element.lon,
              type: element.tags[typeTag] || typeTag,
              address: element.tags['addr:street'] 
                ? `${element.tags['addr:housenumber'] || ''} ${element.tags['addr:street']}, ${element.tags['addr:city'] || ''}` 
                : undefined
            });
          }
        });
      }
      
      return establishments;
    } catch (error) {
      console.error('Error searching OSM establishments:', error);
      throw error;
    }
  }
};

export default apiClient;
