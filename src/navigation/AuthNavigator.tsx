import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LogInScreen from '../features/auth/screens/LogInScreen';
import AddIngredientScreen from '../features/auth/screens/AddIngredientScreen'; // ✅ แก้ไข: ลบ import ที่ซ้ำซ้อนออกแล้ว

export type AuthStackParamList = {
  LogIn: undefined;
  AddIngredient: undefined; // 🔴 เพิ่มบรรทัดนี้ เพื่อบอก TypeScript ว่ามีหน้าใหม่ชื่อนี้แล้ว
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="LogIn"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="LogIn"
        component={LogInScreen}
      />
      <Stack.Screen
        name="AddIngredient"
        component={AddIngredientScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;