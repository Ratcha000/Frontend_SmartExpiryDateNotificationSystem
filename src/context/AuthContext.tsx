import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Keychain from 'react-native-keychain';
import apiClient from '../api/client';
import { User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory fallback for environments without Keychain support
let tokenFallback = '';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check auth status on launch
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        let token = '';
        try {
          const credentials = await Keychain.getGenericPassword();
          if (credentials) {
            token = credentials.password;
          }
        } catch (e) {
          console.warn('Keychain not available, using fallback storage');
          token = tokenFallback;
        }

        if (token) {
          const response = await apiClient.get<User>('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        try {
          await Keychain.resetGenericPassword();
        } catch (_) {}
        tokenFallback = '';
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (token: string, userData: User) => {
    try {
      await Keychain.setGenericPassword('session_token', token);
    } catch (e) {
      console.warn('Keychain not available to save, using fallback');
    }
    tokenFallback = token;
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout failed, clearing local session anyway');
    }

    try {
      await Keychain.resetGenericPassword();
    } catch (e) {
      console.warn('Keychain not available to reset');
    }
    tokenFallback = '';
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
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
