import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import AccountScreen from '../features/auth/screens/AccountScreen';
import MainDashboard from '../features/auth/screens/MainDashboard';

export type AppStackParamList = {
  Onboarding: undefined;
  MainDashboard: undefined;
  Account: undefined;
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  const { user } = useAuth();

  // สร้างตัวเช็คที่เข้มงวดขึ้น: ต้องมีค่า, ไม่ใช่คำว่า 'null', และไม่ใช่ช่องว่าง
  const hasRestaurant = 
    user?.restaurantId && 
    user.restaurantId !== 'null' && 
    String(user.restaurantId).trim() !== '';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      {/* ใช้ตัวแปร hasRestaurant ที่เราสร้างขึ้นมาเช็คแทน */}
      {!hasRestaurant ? (
        <Stack.Screen name="Onboarding" component={AccountScreen} />
      ) : (
        <Stack.Screen name="MainDashboard" component={MainDashboard} />
      )}

      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Account' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;