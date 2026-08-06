import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ScrollView,
} from 'react-native';
import { authApi } from '../../../api/auth';
import { useAuth } from '../../../context/AuthContext';
import { useFonts, Mali_400Regular, Mali_700Bold } from '@expo-google-fonts/mali';

// ---------------- โทนสีใหม่ (น้ำตาล - ครีม) ----------------
const theme = {
  background: '#F5F3E9', // ครีมอ่อนพื้นหลัง
  card: '#FFFFFF',       // ขาว
  primary: '#4A3623',    // น้ำตาลเข้ม (แทนสีดำ)
  inputBg: '#EBE7E0',    // ครีมเทา สำหรับช่องกรอกข้อมูล
  textLight: '#8D867E',  // เทาน้ำตาล สำหรับ Label
  textDark: '#382512',   // น้ำตาลเข้มสุด สำหรับข้อความหลัก
};

// ---------------- เอฟเฟกต์หัวใจ ----------------
const FloatingHeart = ({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) => {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => onComplete());
  }, []);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });
  const opacity = animation.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  return (
    <Animated.View style={[styles.heartContainer, { top: y - 20, left: x - 10, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.heartText}>🤎</Text>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { login } = useAuth();
  const [fontsLoaded] = useFonts({ Mali_400Regular, Mali_700Bold });

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const triggerHeart = (evt: any) => {
    const { pageX, pageY } = evt.nativeEvent;
    setHearts((prev) => [...prev, { id: Date.now(), x: pageX, y: pageY }]);
  };

  const removeHeart = (id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  const handleTabSwitch = (tab: 'LOGIN' | 'REGISTER', evt: any) => {
    setActiveTab(tab);
    triggerHeart(evt);
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  const handleSubmit = async (evt: any) => {
    triggerHeart(evt);
    if (activeTab === 'LOGIN') {
      if (!email || !password) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      setLoading(true);
      try {
        const response = await authApi.login({ email, password });
        // 🔴 อย่าลืม: เปลี่ยนตรงนี้ให้ตรงกับตัวแปรจาก JSON ของ Backend (เช่น accessToken)
        await login(response.accessToken || response.token, response.user);
      } catch (err: any) {
        Alert.alert('การเข้าสู่ระบบล้มเหลว', err?.response?.data?.message || err?.message || 'รหัสผ่านไม่ถูกต้อง');
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !displayName || !password) return Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      setLoading(true);
      try {
        const response = await authApi.register({ email, displayName, password, role, restaurantId: null });
        await login(response.accessToken || response.token, response.user);
      } catch (err: any) {
        Alert.alert('การสมัครสมาชิกล้มเหลว', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!fontsLoaded) return <View style={styles.loadingScreen}><ActivityIndicator size="large" color={theme.primary} /></View>;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      // 🔴 แก้ไข: บังคับใช้ 'height' สำหรับ Android
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---------------- Header ---------------- */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>📦</Text>
          </View>
          <Text style={styles.mainTitle}>Smart Expiry</Text>
          <Text style={styles.mainSubtitle}>Kitchen Expiry Management</Text>
        </View>

        {/* ---------------- Card ฟอร์ม ---------------- */}
        <View style={styles.card}>
          
          {/* แท็บ Sign In / Register */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'LOGIN' && styles.activeTab]} 
              onPress={(e) => handleTabSwitch('LOGIN', e)}
            >
              <Text style={[styles.tabText, activeTab === 'LOGIN' && styles.activeTabText]}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'REGISTER' && styles.activeTab]} 
              onPress={(e) => handleTabSwitch('REGISTER', e)}
            >
              <Text style={[styles.tabText, activeTab === 'REGISTER' && styles.activeTabText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* ฟอร์ม */}
          <View style={styles.formContainer}>
            
            {activeTab === 'REGISTER' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Somchai Saendee"
                  placeholderTextColor={theme.textLight}
                  value={displayName}
                  onChangeText={setDisplayName}
                  onTouchStart={triggerHeart}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="chef@restaurant.com"
                placeholderTextColor={theme.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onTouchStart={triggerHeart}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, { paddingRight: 45 }]} 
                  placeholder="••••••••"
                  placeholderTextColor={theme.textLight}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onTouchStart={triggerHeart}
                />
                <TouchableOpacity 
                  style={styles.eyeButton} 
                  onPress={(e) => { setShowPassword(!showPassword); triggerHeart(e); }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
              {activeTab === 'LOGIN' && (
                <TouchableOpacity style={styles.forgotPassword} onPress={triggerHeart}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            {activeTab === 'REGISTER' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ROLE</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[styles.roleButton, role === 'EMPLOYEE' && styles.roleActive]}
                    onPress={(e) => { setRole('EMPLOYEE'); triggerHeart(e); }}
                  >
                    <Text style={[styles.roleText, role === 'EMPLOYEE' && styles.roleTextActive]}>Employee</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleButton, role === 'MANAGER' && styles.roleActive]}
                    onPress={(e) => { setRole('MANAGER'); triggerHeart(e); }}
                  >
                    <Text style={[styles.roleText, role === 'MANAGER' && styles.roleTextActive]}>Manager</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ปุ่ม Submit */}
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {activeTab === 'LOGIN' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

          </View>
        </View>

      </ScrollView>

      {/* เรนเดอร์หัวใจ */}
      {hearts.map((heart) => (
        <FloatingHeart key={heart.id} x={heart.x} y={heart.y} onComplete={() => removeHeart(heart.id)} />
      ))}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { 
    flex: 1, 
    backgroundColor: theme.background 
  },
  scrollContent: {
    flexGrow: 1,
    // 🔴 แก้ไข: เพิ่มพื้นที่ด้านล่างสุด เพื่อให้คีย์บอร์ดไม่บังตอนเลื่อนลงมาสุด
    
  },
  
  // -- Header --
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 60,
    marginBottom: 30,
  },
  logoBox: {
    backgroundColor: theme.primary,
    width: 65,
    height: 65,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoIcon: { fontSize: 32 },
  mainTitle: { 
    fontFamily: 'Mali_700Bold', 
    fontSize: 28, 
    color: theme.textDark, 
    marginBottom: 4 
  },
  mainSubtitle: { 
    fontFamily: 'Mali_400Regular', 
    fontSize: 14, 
    color: theme.textLight 
  },

  // -- Card --
  card: {
    flex: 1,
    backgroundColor: theme.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },

  // -- Tabs --
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.inputBg,
    borderRadius: 99,
    padding: 6,
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 99,
  },
  activeTab: {
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { 
    fontFamily: 'Mali_400Regular', 
    fontSize: 15, 
    color: theme.textLight 
  },
  activeTabText: { 
    fontFamily: 'Mali_700Bold', 
    color: theme.textDark 
  },

  // -- Forms --
  formContainer: {
    width: '100%',
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontFamily: 'Mali_700Bold', 
    fontSize: 11, 
    color: theme.textLight, 
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  input: {
    fontFamily: 'Mali_400Regular',
    backgroundColor: theme.inputBg,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 52,
    fontSize: 15,
    color: theme.textDark,
  },
  
  // -- Password Wrapper & Eye Icon --
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontFamily: 'Mali_400Regular',
    fontSize: 13,
    color: theme.textLight,
  },

  // -- Role Selector --
  roleContainer: { 
    flexDirection: 'row', 
    gap: 12 
  },
  roleButton: { 
    flex: 1, 
    height: 52, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: theme.inputBg 
  },
  roleActive: { 
    backgroundColor: theme.primary 
  },
  roleText: { 
    fontFamily: 'Mali_400Regular', 
    fontSize: 15, 
    color: theme.textLight 
  },
  roleTextActive: { 
    fontFamily: 'Mali_700Bold', 
    color: '#FFF' 
  },

  // -- Submit Button --
  submitButton: {
    backgroundColor: theme.primary,
    height: 56,
    borderRadius: 99, 
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: { 
    fontFamily: 'Mali_700Bold', 
    color: '#FFFFFF', 
    fontSize: 16 
  },

  // -- Heart Effect --
  heartContainer: { 
    position: 'absolute', 
    pointerEvents: 'none', 
    zIndex: 999 
  },
  heartText: { 
    fontSize: 24 
  },
});