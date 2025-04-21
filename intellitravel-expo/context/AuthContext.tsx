import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { setAuthToken } from '@/services/api';
import * as SecureStore from 'expo-secure-store';

// Define user interface
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

type AuthContextType = {
  isLoggedIn: boolean;
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check for existing auth data on startup
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        const userData = await SecureStore.getItemAsync('user_data');
        
        if (token && userData) {
          const parsedUserData = JSON.parse(userData);
          setAuthToken(token);
          setUser(parsedUserData);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      }
    };
    
    checkAuthStatus();
  }, []);

  const login = async (token: string, userData: User) => {
    try {
      // Store user data in secure storage
      await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
      
      // Set auth token
      setAuthToken(token);
      
      // Update state
      setUser(userData);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  };

  const logout = async () => {
    try {
      // Clear secure storage
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_data');
      
      // Clear auth token
      setAuthToken('');
      
      // Update state
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      
      // Update secure storage
      SecureStore.setItemAsync('user_data', JSON.stringify(updatedUser))
        .catch(error => console.error('Error updating user data:', error));
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
