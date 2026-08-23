import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client';
import { getNotifications, markNotificationRead } from '../../../api/notifications';
import { deleteIngredient } from '../../../api/ingredients';
import type { AppNotification } from '../../../types';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';
import { formatRelativeTime } from './components/purchase/purchaseUtils';

const theme = {
  background: '#F9F8F4',
  card: '#FFFFFF',
  primary: '#24211D',
  textLight: '#A39C93',
  textDark: '#24211D',
  inputBg: '#F3F4F6', 
  expired: '#DC2626',
  expiredBg: '#FEE2E2',
  nearExpiry: '#D97706',
  nearExpiryBg: '#FEF3C7',
  success: '#10B981',
  successBg: '#E6F4EA',
  border: '#E8E6E1',
};

export default function AlertsScreen({ navigation }: any) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [expiredItems, setExpiredItems] = useState<any[]>([]);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'alert' as 'alert' | 'confirm',
    onConfirm: null as (() => void) | null,
  });
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const showModal = (title: string, message: string, type: 'alert' | 'confirm' = 'alert', onConfirm: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, type, onConfirm });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  /** แจ้งเตือนจริงจาก backend (scheduler สร้างให้ Manager ตอนถึงรอบซื้อของ) */
  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data || []);
    } catch (error) {
      // ไม่ให้ล้มทั้งหน้า — ส่วนวัตถุดิบใกล้หมดอายุด้านล่างยังใช้งานได้
      console.log('Error fetching notifications:', error);
    }
  };

  const fetchAlerts = async () => {
    if (!user?.restaurantId) return;
    try {
      const res = await apiClient.get(`/ingredients?restaurantId=${user.restaurantId}`);
      const activeItems = res.data.filter((item: any) => item.status !== 'DELETED');
      
      setExpiredItems(activeItems.filter((item: any) => item.expired || item.status === 'EXPIRED'));
      setExpiringItems(activeItems.filter((item: any) => item.expiring && !item.expired && item.status !== 'EXPIRED'));
    } catch (error) {
      console.log('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
      fetchNotifications();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
    fetchNotifications();
  }, []);

  /** แตะแจ้งเตือน 1 ใบ -> mark read แบบ optimistic แล้วพาไปหน้าแผนซื้อของ */
  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.read) {
      setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)));
      try {
        await markNotificationRead(item.id);
      } catch (error) {
        console.log('Error marking notification read:', error);
        setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, read: false } : n)));
      }
    }
    if (item.type === 'PURCHASE_RECOMMENDATION') {
      navigation.navigate('PurchasePlanning');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
    } catch (error) {
      console.log('Error marking all notifications read:', error);
      fetchNotifications();
    }
  };

  const handleDeletePress = (item: any) => {
    if (!isManager) {
      showModal('ปฏิเสธการเข้าถึง', 'ขออภัย เฉพาะ Manager เท่านั้นที่สามารถลบข้อมูลวัตถุดิบได้ครับ', 'alert');
      return;
    }
    setItemToDelete(item);
    showModal(
      'ยืนยันการลบข้อมูล', 
      `คุณต้องการลบ "${item.name}" ออกจากคลังสินค้าใช่หรือไม่?`, 
      'confirm', 
      executeDelete
    );
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
      await deleteIngredient(itemToDelete.id);
      closeModal();
      setItemToDelete(null);
      fetchAlerts(); 
    } catch (error: any) {
      showModal('ข้อผิดพลาด', 'ไม่สามารถลบวัตถุดิบได้ เกิดข้อผิดพลาดจากระบบ', 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalNotifications = expiredItems.length + expiringItems.length;
  const hasAnything = totalNotifications + notifications.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Notifications</Text>
          <Text style={styles.pageSubtitle}>
            {unreadCount + totalNotifications} รายการที่ยังไม่ได้อ่าน
          </Text>
        </View>
        <TouchableOpacity onPress={handleMarkAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.markReadText, unreadCount === 0 && { opacity: 0.4 }]}>อ่านทั้งหมด</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        
        {!hasAnything ? (
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>ไม่มีการแจ้งเตือนในขณะนี้</Text>
          </View>
        ) : (
          <>
            {/* --- แจ้งเตือนจากระบบ (แผนซื้อของ) — Employee จะได้ลิสต์ว่างจาก backend --- */}
            {notifications.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.textLight }]}>จากระบบ</Text>
                {notifications.map(item => {
                  const failed = item.type === 'PURCHASE_RECOMMENDATION_FAILED';
                  return (
                    <TouchableOpacity
                      key={`noti-${item.id}`}
                      style={[styles.card, !item.read && styles.cardUnread]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardInfo}>
                        <View style={[styles.notiIcon, { backgroundColor: failed ? theme.expiredBg : theme.successBg }]}>
                          <Feather
                            name={failed ? 'alert-triangle' : 'shopping-cart'}
                            size={18}
                            color={failed ? theme.expired : theme.success}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.title}</Text>
                          <Text style={styles.itemDesc}>{item.message}</Text>
                          <Text style={styles.notiTime}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>
                      </View>
                      {!item.read && <View style={[styles.dot, { backgroundColor: theme.nearExpiry, marginRight: 0, marginLeft: 12 }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* --- หมวดหมู่: หมดอายุ (EXPIRED) --- */}
            {expiredItems.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.expired }]}>วิกฤต — หมดอายุแล้ว</Text>
                {expiredItems.map(item => (
                  <View key={`exp-${item.id}`} style={styles.card}>
                    <View style={styles.cardInfo}>
                      <View style={[styles.dot, { backgroundColor: theme.expired }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemDesc}>
                          หมดอายุไปแล้ว {Math.abs(item.daysLeft)} วัน • เหลือ {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: theme.expiredBg }]}
                      onPress={() => handleDeletePress(item)}
                    >
                      <Feather name="trash-2" size={18} color={theme.expired} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* --- หมวดหมู่: ใกล้หมดอายุ (NEAR EXPIRY) --- */}
            {expiringItems.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.nearExpiry }]}>คำเตือน — ใกล้หมดอายุ</Text>
                {expiringItems.map(item => (
                  <View key={`near-${item.id}`} style={styles.card}>
                    <View style={styles.cardInfo}>
                      <View style={[styles.dot, { backgroundColor: theme.nearExpiry }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemDesc}>
                          จะหมดอายุในอีก {item.daysLeft} วัน • เหลือ {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: theme.successBg }]}
                      onPress={() => navigation.navigate('MenuSuggestions')}
                    >
                      <Feather name="zap" size={18} color={theme.success} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal animationType="fade" transparent={true} visible={modalConfig.visible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: modalConfig.type === 'alert' ? theme.expiredBg : theme.nearExpiryBg }]}>
              <Feather name="alert-triangle" size={32} color={modalConfig.type === 'alert' ? theme.expired : theme.nearExpiry} />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            
            <View style={styles.modalButtonGroup}>
              {modalConfig.type === 'confirm' && (
                <TouchableOpacity style={styles.modalButtonCancel} onPress={closeModal}>
                  <Text style={styles.modalButtonCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.modalButtonConfirm, { backgroundColor: modalConfig.type === 'alert' ? theme.primary : theme.expired }]} 
                onPress={() => {
                  if (modalConfig.type === 'confirm' && modalConfig.onConfirm) {
                    modalConfig.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
              >
                <Text style={styles.modalButtonConfirmText}>{modalConfig.type === 'confirm' ? 'ลบข้อมูล' : 'ตกลง'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20 },
  pageTitle: { fontFamily: FONT_BOLD, fontSize: 32, color: theme.textDark, marginBottom: 4 },
  pageSubtitle: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight },
  markReadText: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight, marginTop: 12 },
  
  scrollContent: { paddingHorizontal: 20 },
  
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textLight },
  
  section: { marginBottom: 32 },
  sectionTitle: { fontFamily: FONT_BOLD, fontSize: 11, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  
  card: { backgroundColor: theme.card, borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardUnread: { borderWidth: 1, borderColor: theme.nearExpiryBg },
  cardInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  notiIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notiTime: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textLight, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  itemName: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark, marginBottom: 4 },
  itemDesc: { fontFamily: FONT_REGULAR, fontSize: 13, color: theme.textLight },
  
  actionBtn: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74, 54, 35, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { backgroundColor: theme.card, width: '100%', borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: FONT_BOLD, fontSize: 22, color: theme.textDark, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontFamily: FONT_REGULAR, fontSize: 15, color: theme.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtonGroup: { flexDirection: 'row', width: '100%' },
  modalButtonCancel: { flex: 1, height: 52, backgroundColor: theme.inputBg, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: theme.border },
  modalButtonCancelText: { fontFamily: FONT_BOLD, fontSize: 15, color: theme.textLight },
  modalButtonConfirm: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalButtonConfirmText: { fontFamily: FONT_BOLD, fontSize: 15, color: '#FFF' },
});