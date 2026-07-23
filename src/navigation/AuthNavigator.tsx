import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../features/auth/screens/HomeScreen'; // หรือชื่อไฟล์ที่คุณเอาโค้ดใหม่ไปวางทับ

export type AuthStackParamList = {
  Home: undefined; // เปลี่ยนชื่อ Route ให้สอดคล้อง
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home" // ตั้งค่าให้เปิดมาเจอหน้าแรกนี้ทันที
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;