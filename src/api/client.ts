import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const DEFAULT_API_URL = 'http://localhost:8080/api'; // (ถ้ารันบน Android Emulator อาจจะต้องเปลี่ยนเป็น http://10.0.2.2:8080/api นะครับ)
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

// 🔴 1. เพิ่มตัวแปรเก็บ Token ฉุกเฉิน
export let globalToken: string | null = null;

// 🔴 2. ฟังก์ชันสำหรับอัปเดต Token จากที่อื่น
export const setGlobalToken = (token: string | null) => {
  globalToken = token;
};

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 🔴 3. ดึงจาก globalToken ก่อน (แก้ปัญหา SecureStore พัง)
      let token = globalToken;
      if (!token) {
        token = await SecureStore.getItemAsync('token');
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to retrieve secure token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request - Clearing token...');
      try {
        setGlobalToken(null); // เคลียร์ตัวแปรด้วย
        await SecureStore.deleteItemAsync('token');
      } catch (resetError) {}
    }
    return Promise.reject(error);
  }
);

export default apiClient;