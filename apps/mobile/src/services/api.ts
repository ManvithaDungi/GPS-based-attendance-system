/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Platform, DeviceEventEmitter } from 'react-native';

const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api/v1';
  }

  const extraConfig = Constants.expoConfig?.extra;
  if (extraConfig?.apiUrl && extraConfig.apiUrl !== 'http://localhost:3000/api/v1') {
    return extraConfig.apiUrl;
  }
  
  // Fallback for development
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

const BASE_URL = getBaseURL();

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // On 401, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = response.data;
        
        await AsyncStorage.setItem('accessToken', accessToken);
        setAuthToken(accessToken);
        
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Handle failed refresh (log out)
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        await AsyncStorage.removeItem('user');
        setAuthToken(null);
        DeviceEventEmitter.emit('auth:logout');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
