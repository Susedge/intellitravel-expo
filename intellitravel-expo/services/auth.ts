// If this file doesn't exist yet, create it
import * as SecureStore from 'expo-secure-store';

export const saveAuthData = async (token: any, user: any) => {
  try {
    // Ensure token is stored as a string
    if (token === undefined || token === null) {
      throw new Error('Token is missing');
    }
    
    // Convert token to string if it isn't already
    const tokenString = typeof token === 'string' ? token : String(token);
    await SecureStore.setItemAsync('authToken', tokenString);
    
    // Ensure user is stored as a JSON string
    if (user !== undefined && user !== null) {
      await SecureStore.setItemAsync('userData', JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync('userData', JSON.stringify({}));
    }
    
    return true;
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw error;
  }
};

export const getAuthData = async () => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    const userDataString = await SecureStore.getItemAsync('userData');
    
    // Parse the user data back to an object
    const userData = userDataString ? JSON.parse(userDataString) : null;
    
    return { token, user: userData };
  } catch (error) {
    console.error('Error retrieving auth data:', error);
    return { token: null, user: null };
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
