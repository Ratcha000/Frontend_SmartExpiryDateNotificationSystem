import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authApi } from '../../../api/auth';
import { useAuth } from '../../../context/AuthContext';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';

const theme = {
  background: '#F5F3E9',
  card: '#FFFFFF',       
  primary: '#4A3623',    
  inputBg: '#EBE7E0',    
  textLight: '#8D867E',  
  textDark: '#382512',
  danger: '#D9534F',
  success: '#10B981',
};

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

export default function LogInScreen() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'error' as 'error' | 'success',
    title: '',
    message: '',
  });

  const showModal = (type: 'error' | 'success', title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

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
      if (!email || !password) return showModal('error', 'ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      setLoading(true);
      try {
        const response = await authApi.login({ email, password });
        
        const raw = response as any;
        const token = raw?.token || raw?.data?.token || raw?.accessToken || raw?.data?.accessToken;
        const userData = raw?.user || raw?.data?.user;
        
        if (!token) throw new Error('ไม่พบ Token จากเซิร์ฟเวอร์');
        
        await login(token, userData);
      } catch (err: any) {
        showModal('error', 'การเข้าสู่ระบบล้มเหลว', err?.response?.data?.message || err?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !displayName || !password) return showModal('error', 'ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      setLoading(true);
      try {
        const response = await authApi.register({ email, displayName, password, role, restaurantId: null });
        
        const raw = response as any;
        const token = raw?.token || raw?.data?.token || raw?.accessToken || raw?.data?.accessToken;
        const userData = raw?.user || raw?.data?.user;
        
        if (!token) throw new Error('ไม่พบ Token จากเซิร์ฟเวอร์');

        await login(token, userData);
      } catch (err: any) {
        showModal('error', 'การสมัครสมาชิกล้มเหลว', err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    }
  };

  const isError = modalConfig.type === 'error';
  const modalIconName = isError ? 'x-circle' : 'check-circle';
  const modalIconColor = isError ? theme.danger : theme.success;
  const modalIconBgColor = isError ? '#FEF2F2' : '#D1FAE5';

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      // 🔴 แก้ไข: ปิดการดันหน้าจอใน Android (ใช้ undefined) ให้ระบบมันจัดการเลื่อนเองธรรมชาติ
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never" // 🔴 แก้ไข: ล็อคไม่ให้ดึงหน้าจอเกินใน Android ขอบล่างจะได้ไม่ลอย
      >
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>📦</Text>
          </View>
          <Text style={styles.mainTitle}>Smart Expiry</Text>
          <Text style={styles.mainSubtitle}>Kitchen Expiry Management</Text>
        </View>

        <View style={styles.card}>
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

      {hearts.map((heart) => (
        <FloatingHeart key={heart.id} x={heart.x} y={heart.y} onComplete={() => removeHeart(heart.id)} />
      ))}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: modalIconBgColor }]}>
              <Feather name={modalIconName} size={32} color={modalIconColor} />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={[styles.modalButtonConfirm, { backgroundColor: theme.primary }]} 
                onPress={closeModal}
              >
                <Text style={styles.modalButtonConfirmText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  
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
    fontFamily: FONT_BOLD, 
    fontSize: 28, 
    color: theme.textDark, 
    marginBottom: 4 
  },
  mainSubtitle: { 
    fontFamily: FONT_REGULAR, 
    fontSize: 14, 
    color: theme.textLight 
  },

  card: {
    flex: 1, // 🔴 ให้การ์ดสีขาวยืดไปเติมพื้นที่หน้าจอที่เหลือโดยอัตโนมัติ
    backgroundColor: theme.card,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40, // 🔴 เอา 200 ออก กลับมาใช้ขนาดปกติ ขอบล่างจะได้ไม่ยาวเกินเบอร์
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },

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
    fontFamily: FONT_REGULAR, 
    fontSize: 15, 
    color: theme.textLight 
  },
  activeTabText: { 
    fontFamily: FONT_BOLD, 
    color: theme.textDark 
  },

  formContainer: {
    width: '100%',
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontFamily: FONT_BOLD, 
    fontSize: 11, 
    color: theme.textLight, 
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  input: {
    fontFamily: FONT_REGULAR,
    backgroundColor: theme.inputBg,
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 52,
    fontSize: 15,
    color: theme.textDark,
  },
  
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
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: theme.textLight,
  },

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
    fontFamily: FONT_REGULAR, 
    fontSize: 15, 
    color: theme.textLight 
  },
  roleTextActive: { 
    fontFamily: FONT_BOLD, 
    color: '#FFF' 
  },

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
    fontFamily: FONT_BOLD, 
    color: '#FFFFFF', 
    fontSize: 16 
  },

  heartContainer: { 
    position: 'absolute', 
    pointerEvents: 'none', 
    zIndex: 999 
  },
  heartText: { 
    fontSize: 24 
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 54, 35, 0.4)', 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: theme.card,
    width: '100%',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    color: theme.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: FONT_REGULAR,
    fontSize: 15,
    color: theme.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButtonConfirm: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: '#FFF',
  },
});