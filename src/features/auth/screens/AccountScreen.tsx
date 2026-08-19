import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store'; // 🔴 นำเข้า SecureStore เพื่อใช้จำประวัติการมีร้าน
import { useAuth } from '../../../context/AuthContext';

import { restaurantService } from '../../../api/restaurants';
import { authApi } from '../../../api/auth';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';

const theme = {
  background: '#F5F3E9',
  card: '#FFFFFF',
  primary: '#4A3623',
  inputBg: '#EBE7E0',
  textLight: '#8D867E',
  textDark: '#382512',
  border: '#DCD6CE',
  danger: '#D9534F',
};

export default function AccountScreen() {
  const { user, logout, setUser } = useAuth();
  
  const [mode, setMode] = useState<'SELECT' | 'CREATE' | 'JOIN'>('SELECT');
  const [restaurantName, setRestaurantName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'error',
  });

  const showModal = (title: string, message: string, type: 'info' | 'error' = 'info') => {
    setModalConfig({ visible: true, title, message, type });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  // 🔴 ลอจิกใหม่: เช็คประวัติการมีร้าน เพื่อแยก "เด็กใหม่" กับ "คนโดนเตะ" ออกจากกัน
  useEffect(() => {
    const checkKickedStatus = async () => {
      if (!user) return;

      try {
        const storageKey = `last_restaurant_of_${user.id}`;
        const lastRestId = await SecureStore.getItemAsync(storageKey);

        if (user.restaurantId) {
          // ถ้าปัจจุบันมีร้าน ให้จดจำเอาไว้ในเครื่อง
          await SecureStore.setItemAsync(storageKey, user.restaurantId.toString());
        } else {
          // ถ้าปัจจุบันไม่มีร้าน + แต่ในอดีตเคยมี = โดนเตะแน่นอน
          if (lastRestId) {
            showModal(
              'แจ้งเตือนสถานะ', 
              'คุณถูกนำออกจากทีม หรือร้านค้าถูกยุบไปแล้ว กรุณากรอกรหัสเพื่อเข้าร่วมทีมใหม่อีกครั้งครับ',
              'error'
            );
            // ลบความจำทิ้ง ป็อปอัพจะได้ไม่เด้งซ้ำๆ เวลาผู้ใช้กด Refresh หรือเปิดหน้านี้ใหม่
            await SecureStore.deleteItemAsync(storageKey);
          }
        }
      } catch (error) {
        console.log('SecureStore check error:', error);
      }
    };

    checkKickedStatus();
  }, [user]);

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  const handleCreateRestaurant = async () => {
    if (!restaurantName) return;
    setLoading(true);
    try {
      await restaurantService.createRestaurant(restaurantName);
      const currentUser = await authApi.getCurrentUser();
      if (setUser) setUser(currentUser);
    } catch (err: any) {
      console.log('>>> [DEBUG] Error สร้างร้าน:', err?.response?.data || err.message);
      showModal('ข้อผิดพลาด', err?.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างร้าน', 'error');
      setLoading(false);
    }
  };

  const handleJoinRestaurant = async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      await restaurantService.joinRestaurant(inviteCode);
      const currentUser = await authApi.getCurrentUser();
      if (setUser) setUser(currentUser);
    } catch (err: any) {
      console.log('>>> [DEBUG] Error เข้าร่วมร้าน:', err?.response?.data || err.message);
      showModal('ข้อผิดพลาด', err?.response?.data?.message || 'รหัสเชิญไม่ถูกต้อง หรือทีมเต็มแล้ว', 'error');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.userInfo}>
          <Text style={styles.userAvatar}>👤</Text>
          <Text style={styles.userName} numberOfLines={1}>{user?.displayName || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            
            <View style={styles.header}>
              <Text style={styles.icon}>🍳</Text>
              <Text style={styles.title}>Welcome to Smart Expiry</Text>
              <Text style={styles.subtitle}>Let's get your kitchen set up</Text>
            </View>

            {mode === 'SELECT' && (
              <View style={styles.optionsContainer}>
                {user?.role === 'MANAGER' && (
                  <TouchableOpacity style={styles.optionCard} onPress={() => setMode('CREATE')}>
                    <Text style={styles.optionIcon}>🏠</Text>
                    <Text style={styles.optionTitle}>Create a New Restaurant</Text>
                    <Text style={styles.optionDesc}>สร้างร้านอาหารของคุณเพื่อเริ่มต้นจัดการสต็อก!</Text>
                  </TouchableOpacity>
                )}

                {(user?.role === 'EMPLOYEE' || user?.role === 'MANAGER') && (
                  <TouchableOpacity style={styles.optionCard} onPress={() => setMode('JOIN')}>
                    <Text style={styles.optionIcon}>🤝</Text>
                    <Text style={styles.optionTitle}>Join an Existing Team</Text>
                    <Text style={styles.optionDesc}>เข้าร่วมทีมที่มีอยู่แล้วด้วยรหัสเชิญ (Invite Code)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {mode === 'CREATE' && (
              <View style={styles.formContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setMode('SELECT')}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.formTitle}>Name your restaurant</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>RESTAURANT NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. La Maison Kitchen"
                    placeholderTextColor={theme.textLight}
                    value={restaurantName}
                    onChangeText={setRestaurantName}
                    autoFocus
                  />
                </View>
                <TouchableOpacity style={styles.submitButton} onPress={handleCreateRestaurant} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Create Restaurant</Text>}
                </TouchableOpacity>
              </View>
            )}

            {mode === 'JOIN' && (
              <View style={styles.formContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => setMode('SELECT')}>
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.formTitle}>Enter your invite code</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>INVITE CODE</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. AB12CD34"
                    placeholderTextColor={theme.textLight}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="characters"
                    autoFocus
                  />
                </View>
                <TouchableOpacity style={styles.submitButton} onPress={handleJoinRestaurant} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Join Team</Text>}
                </TouchableOpacity>
              </View>
            )}
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: modalConfig.type === 'error' ? '#FEF2F2' : '#FFF4E5' }]}>
              <Feather 
                name={modalConfig.type === 'error' ? "alert-triangle" : "info"} 
                size={32} 
                color={modalConfig.type === 'error' ? theme.danger : theme.primary} 
              />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={[styles.modalButtonConfirm, { backgroundColor: theme.primary }]} 
                onPress={closeModal}
              >
                <Text style={styles.modalButtonConfirmText}>รับทราบ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { flex: 1, backgroundColor: theme.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 }, 
  
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  userAvatar: { fontSize: 18, marginRight: 8 },
  userName: { fontFamily: FONT_BOLD, fontSize: 14, color: theme.textDark },
  logoutButton: { backgroundColor: theme.inputBg, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12 },
  logoutButtonText: { fontFamily: FONT_BOLD, fontSize: 12, color: theme.danger },
  
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 120 }, 
  
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  
  title: { fontFamily: FONT_BOLD, fontSize: 24, color: theme.textDark, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: FONT_REGULAR, fontSize: 16, color: theme.textLight, textAlign: 'center' },
  
  optionsContainer: { width: '100%', gap: 16 },
  optionCard: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  optionIcon: { fontSize: 32, marginBottom: 12 },
  optionTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark, marginBottom: 6 },
  optionDesc: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight, lineHeight: 20 },
  
  formContainer: { backgroundColor: theme.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 8 },
  backButtonText: { fontFamily: FONT_BOLD, fontSize: 14, color: theme.textLight },
  formTitle: { fontFamily: FONT_BOLD, fontSize: 20, color: theme.textDark, marginBottom: 24 },
  
  inputGroup: { marginBottom: 24 },
  label: { fontFamily: FONT_BOLD, fontSize: 11, color: theme.textLight, marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  input: { fontFamily: FONT_REGULAR, backgroundColor: theme.inputBg, borderRadius: 16, paddingHorizontal: 18, height: 52, fontSize: 15, color: theme.textDark },
  
  submitButton: { backgroundColor: theme.primary, height: 56, borderRadius: 99, justifyContent: 'center', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonText: { fontFamily: FONT_BOLD, color: '#FFFFFF', fontSize: 16 },

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
    fontSize: 14,
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