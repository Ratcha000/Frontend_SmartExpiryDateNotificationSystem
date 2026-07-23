import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
// 🔴 1. แก้ไข Import โดยเพิ่ม setGlobalToken เข้ามา
import apiClient, { setGlobalToken } from '../api/client'; 
import { User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// In-memory fallback for environments without SecureStore support
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
          // รับค่าเป็น String ตรงๆ จาก SecureStore
          const storedToken = await SecureStore.getItemAsync('token');
          if (storedToken) {
            token = storedToken;
          }
        } catch (e) {
          console.warn('SecureStore not available, using fallback storage');
          token = tokenFallback;
        }

        if (token) {
          // 🔴 2. เติมบรรทัดนี้ เพื่อฝัง Token ลงไปใน API Client
          setGlobalToken(token); 
          
          const response = await apiClient.get<User>('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        try {
          // ใช้ deleteItemAsync แทน Keychain
          await SecureStore.deleteItemAsync('token');
        } catch (_) {}
        tokenFallback = '';
        // 🔴 3. ล้างค่า Token เผื่อกรณีดึงข้อมูลพลาด
        setGlobalToken(null); 
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (token: string, userData: User) => {
    // 🔴 4. อัปเดต Token ตอน Login
    setGlobalToken(token); 
    
    try {
      // ใช้ setItemAsync แทน Keychain
      await SecureStore.setItemAsync('token', token);
    } catch (e) {
      console.warn('SecureStore not available to save, using fallback');
    }
    tokenFallback = token;
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // 🔴 5. ล้างค่า Token ตอน Logout
    setGlobalToken(null); 
    
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout failed, clearing local session anyway');
    }

    try {
      // ใช้ deleteItemAsync แทน Keychain
      await SecureStore.deleteItemAsync('token');
    } catch (e) {
      console.warn('SecureStore not available to reset');
    }
    tokenFallback = '';
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, isAuthenticated, isLoading }}>
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