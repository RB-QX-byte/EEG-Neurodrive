"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, setAuthToken, getAuthToken, clearAuthToken, User } from './api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, role?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          // Verify token is still valid by checking health endpoint
          await authAPI.checkHealth();
          // You might want to decode the JWT to get user info instead
          // For now, we'll set a placeholder user
          const userData = localStorage.getItem('user_data');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          clearAuthToken();
          localStorage.removeItem('user_data');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      setAuthToken(response.token);
      setUser(response.user);
      localStorage.setItem('user_data', JSON.stringify(response.user));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    clearAuthToken();
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const register = async (username: string, password: string, role?: string) => {
    try {
      await authAPI.register(username, password, role);
      // After registration, automatically log in
      await login(username, password);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 