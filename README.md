# Project Setup

คู่มือนี้สำหรับการรันโปรเจกต์ Expo/React Native นี้บนเครื่อง local และทดสอบผ่าน Expo Go บน Android

## 1. สิ่งที่ต้องติดตั้ง

- Node.js 20 LTS หรือใหม่กว่า
- npm
- Expo Go บนมือถือ Android
- Backend API ของโปรเจกต์ที่รันได้และเปิดให้มือถือเข้าถึงได้

ตรวจสอบเวอร์ชัน:

```bash
node -v
npm -v
```

## 2. ติดตั้ง dependencies

ที่ root ของโปรเจกต์รัน:

```bash
npm install
```

โปรเจกต์นี้ใช้ `package-lock.json` ดังนั้นควรใช้ `npm` เป็นหลัก

## 3. ตั้งค่า environment

คัดลอกไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

จากนั้นแก้ค่า `EXPO_PUBLIC_API_URL` ใน `.env`

ตัวอย่าง:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:8080/api
```

ข้อสำคัญ:

- ห้ามใช้ `localhost` ถ้าทดสอบผ่านมือถือ Android ด้วย Expo Go เพราะ `localhost` จะชี้ไปที่ตัวมือถือ ไม่ใช่เครื่องที่รัน backend
- ให้ใช้ IP ของเครื่องที่รัน backend แทน เช่น `192.168.x.x`
- มือถือ Android และเครื่องที่รัน Expo/Backend ควรอยู่ Wi-Fi วงเดียวกัน

## 4. รันโปรเจกต์

เริ่ม Expo dev server:

```bash
npm start
```

หรือ

```bash
npx expo start
```

ถ้าต้องการให้ Expo พยายามเปิด Android โดยตรง:

```bash
npm run android
```

หมายเหตุ: คำสั่งนี้เหมาะกับกรณีมี Android Emulator หรือมีการเชื่อมต่ออุปกรณ์ Android จากเครื่องพัฒนาไว้แล้ว

## 5. ทดสอบบน Expo Go บน Android

1. ติดตั้งแอป Expo Go จาก Play Store บนมือถือ Android
2. รันคำสั่ง `npm start`
3. รอให้ terminal แสดง QR code
4. เปิดแอป Expo Go
5. ใช้เมนูสแกน QR code แล้วสแกนจากหน้าจอ terminal
6. รอให้โปรเจกต์โหลดบนมือถือ

ถ้าเครื่องกับมือถือคนละเครือข่าย หรือ LAN ใช้งานไม่ได้ ให้ลอง:

```bash
npx expo start --tunnel
```

## 6. วิธีเช็กว่า API ใช้งานได้

โปรเจกต์นี้อ่านค่า API จาก `EXPO_PUBLIC_API_URL` และเรียก backend ผ่าน `axios`

ก่อนทดสอบหน้า login หรือหน้าที่ดึงข้อมูล ควรเช็กว่า:

- backend รันอยู่จริง
- เปิดพอร์ต `8080` หรือพอร์ตที่ backend ใช้งาน
- มือถือสามารถเข้าถึง IP ของเครื่อง backend ได้
- endpoint `/api/...` ใช้งานได้ตาม backend

ถ้าเปิดแอปแล้วเรียก API ไม่ได้ สาเหตุที่พบบ่อยที่สุดคือ URL ใน `.env` ยังเป็น `localhost`

## 7. การทดสอบที่มีอยู่ตอนนี้

ตอนนี้ใน `package.json` ยังไม่มี script สำหรับ automated test เช่น `npm test`

ดังนั้นการทดสอบปัจจุบันของโปรเจกต์นี้คือการทดสอบแบบ manual บน Expo Go เป็นหลัก:

- เปิดแอปได้
- navigation ทำงาน
- login/logout ทำงาน
- เรียก API ได้ตาม environment ที่ตั้งไว้

หากต้องการเพิ่ม automated test ภายหลัง ค่อยเพิ่ม `jest` และ React Native testing setup แยกได้
