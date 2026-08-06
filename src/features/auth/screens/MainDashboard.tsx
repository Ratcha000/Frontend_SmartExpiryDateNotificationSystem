import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator, TextInput, ScrollView, Modal } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard'; 
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client'; 
import HomeScreen from './HomeScreen';

const Tab = createBottomTabNavigator();

const theme = {
  background: '#F5F3E9',
  card: '#FFFFFF',
  primary: '#4A3623',
  textLight: '#8D867E',
  textDark: '#382512',
  danger: '#D9534F',
  success: '#10B981', // เพิ่มสีเขียวสำหรับ Success
  inputBg: '#EBE7E0'
};

// ---------------- หน้า Home, Inventory, Alerts (โครงร่างเดิม) ----------------

const InventoryScreen = () => (
  <View style={styles.centerContainer}><Text style={styles.title}>Inventory</Text></View>
);
const AlertsScreen = () => (
  <View style={styles.centerContainer}><Text style={styles.title}>Alerts</Text></View>
);

// ---------------- หน้า Team ----------------
const TeamScreen = () => {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [restaurant, setRestaurant] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // 🔴 State สำหรับ Custom Modal อเนกประสงค์
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'success' as 'success' | 'error' | 'confirm',
    title: '',
    message: '',
    confirmText: 'OK',
    onConfirm: null as (() => void) | null,
  });

  // ฟังก์ชันตัวช่วยสำหรับเปิด/ปิด Modal
  const showModal = (type: 'success' | 'error' | 'confirm', title: string, message: string, onConfirm: (() => void) | null = null, confirmText = 'OK') => {
    setModalConfig({ visible: true, type, title, message, onConfirm, confirmText });
  };
  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    fetchTeamData();
  }, [user]);

  const fetchTeamData = async () => {
    setIsLoading(true); 
    if (!user || !user.restaurantId) {
      setIsLoading(false); 
      return;
    }
    try {
      const resRest = await apiClient.get('/restaurants/me');
      setRestaurant(resRest.data);
      setNewName(resRest.data?.name || '');

      if (resRest.data?.id) {
        const resMembers = await apiClient.get(`/restaurants/${resRest.data.id}/members`);
        setMembers(resMembers.data);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // 🔴 เปลี่ยน Alert เป็น showModal
  const handleCopyCode = async () => {
    if (restaurant?.inviteCode) {
      await Clipboard.setStringAsync(restaurant.inviteCode);
      showModal('success', 'Copied!', 'คัดลอก Invite Code ลงคลิปบอร์ดแล้ว');
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return setIsEditingName(false);
    try {
      await apiClient.put(`/restaurants/${restaurant.id}`, { name: newName });
      setRestaurant({ ...restaurant, name: newName });
      setIsEditingName(false);
      showModal('success', 'Success', 'อัปเดตชื่อร้านเรียบร้อยแล้ว');
    } catch (error) {
      showModal('error', 'Error', 'ไม่สามารถอัปเดตชื่อร้านได้');
    }
  };

  // 🔴 ฟังก์ชันลบสมาชิก (โยงกับ Modal Confirm)
  const executeDelete = async (memberId: string) => {
    try {
      await apiClient.delete(`/restaurants/${restaurant.id}/members/${memberId}`);
      setMembers(members.filter(m => m.id !== memberId));
      showModal('success', 'Success', 'ลบสมาชิกเรียบร้อยแล้ว');
    } catch (error) {
      showModal('error', 'Error', 'ไม่สามารถลบสมาชิกได้');
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    showModal(
      'confirm', 
      'Remove Member', 
      `คุณต้องการลบ ${memberName} ออกจากทีมใช่หรือไม่?`, 
      () => executeDelete(memberId), 
      'Remove'
    );
  };

  // 🔴 ฟังก์ชันยืนยันก่อน Log Out
  const handleLogout = () => {
    showModal(
      'confirm',
      'Log Out',
      'คุณต้องการออกจากระบบใช่หรือไม่?',
      () => logout(),
      'Log Out'
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ตัวแปรสำหรับคุมสีและไอคอนของ Modal แต่ละประเภท
  const isConfirm = modalConfig.type === 'confirm';
  const isError = modalConfig.type === 'error';
  const modalIconName = isConfirm ? 'alert-triangle' : isError ? 'x-circle' : 'check-circle';
  const modalIconColor = isConfirm ? theme.danger : isError ? theme.danger : theme.success;
  const modalIconBgColor = isConfirm ? '#FEF2F2' : isError ? '#FEF2F2' : '#D1FAE5';

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.pageTitle}>Team</Text>
          
          {!user?.restaurantId ? (
            <Text style={styles.pageSubtitle}>No Restaurant Assigned</Text>
          ) : isEditingName ? (
            <View style={styles.editNameRow}>
              <TextInput 
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.iconButton}>
                <Feather name="check" size={20} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsEditingName(false); setNewName(restaurant.name); }} style={styles.iconButton}>
                <Feather name="x" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.restaurantNameRow}>
              <Text style={styles.pageSubtitle} numberOfLines={1}>{restaurant?.name}</Text>
              {isManager && (
                <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editIcon}>
                  <Feather name="edit-2" size={14} color={theme.textLight} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.profileIcon}>
          <Feather name="user" size={24} color={theme.card} />
        </TouchableOpacity>
      </View>

      {!user?.restaurantId ? (
        <View style={styles.noRestaurantContainer}>
          <Feather name="alert-circle" size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
          <Text style={styles.noRestaurantTitle}>You don't have a team yet.</Text>
          <Text style={styles.noRestaurantDesc}>Please create or join a restaurant to view team members.</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{members.length}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Items Tracked</Text>
            </View>
          </View>

          {isManager && restaurant?.inviteCode && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TEAM INVITE CODE</Text>
              <View style={styles.inviteCard}>
                <View style={styles.inviteTextWrapper}>
                  <Text style={styles.inviteCode}>{restaurant.inviteCode}</Text>
                  <Text style={styles.inviteDesc}>Share this code with new team members</Text>
                </View>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                  <Feather name="copy" size={20} color={theme.textDark} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.memberHeader}>
              <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>
            </View>

            {members.map((item) => (
              <View key={item.id} style={styles.memberCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <View>
                    <Text style={styles.memberName}>{item.displayName}</Text>
                    <View style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                      <Text style={styles.memberRoleBadge}>
                        {item.role.charAt(0).toUpperCase() + item.role.slice(1).toLowerCase()}
                      </Text>
                    </View>
                  </View>
                  
                  {isManager && item.id !== user.id && (
                    <TouchableOpacity 
                      style={styles.deleteMemberBtn} 
                      onPress={() => handleRemoveMember(item.id, item.displayName)}
                    >
                      <Feather name="trash-2" size={18} color={theme.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 🔴 เรียกใช้ handleLogout แทน */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>

      {/* 🔴 Universal Custom Modal */}
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
            
            {/* เช็คเพื่อจัดรูปแบบข้อความเน้นตัวหนาให้เนียนๆ */}
            <Text style={styles.modalMessage}>
              {modalConfig.message.includes('คุณต้องการลบ') ? (
                <>คุณต้องการลบ <Text style={{ fontFamily: 'Mali_700Bold', color: theme.textDark }}>{modalConfig.message.replace('คุณต้องการลบ ', '').replace(' ออกจากทีมใช่หรือไม่?', '')}</Text> ออกจากทีมใช่หรือไม่?</>
              ) : (
                modalConfig.message
              )}
            </Text>
            
            <View style={styles.modalButtonGroup}>
              {/* ปุ่ม Cancel (โชว์เฉพาะตอนเป็น confirm) */}
              {isConfirm && (
                <TouchableOpacity style={styles.modalButtonCancel} onPress={closeModal}>
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              
              {/* ปุ่ม Confirm / OK */}
              <TouchableOpacity 
                style={[
                  styles.modalButtonConfirm, 
                  !isConfirm && { backgroundColor: theme.primary } // เปลี่ยนสีปุ่มถ้าไม่ใช่ Confirm
                ]} 
                onPress={() => {
                  closeModal();
                  if (modalConfig.onConfirm) modalConfig.onConfirm();
                }}
              >
                <Text style={styles.modalButtonConfirmText}>{modalConfig.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

// ---------------- Component หลัก (Bottom Tabs) ----------------
export default function MainDashboard() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Inventory') iconName = 'box';
          else if (route.name === 'Alerts') iconName = 'bell';
          else if (route.name === 'Team') iconName = 'users';
          return <Feather name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textLight,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: 'Mali_700Bold', fontSize: 11, marginTop: 4 }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
  title: { fontFamily: 'Mali_700Bold', fontSize: 24, color: theme.textDark },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontFamily: 'Mali_700Bold', fontSize: 28, color: theme.textDark },
  pageSubtitle: { fontFamily: 'Mali_400Regular', fontSize: 16, color: theme.textLight },
  profileIcon: { backgroundColor: theme.textDark, padding: 12, borderRadius: 16 },
  restaurantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editIcon: { padding: 4 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  nameInput: { flex: 1, backgroundColor: theme.card, fontFamily: 'Mali_400Regular', fontSize: 14, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, color: theme.textDark, borderWidth: 1, borderColor: theme.inputBg },
  iconButton: { padding: 6, backgroundColor: theme.card, borderRadius: 8 },
  noRestaurantContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingVertical: 100 },
  noRestaurantTitle: { fontFamily: 'Mali_700Bold', fontSize: 18, color: theme.textDark, textAlign: 'center', marginBottom: 8 },
  noRestaurantDesc: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: theme.card, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statNumber: { fontFamily: 'Mali_700Bold', fontSize: 20, color: theme.textDark },
  statLabel: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Mali_700Bold', fontSize: 11, color: theme.textLight, letterSpacing: 1, marginBottom: 12 },
  inviteCard: { flexDirection: 'row', backgroundColor: theme.card, padding: 20, borderRadius: 20, justifyContent: 'space-between', alignItems: 'center' },
  inviteTextWrapper: { flex: 1, paddingRight: 12 }, 
  inviteCode: { fontFamily: 'Mali_700Bold', fontSize: 22, letterSpacing: 2, color: theme.textDark },
  inviteDesc: { fontFamily: 'Mali_400Regular', fontSize: 13, color: theme.textLight, marginTop: 4 },
  copyButton: { backgroundColor: theme.inputBg, padding: 12, borderRadius: 12 },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  memberCard: { flexDirection: 'row', backgroundColor: theme.card, padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.textDark, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontFamily: 'Mali_700Bold', color: '#FFF', fontSize: 16 },
  memberInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontFamily: 'Mali_700Bold', fontSize: 16, color: theme.textDark },
  memberRoleBadge: { fontFamily: 'Mali_400Regular', fontSize: 11, color: theme.textLight, backgroundColor: theme.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  deleteMemberBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
  logoutButton: { backgroundColor: theme.danger, padding: 16, borderRadius: 99, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  logoutButtonText: { fontFamily: 'Mali_700Bold', color: '#FFF', fontSize: 16 },

  // Styles สำหรับ Custom Modal (ปรับโครงสร้างใหม่ให้ใช้ได้ทุกประเภท)
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
    fontFamily: 'Mali_700Bold',
    fontSize: 22,
    color: theme.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Mali_400Regular',
    fontSize: 15,
    color: theme.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    height: 52,
    backgroundColor: theme.inputBg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 15,
    color: theme.textLight,
  },
  modalButtonConfirm: {
    flex: 1,
    height: 52,
    backgroundColor: theme.danger, // สีเริ่มต้น (สีแดง) 
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 15,
    color: '#FFF',
  },
});