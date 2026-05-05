/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StorageService } from '../utils/storage';
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

  // Define logout first — useEffect below depends on it
  const logout = useCallback(async () => {
    // Call logout API first while token is still active
    try {
      const refreshToken = await StorageService.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.error('Logout API failed', e);
    }
    
    // Clear state and storage after
    setAccessToken(null);
    setAuthToken(null);
    setUser(null);
    
    await StorageService.removeItem('accessToken');
    await StorageService.removeItem('refreshToken');
    await StorageService.removeItem('user');
  }, []);

  const login = async (token: string, refreshToken: string, userData: User) => {
    setAccessToken(token);
    setAuthToken(token);
    setUser(userData);
    await StorageService.setItem('accessToken', token);
    await StorageService.setItem('refreshToken', refreshToken);
    await StorageService.setItem('user', JSON.stringify(userData));
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await StorageService.getItem('accessToken');
        const userData = await StorageService.getItem('user');
        
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
  }, []);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener('auth:logout', logout);
    return () => listener.remove();
  }, [logout]);

  const refreshAuth = async () => {
    try {
      const refreshToken = await StorageService.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken: newToken, refreshToken: newRefreshToken } = response.data;
      
      setAccessToken(newToken);
      setAuthToken(newToken);
      await StorageService.setItem('accessToken', newToken);
      await StorageService.setItem('refreshToken', newRefreshToken);
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
