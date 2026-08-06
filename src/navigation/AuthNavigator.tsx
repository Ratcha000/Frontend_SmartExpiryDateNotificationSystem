import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LogInScreen from '../features/auth/screens/LogInScreen'; // หรือชื่อไฟล์ที่คุณเอาโค้ดใหม่ไปวางทับ

export type AuthStackParamList = {
  LogIn: undefined; // เปลี่ยนชื่อ Route ให้สอดคล้อง
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="LogIn" // ตั้งค่าให้เปิดมาเจอหน้าแรกนี้ทันที
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="LogIn"
        component={LogInScreen}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;