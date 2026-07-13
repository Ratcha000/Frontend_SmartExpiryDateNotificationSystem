# React Native Architecture & Security Guide for Expiry System Connection

เอกสารฉบับนี้อธิบายแนวทางการวางโครงสร้างโฟลเดอร์ ระบบความปลอดภัย และการจัดการสถานะ (State) สำหรับแอปพลิเคชัน Mobile ด้วย **React Native (TypeScript)** ในการเชื่อมต่อเข้ากับระบบหลังบ้าน **Java Spring Boot (JWT)** อย่างปลอดภัยและเป็นมาตรฐานที่ได้รับการยอมรับระดับสากล (Global Best Practices)

---

## 1. โครงสร้างโฟลเดอร์มาตรฐาน (Clean & Feature-Based Architecture)

การจัดโครงสร้างแบบแยกตามฟังก์ชัน (Feature-Based) หรือการจัดกลุ่มตามหน้าที่ (Layer-Based) ที่ได้รับความนิยมในระดับสากล ช่วยให้โค้ดสามารถขยายตัว (Scale) และทดสอบ (Test) ได้ง่ายขึ้น

```text
my-expiry-app/
├── src/
│   ├── api/                   # การตั้งค่าเครือข่ายและการเรียก API
│   │   ├── client.ts          # Axios Instance (Configuration & Interceptors)
│   │   └── auth.ts            # API Call functions สำหรับระบบ Authentication
│   │   └── ingredients.ts     # API Call functions สำหรับจัดการวัตถุดิบ
│   ├── components/            # UI Components ที่ใช้ร่วมกันทั้งแอป (Shared Common UI)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   ├── context/               # React Context สำหรับการจัดการ State ขนาดเล็ก เช่น Theme/Auth
│   │   └── AuthContext.tsx    # เก็บสถานะการเข้าสู่ระบบและข้อมูลผู้ใช้
│   ├── features/              # แยกตามคุณสมบัติการทำงานหลัก (Feature-based folders)
│   │   ├── auth/
│   │   │   ├── screens/       # หน้าจอหลักของฟีเจอร์นี้
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── RegisterScreen.tsx
│   │   │   └── components/    # Components เฉพาะฟีเจอร์นี้
│   │   ├── ingredients/
│   │   │   ├── screens/
│   │   │   │   ├── IngredientListScreen.tsx
│   │   │   │   └── ScanExpiryScreen.tsx
│   │   │   └── components/
│   │   └── profile/
│   ├── hooks/                 # Custom Hooks สำหรับจัดการ Business Logic แยกจาก UI
│   │   ├── useAuth.ts
│   │   └── useIngredients.ts
│   ├── navigation/            # การจัดการเส้นทางและโครงสร้างหน้าจอ (Routing/Navigation)
│   │   ├── index.tsx          # Navigation Container & Switcher
│   │   ├── AppNavigator.tsx   # Stack หน้าจอหลังเข้าสู่ระบบ (Authenticated)
│   │   └── AuthNavigator.tsx  # Stack หน้าจอก่อนเข้าสู่ระบบ (Unauthenticated)
│   ├── theme/                 # จัดเก็บ Tokens สำหรับ Styles และ Colors
│   │   └── colors.ts
│   ├── utils/                 # ฟังก์ชันเสริมอำนวยความสะดวก (Utility/Helpers)
│   │   └── date.ts            # ฟังก์ชันจัดรูปแบบวันที่สำหรับวันหมดอายุ
│   └── types/                 # ไฟล์ประกาศประเภทข้อมูล (Global TypeScript Interfaces)
│       └── index.ts           # โครงสร้างของ User, Ingredient, Restaurant 
├── .env                       # เก็บ Environment Variables (ห้าม Commit ขึ้น Git)
├── tsconfig.json
└── package.json
```

---

## 2. ระบบรักษาความปลอดภัย (Security Best Practices)

เมื่อพัฒนาแอปพลิเคชันมือถือ ความปลอดภัยเป็นสิ่งสำคัญที่สุด โดยมีข้อกำหนดหลักระดับสากลดังนี้:

### A. การเก็บรักษา JWT Token อย่างปลอดภัย (Secure Storage)
*   **หลีกเลี่ยง `AsyncStorage`:** เนื่องจาก `AsyncStorage` บน React Native ไม่ได้รับการเข้ารหัสข้อมูล (Unencrypted) ทำให้เสี่ยงต่อการถูกเจาะระบบเพื่อขโมย Token
*   **ใช้ Secure Storage ที่เหมาะสม:**
    *   **iOS:** ใช้ Keychain Services
    *   **Android:** ใช้ Keystore (SharedPreferences แบบเข้ารหัส)
    *   **Library ที่แนะนำ:** 
        *   [`react-native-keychain`](https://github.com/oblador/react-native-keychain) (สำหรับ React Native CLI)
        *   [`expo-secure-store`](https://docs.expo.dev/versions/latest/sdk/secure-store/) (สำหรับ Expo)

### B. การจัดเก็บ Environment Variables อย่างรัดกุม
*   **หลีกเลี่ยงการ Hardcode API URL:** เก็บค่า Config ต่างๆ ไว้ในไฟล์ `.env` เช่น `API_URL=https://api.yourdomain.com`
*   ใช้ Library อย่าง `react-native-dotenv` หรือ Expo Config ในการอ่านค่า
*   **ข้อควรระวัง:** ข้อมูลใดก็ตามที่อยู่ในฝั่ง Client สามารถถูก Decompile ได้เสมอ ดังนั้นห้ามใส่ความลับที่เป็นระบบหลังบ้าน เช่น API Secret Key ไว้ในฝั่ง Mobile App เด็ดขาด

### C. การป้องกันการดักจับข้อมูลระหว่างทาง (Network Security & SSL Pinning)
*   บังคับใช้โปรโตคอล **HTTPS** เสมอ
*   ในระบบที่มีความปลอดภัยสูงระดับสากล (เช่น การเงินหรือข้อมูลสุขภาพ) จะใช้เทคนิค **SSL Pinning** เพื่อตรวจสอบความถูกต้องของ Certificate ของ Server ป้องกันการโจมตีแบบ Man-in-the-Middle (MitM)

---

## 3. ตัวอย่างการใช้เครื่องมือและโค้ดตัวอย่างที่ถูกต้องและปลอดภัย

### Step 1: สร้าง Axios Client และดึง Token อัตโนมัติ (API Client Setup)
ไฟล์นี้ทำหน้าที่เป็นตัวกลางเชื่อมโยงแอปกับระบบ API ของ Spring Boot โดยจะแนบ JWT token ไปใน Header ทุกครั้งเมื่อมีการส่ง Request และจัดการกรณี Token หมดอายุ (401 Unauthorized)

`src/api/client.ts`
```typescript
import axios from 'axios';
import * as Keychain from 'react-native-keychain';

// อ่าน URL หลักจาก Environment Variable (สำหรับ iOS Emulator ใช้ localhost, สำหรับ Android Emulator ใช้ 10.0.2.2, สำหรับอุปกรณ์จริงใช้ IP ของเครื่องคอมพิวเตอร์)
const API_URL = process.env.API_URL || 'http://localhost:8080/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 วินาที
});

// Request Interceptor: แนบ JWT Token ไปใน Authorization Header เสมอ
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // ดึง Token จาก Keychain/Keystore ที่ปลอดภัย
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        config.headers.Authorization = `Bearer ${credentials.password}`;
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

// Response Interceptor: จัดการข้อผิดพลาดที่เกิดขึ้นจากระบบ API
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // หาก Backend แจ้งเตือนเรื่องสิทธิ์ (เช่น Token หมดอายุ หรือไม่ถูกต้อง)
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request - Logging out...');
      
      // ลบ Token ออกจากเครื่องเพื่อบังคับให้ออกจากระบบ
      await Keychain.resetGenericPassword();
      
      // ตรงนี้สามารถยิง Event เพื่อเปลี่ยนหน้าจอไปยังหน้า Login ได้
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### Step 2: การจัดการสถานะการเข้าสู่ระบบ (Authentication State & Context)
การจัดการ State สำหรับการเข้าสู่ระบบที่ปลอดภัย ไม่ควรปล่อยให้สถานะการล็อกอินขึ้นอยู่กับค่า Boolean ธรรมดาในหน้าจอ แต่ต้องจำลอง State มาจากความถูกต้องของ Token จริง

`src/context/AuthContext.tsx`
```typescript
import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Keychain from 'react-native-keychain';
import apiClient from '../api/client';

interface User {
  id: string; // ปรับจาก number เป็น string ให้ตรงกับ UUID/String ID ของ Backend
  email: string;
  displayName: string;
  role: 'MANAGER' | 'EMPLOYEE';
  restaurantId: string | null; // เพิ่มฟิลด์ให้ตรงกับ UserResponse ของ Backend
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ตรวจสอบว่าเคยเข้าสู่ระบบไว้แล้วหรือไม่ (เมื่อเปิดแอปพลิเคชันขึ้นมาใหม่)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const credentials = await Keychain.getGenericPassword();
        if (credentials) {
          // หากมี Token ให้เรียก API '/me' เพื่อยืนยันว่า Token ยังใช้งานได้อยู่จริง
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Token เสียหายหรือไม่ถูกต้อง ให้ Reset ใหม่
        await Keychain.resetGenericPassword();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (token: string, userData: User) => {
    // บันทึก Token ลงในอุปกรณ์อย่างปลอดภัย
    await Keychain.setGenericPassword('session_token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // ลบ Token และล้าง State
    await Keychain.resetGenericPassword();
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
```

---

### Step 3: การควบคุมเส้นทางหน้าจอที่ปลอดภัย (Navigation Switcher)
วิธีการป้องกันไม่ให้ผู้ใช้แอบเปิดหน้าจอแดชบอร์ดโดยยังไม่ได้ล็อกอินที่ดีที่สุดคือ การควบคุมการแสดงผลของ Stack Navigator โดยอิงจากสถานะ `isAuthenticated` จาก Context

`src/navigation/index.tsx`
```typescript
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // แสดง Loading Screen ในขณะที่แอปกำลังตรวจสภาพ Token (ช่วยป้องกันการกะพริบของหน้าจอ)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* 
        โครงสร้างแบบนี้ปลอดภัยอย่างสมบูรณ์ เพราะเมื่อยังไม่ล็อกอิน 
        ระบบจะไม่เรนเดอร์หน้าจอ AppNavigator (หน้าในระบบ) ลงในเมมโมรี่ของหน้าจอเลย
      */}
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
```

---

## 4. ข้อพิจารณาในการพัฒนาเพิ่มเติม
1. **การดึงข้อมูลและจัดการ Cache ด้วย React Query (TanStack Query):** แนะนำให้ใช้แทนการเขียน `useEffect` ดึงข้อมูลด้วยตัวเอง เนื่องจากมีระบบ Auto-retry, Caching, และการซิงค์ข้อมูลเบื้องหลัง (Background Refetching) เมื่อวัตถุดิบใกล้หมดอายุ
2. **การทำงานออฟไลน์ (Offline Support):** เนื่องจากร้านอาหารบางร้านอาจมีจุดอับสัญญาณเน็ต (เช่น ในครัวชั้นใต้ดิน) การเลือกใช้ **WatermelonDB** หรือ **Realm** ร่วมกับระบบซิงค์ API จะช่วยให้พนักงานยังสามารถลงบันทึกวัตถุดิบแบบ Offline ได้ แล้วค่อยซิงค์ข้อมูลกับ Backend ของ Spring Boot ทันทีที่เน็ตกลับมาใช้งานได้ปกติ
