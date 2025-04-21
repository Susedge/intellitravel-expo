import axios from 'axios';

// Create API client
const API_URL = 'https://9849-136-158-119-30.ngrok-free.app/api';

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

export default apiClient;
