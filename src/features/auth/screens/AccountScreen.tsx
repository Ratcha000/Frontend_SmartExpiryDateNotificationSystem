import React, { useState } from 'react';
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
} from 'react-native';
import { useFonts, Mali_400Regular, Mali_700Bold } from '@expo-google-fonts/mali';
import { useAuth } from '../../../context/AuthContext';

// 🔴 นำเข้า Service ที่เราจัดระเบียบไว้ (ปรับ path ให้ตรงกับโฟลเดอร์ api ของคุณนะครับ)
import { restaurantService } from '../../../api/restaurants';
import { authApi } from '../../../api/auth';

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
  const [fontsLoaded] = useFonts({ Mali_400Regular, Mali_700Bold });
  const { user, logout, setUser } = useAuth();
  
  const [mode, setMode] = useState<'SELECT' | 'CREATE' | 'JOIN'>('SELECT');
  const [restaurantName, setRestaurantName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

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
      // 1. เรียกใช้ Service สร้างร้าน
      await restaurantService.createRestaurant(restaurantName);
      
      // 2. เรียกใช้ Service ดึงข้อมูล User ล่าสุด
      const currentUser = await authApi.getCurrentUser();
      
      // 3. อัปเดตลง Context ระบบจะพาเด้งเข้า Dashboard อัตโนมัติ
      if (setUser) setUser(currentUser);
      
    } catch (err: any) {
      console.log('>>> [DEBUG] Error สร้างร้าน:', err?.response?.data || err.message);
      Alert.alert('ข้อผิดพลาด', err?.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างร้าน');
      setLoading(false);
    }
  };

  const handleJoinRestaurant = async () => {
    if (!inviteCode) return;
    setLoading(true);
    try {
      // 1. เรียกใช้ Service เข้าร่วมร้าน
      await restaurantService.joinRestaurant(inviteCode);
      
      // 2. เรียกใช้ Service ดึงข้อมูล User ล่าสุด
      const currentUser = await authApi.getCurrentUser();
      
      // 3. อัปเดตลง Context
      if (setUser) setUser(currentUser);
      
    } catch (err: any) {
      console.log('>>> [DEBUG] Error เข้าร่วมร้าน:', err?.response?.data || err.message);
      Alert.alert('ข้อผิดพลาด', err?.response?.data?.message || 'รหัสเชิญไม่ถูกต้อง');
      setLoading(false);
    }
  };

  if (!fontsLoaded) return <View style={styles.loadingScreen}><ActivityIndicator color={theme.primary} /></View>;

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
                    <Text style={styles.optionDesc}>สร้างร้านอาหารของคุณ!</Text>
                  </TouchableOpacity>
                )}

                {user?.role === 'EMPLOYEE' && (
                  <TouchableOpacity style={styles.optionCard} onPress={() => setMode('JOIN')}>
                    <Text style={styles.optionIcon}>🤝</Text>
                    <Text style={styles.optionTitle}>Join an Existing Team</Text>
                    <Text style={styles.optionDesc}>I have an invite code from my restaurant manager.</Text>
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
  userName: { fontFamily: 'Mali_700Bold', fontSize: 14, color: theme.textDark },
  logoutButton: { backgroundColor: theme.inputBg, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12 },
  logoutButtonText: { fontFamily: 'Mali_700Bold', fontSize: 12, color: theme.danger },
  
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 120 }, 
  
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  
  title: { fontFamily: 'Mali_700Bold', fontSize: 24, color: theme.textDark, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: 'Mali_400Regular', fontSize: 16, color: theme.textLight, textAlign: 'center' },
  
  optionsContainer: { width: '100%', gap: 16 },
  optionCard: { backgroundColor: theme.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  optionIcon: { fontSize: 32, marginBottom: 12 },
  optionTitle: { fontFamily: 'Mali_700Bold', fontSize: 18, color: theme.textDark, marginBottom: 6 },
  optionDesc: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight, lineHeight: 20 },
  
  formContainer: { backgroundColor: theme.card, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 8 },
  backButtonText: { fontFamily: 'Mali_700Bold', fontSize: 14, color: theme.textLight },
  formTitle: { fontFamily: 'Mali_700Bold', fontSize: 20, color: theme.textDark, marginBottom: 24 },
  
  inputGroup: { marginBottom: 24 },
  label: { fontFamily: 'Mali_700Bold', fontSize: 11, color: theme.textLight, marginBottom: 8, marginLeft: 4, letterSpacing: 1 },
  input: { fontFamily: 'Mali_400Regular', backgroundColor: theme.inputBg, borderRadius: 16, paddingHorizontal: 18, height: 52, fontSize: 15, color: theme.textDark },
  
  submitButton: { backgroundColor: theme.primary, height: 56, borderRadius: 99, justifyContent: 'center', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonText: { fontFamily: 'Mali_700Bold', color: '#FFFFFF', fontSize: 16 },
});