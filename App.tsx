import React, { useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansThai_400Regular,
  NotoSansThai_700Bold,
} from '@expo-google-fonts/noto-sans-thai';
import { AuthProvider } from './src/context/AuthContext';
import { Navigation } from './src/navigation';

// คาหน้า splash ไว้จนกว่าฟอนต์จะโหลดเสร็จ กันตัวอักษรกระพริบเป็นฟอนต์ระบบ
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_700Bold,
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // ถ้าโหลดฟอนต์ไม่สำเร็จ ก็ยังให้แอปทำงานต่อด้วยฟอนต์ระบบ ไม่ค้างที่ splash
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <AuthProvider>
          <SafeAreaProvider>
            <Navigation />
            <StatusBar style="light" />
          </SafeAreaProvider>
        </AuthProvider>
      </View>
    </GestureHandlerRootView>
  );
}
