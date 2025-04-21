// If this file doesn't exist yet, create it
import * as SecureStore from 'expo-secure-store';

export const saveAuthData = async (token: string, userData: any) => {
  try {
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('user_data', JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw error;
  }
};

export const getAuthData = async () => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    const userData = await SecureStore.getItemAsync('user_data');
    
    return {
      token,
      userData: userData ? JSON.parse(userData) : null
    };
  } catch (error) {
    console.error('Error getting auth data:', error);
    return { token: null, userData: null };
  }
};

export const clearAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};
