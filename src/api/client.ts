import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// จัดการเรื่อง URL ให้ฉลาดขึ้น (รองรับทั้ง Android Emulator และ iOS/Web)
const DEFAULT_API_URL = 'http://192.168.0.100:8081/api';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
console.log(`>>> [CONFIG] API_URL = ${API_URL}`);

// --------------------------------------------------------
// 1. ระบบความจำสำรอง (ล็อกชั้นที่ 1)
// --------------------------------------------------------
export let globalToken: string | null = null;

export const setGlobalToken = (token: string | null) => {
  globalToken = token;
  if (token) {
    // ล็อกชั้นที่ 2: ฝังทะลุเข้าแกนกลาง Axios (ส่งไปทุก Request อัตโนมัติ)
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('>>> [DEBUG] 💾 เก็บ Token ลง Memory สำรองเรียบร้อย!');
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// AI endpoints (suggestions) เรียก LLM ทีละวัตถุดิบ จึงต้องใช้ timeout ยาวกว่าปกติมาก
export const AI_TIMEOUT = 120000;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// --------------------------------------------------------
// 2. ขาไป (Request Interceptor) - ค้นหา Token ทุกวิถีทาง
// --------------------------------------------------------
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // วิถีที่ 1: ดึงจาก Axios Defaults
      let token = config.headers.Authorization;
      if (token && typeof token === 'string') {
        token = token.replace('Bearer ', '');
      }

      // วิถีที่ 2: ดึงจาก Global Variable
      if (!token) token = globalToken;

      // วิถีที่ 3: งัดจาก SecureStore (ล็อกชั้นที่ 3)
      if (!token) {
        token = await SecureStore.getItemAsync('token').catch(() => null);
      }

      // ถ้าเจอจากวิถีไหนก็ตาม ให้แนบไปกับ Header
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log(`\n>>> [NETWORK] 🚀 ยิง API: ${config.method?.toUpperCase()} ${API_URL}${config.url}`);
      console.log(`>>> [NETWORK] 🔑 มี Token ไหม?: ${token ? '✅ มี' : '❌ ไม่มี Token!!'}`);

    } catch (error) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// --------------------------------------------------------
// 3. ขากลับ (Response Interceptor) - ดักจับตอน Login/Register
// --------------------------------------------------------
apiClient.interceptors.response.use(
  async (response) => {
    const url = response.config.url || '';
    
    // ทันทีที่ API เส้นเข้าสู่ระบบหรือสมัครสมาชิกสำเร็จ
    if (url.includes('/auth/login') || url.includes('/auth/register')) {
      const token = response.data?.accessToken || response.data?.token;
      
      if (token) {
        console.log('\n>>> [AUTO-SAVE] 🎯 จับ Access Token ได้จาก API! ฝังเข้าระบบทันที...');
        setGlobalToken(token); // สั่งฝัง Token
        
        try {
          await SecureStore.setItemAsync('token', token);
        } catch (e) {}
      } else {
        console.log('\n>>> [AUTO-SAVE] ❌ ล็อกอินสำเร็จ แต่ Backend ไม่ได้ส่ง accessToken หรือ token กลับมาให้');
      }
    }
    return response;
  },
  async (error) => {
    if (!error.response) {
      console.log(`\n>>> [NETWORK] ❌ Network Error: ต่อ API ไม่ได้ (${API_URL})`);
      console.log(`>>> [NETWORK] รายละเอียด: ${error.message}`);
    }

    // โชว์รายละเอียดที่ backend ส่งกลับมา ไม่งั้นเห็นแค่ "status code 4xx" แล้วเดาไม่ออกว่าพังตรงไหน
    if (error.response) {
      const { status, config, data } = error.response;
      console.log(`\n>>> [NETWORK] ❌ ${status} ${config?.method?.toUpperCase()} ${config?.url}`);
      console.log('>>> [NETWORK] body ที่ backend ตอบกลับ:', JSON.stringify(data));
    }

    // ถ้าโดนเตะ 401 (หมดอายุ) ให้ล้างข้อมูล
    if (error.response && error.response.status === 401) {
      setGlobalToken(null);
      await SecureStore.deleteItemAsync('token').catch(() => {});
    }
    return Promise.reject(error);
  }
);

export default apiClient;
