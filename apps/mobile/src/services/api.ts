/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from 'axios';
import { StorageService } from '../utils/storage';
import Constants from 'expo-constants';

import { Platform, DeviceEventEmitter } from 'react-native';

const LOCAL_DEV_API_URL = 'http://localhost:3000/api/v1';
const ANDROID_DEV_API_URL = 'http://10.0.2.2:3000/api/v1';
const PRODUCTION_API_URL = 'https://gps-attendance-api.onrender.com/api/v1';

const isLocalApiUrl = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/api\/v1\/?$/i.test(url);

const getBaseURL = () => {
  const extraConfig = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  const configuredApiUrl = extraConfig?.apiUrl;

  if (configuredApiUrl && (!isLocalApiUrl(configuredApiUrl) || __DEV__)) {
    return configuredApiUrl;
  }

  if (__DEV__) {
    if (Platform.OS === 'android') {
      return ANDROID_DEV_API_URL;
    }

    return LOCAL_DEV_API_URL;
  }

  if (configuredApiUrl && !isLocalApiUrl(configuredApiUrl)) {
    return configuredApiUrl;
  }

  return PRODUCTION_API_URL;
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
  const token = await StorageService.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If we have a stored CSRF token (set by server in login/refresh responses), include it
  try {
    const csrf = await StorageService.getItem('refreshCsrf');
    if (csrf && config.url && (config.url.includes('/auth/refresh') || config.url.includes('/auth/logout'))) {
      (config.headers as Record<string,string>)['x-csrf-token'] = csrf;
    }
  } catch (e) {
    // ignore
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
        const refreshToken = await StorageService.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = response.data;

        await StorageService.setItem('accessToken', accessToken);
        setAuthToken(accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Handle failed refresh (log out)
        await StorageService.removeItem('accessToken');
        await StorageService.removeItem('refreshToken');
        await StorageService.removeItem('user');
        setAuthToken(null);
        DeviceEventEmitter.emit('auth:logout');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
