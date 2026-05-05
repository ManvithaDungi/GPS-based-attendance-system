/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { api, setAuthToken } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  accessToken: string | null;
  login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const userData = await AsyncStorage.getItem('user');
        
        if (token && userData) {
          setAccessToken(token);
          setAuthToken(token);
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('Failed to initialize auth', e);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();

    const listener = DeviceEventEmitter.addListener('auth:logout', () => {
      logout();
    });
    return () => listener.remove();
  }, []);

  const login = async (token: string, refreshToken: string, userData: User) => {
    setAccessToken(token);
    setAuthToken(token);
    setUser(userData);
    await AsyncStorage.setItem('accessToken', token);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    setAccessToken(null);
    setAuthToken(null);
    setUser(null);
    
    // Call logout API
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.error('Logout API failed', e);
    }
    
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
  };

  const refreshAuth = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken: newToken, refreshToken: newRefreshToken } = response.data;
      
      setAccessToken(newToken);
      setAuthToken(newToken);
      await AsyncStorage.setItem('accessToken', newToken);
      await AsyncStorage.setItem('refreshToken', newRefreshToken);
    } catch (e) {
      await logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, accessToken, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
