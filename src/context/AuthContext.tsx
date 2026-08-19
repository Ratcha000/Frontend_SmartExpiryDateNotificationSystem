import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient, { setGlobalToken } from '../api/client'; 
import { User } from '../types';
import { clearSuggestionCache } from '../api/suggestionCache';

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
        } catch (e: any) { // 🔴 เพิ่ม : any เพื่อแก้ TypeScript Error
          console.warn('SecureStore not available, using fallback storage');
          token = tokenFallback;
        }

        if (token) {
          // ฝัง Token ลงไปใน API Client
          setGlobalToken(token); 
          
          const response = await apiClient.get<User>('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error: any) { // 🔴 เพิ่ม : any เพื่อให้เรียกใช้ error?.message ได้โดยไม่ติดขีดแดง
        console.log('Authentication check failed:', error?.message);
        try {
          // ใช้ deleteItemAsync แทน Keychain
          await SecureStore.deleteItemAsync('token');
        } catch (e: any) {}
        
        tokenFallback = '';
        // ล้างค่า Token เผื่อกรณีดึงข้อมูลพลาด
        setGlobalToken(''); // ส่งเป็น string ว่างแทน null เพื่อป้องกันปัญหา Type ของบาง API Client
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (token: string, userData: User) => {
    // อัปเดต Token ตอน Login
    setGlobalToken(token); 
    
    try {
      // ใช้ setItemAsync แทน Keychain
      await SecureStore.setItemAsync('token', token);
    } catch (e: any) {
      console.warn('SecureStore not available to save, using fallback');
    }
    tokenFallback = token;
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // ล้างค่า Token ตอน Logout
    setGlobalToken(''); 
    
    try {
      await apiClient.post('/auth/logout');
    } catch (e: any) {
      console.warn('Backend logout failed, clearing local session anyway');
    }

    try {
      // ใช้ deleteItemAsync แทน Keychain
      await SecureStore.deleteItemAsync('token');
    } catch (e: any) {
      console.warn('SecureStore not available to reset');
    }
    tokenFallback = '';
    clearSuggestionCache(); // ล้างเมนูที่ AI แนะนำไว้ ไม่ให้ค้างข้ามผู้ใช้
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