import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client';

const theme = {
  background: '#F9F8F4',
  card: '#FFFFFF',
  primary: '#24211D',
  textLight: '#A39C93',
  textDark: '#24211D',
  inputBg: '#F3F4F6',
  
  nearExpiry: '#D97706',
  nearExpiryBg: '#FEF3C7',
  lowStock: '#2563EB',
  lowStockBg: '#DBEAFE',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  border: '#E8E6E1',
};

export default function IngredientDetailScreen({ route, navigation }: any) {
  // 🔴 ใช้ State มารับค่า item เพื่อให้เวลาแก้ไข (Consume/Restock) หน้าจอจะอัปเดตตัวเลขได้ทันที
  const [currentItem, setCurrentItem] = useState(route.params.item);
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [isLoading, setIsLoading] = useState(false);

  // State สำหรับ Modal แจ้งเตือน/ยืนยันลบ
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'alert' as 'alert' | 'confirm',
    onConfirm: null as (() => void) | null,
  });

  // State สำหรับ Modal Consume / Restock
  const [actionModal, setActionModal] = useState({
    visible: false,
    type: 'consume' as 'consume' | 'restock',
    amount: '',
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const showModal = (title: string, message: string, type: 'alert' | 'confirm' = 'alert', onConfirm: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, type, onConfirm });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  // ฟังก์ชันลบวัตถุดิบ (ดักจับ 500 Internal Server Error จาก Backend)
  const executeDelete = async () => {
    setIsLoading(true);
    try {
      await apiClient.delete(`/ingredients/${currentItem.id}`);
      closeModal();
      navigation.goBack(); 
    } catch (error: any) {
      console.log('Delete error:', error?.response?.status, error?.message);
      
      let errMsg = 'ไม่สามารถลบวัตถุดิบได้ เกิดข้อผิดพลาดจากระบบ';
      if (error?.response?.status === 500) {
        errMsg = 'ระบบหลังบ้าน (Backend) แจ้งข้อผิดพลาด 500 อาจเกิดจากข้อมูลถูกผูกมัดหรือเซิร์ฟเวอร์มีปัญหาครับ';
      }
      
      showModal('ข้อผิดพลาด', errMsg, 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePress = () => {
    if (!isManager) {
      showModal(
        'ปฏิเสธการเข้าถึง', 
        'ไม่สามารถลบได้เนื่องจากคุณไม่ใช่ Manager',
        'alert'
      );
    } else {
      showModal(
        'ยืนยันการลบ', 
        `คุณต้องการลบ "${currentItem.name}" ออกจากคลังสินค้าจริงหรือไม่?`,
        'confirm',
        executeDelete
      );
    }
  };

  // ฟังก์ชันจัดการ Consume / Restock
  const handleActionSubmit = async () => {
    const val = parseFloat(actionModal.amount);
    if (isNaN(val) || val <= 0) {
      showModal('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกจำนวนตัวเลขที่ถูกต้อง', 'alert');
      return;
    }

    let newQuantity = currentItem.quantity;
    if (actionModal.type === 'consume') {
      newQuantity -= val;
      if (newQuantity < 0) newQuantity = 0; // ป้องกันสต็อกติดลบ
    } else {
      newQuantity += val;
    }

    setIsActionLoading(true);
    try {
      const res = await apiClient.put(`/ingredients/${currentItem.id}`, {
        ...currentItem,
        quantity: newQuantity
      });
      setCurrentItem(res.data); // อัปเดตข้อมูลบนหน้าจอ
      setActionModal({ visible: false, type: 'consume', amount: '' }); // ปิด Modal
    } catch (error: any) {
      console.log('Action update error:', error?.message);
      showModal('ข้อผิดพลาด', 'ไม่สามารถอัปเดตจำนวนสต็อกได้', 'alert');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ประวัติการใช้งาน (จำลองไว้ก่อนรอ Backend)
  const dummyHistory = [
    { id: 1, type: 'consume', amount: '0.6 L', user: 'Marco R.', time: 'Today, 10:42 AM', icon: 'arrow-down', color: theme.nearExpiry },
    { id: 2, type: 'restock', amount: '2 L', user: 'System', time: 'Today, 08:15 AM', icon: 'refresh-cw', color: '#10B981' },
    { id: 3, type: 'consume', amount: '1 L', user: 'Sofia L.', time: 'Yesterday, 7:30 PM', icon: 'arrow-down', color: theme.nearExpiry },
    { id: 4, type: 'add', amount: '4 L', user: 'Admin', time: 'Jul 20, 9:00 AM', icon: 'plus', color: theme.textLight },
  ];

  const calculateProgress = () => {
    const par = currentItem.initialQuantity || 1;
    let percent = (currentItem.quantity / par) * 100;
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;
    return `${percent}%`;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* --- Header (ลบปุ่มปากกาออกแล้ว) --- */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={theme.textDark} />
          </TouchableOpacity>
        </View>

        {/* --- Title & Badges --- */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{currentItem.category || 'Uncategorized'}</Text>
        </View>
        <Text style={styles.itemName}>{currentItem.name}</Text>
        
        <View style={styles.badgeRow}>
          {(currentItem.expiring || currentItem.expired || currentItem.status === 'EXPIRED') && (
            <View style={[styles.badge, { backgroundColor: currentItem.expired || currentItem.status === 'EXPIRED' ? theme.dangerBg : theme.nearExpiryBg }]}>
              <View style={[styles.badgeDot, { backgroundColor: currentItem.expired || currentItem.status === 'EXPIRED' ? theme.danger : theme.nearExpiry }]} />
              <Text style={[styles.badgeText, { color: currentItem.expired || currentItem.status === 'EXPIRED' ? theme.danger : theme.nearExpiry }]}>
                {currentItem.expired || currentItem.status === 'EXPIRED' ? 'Expired' : 'Near Expiry'}
              </Text>
            </View>
          )}
          {currentItem.quantity <= (currentItem.initialQuantity * 0.20) && (
            <View style={[styles.badge, { backgroundColor: theme.lowStockBg }]}>
              <Feather name="trending-down" size={12} color={theme.lowStock} style={{ marginRight: 4 }} />
              <Text style={[styles.badgeText, { color: theme.lowStock }]}>Low Stock</Text>
            </View>
          )}
        </View>

        {/* --- Info Cards --- */}
        <View style={styles.infoCardsRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>REMAINING</Text>
            <Text style={styles.infoCardValue}>{currentItem.quantity}</Text>
            <Text style={styles.infoCardSub}>{currentItem.unit} of {currentItem.initialQuantity} {currentItem.unit} par</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: calculateProgress() as any }]} />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>EXPIRES</Text>
            <Text style={[styles.infoCardValue, { fontSize: 18, marginTop: 6 }]}>{new Date(currentItem.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            <Text style={[styles.infoCardValue, { color: theme.nearExpiry, fontSize: 18 }]}>
              {currentItem.daysLeft < 0 ? `${Math.abs(currentItem.daysLeft)} days overdue` : `${currentItem.daysLeft} days left`}
            </Text>
            <Text style={styles.infoCardSub}>Notify {currentItem.notifyDaysBefore || 2}d before</Text>
          </View>
        </View>

        {/* --- Storage Location --- */}
        <View style={styles.storageCard}>
          <Feather name="map-pin" size={18} color={theme.textLight} />
          <Text style={styles.storageText}>{currentItem.storageLocation || 'Walk-in Fridge'}</Text>
        </View>

        {/* --- Main Action Buttons (Consume / Restock) --- */}
        <View style={styles.mainActionsRow}>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: theme.primary }]}
            onPress={() => setActionModal({ visible: true, type: 'consume', amount: '' })}
          >
            <Text style={[styles.mainActionText, { color: '#FFF' }]}>Consume</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}
            onPress={() => setActionModal({ visible: true, type: 'restock', amount: '' })}
          >
            <Text style={[styles.mainActionText, { color: theme.textDark }]}>Restock</Text>
          </TouchableOpacity>
        </View>

        {/* --- Secondary Action Buttons --- */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity style={styles.secActionBtn}>
            <Feather name="check" size={16} color={theme.textDark} />
            <Text style={styles.secActionText}>Mark Used</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secActionBtn}>
            <Feather name="edit-2" size={16} color={theme.textDark} />
            <Text style={styles.secActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secActionBtn, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBg }]} onPress={handleDeletePress}>
            <Feather name="trash-2" size={16} color={theme.danger} />
            <Text style={[styles.secActionText, { color: theme.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* --- Usage History --- */}
        <Text style={styles.historyTitle}>Usage History</Text>
        <View style={styles.historyContainer}>
          {dummyHistory.map((hist, index) => (
            <View key={hist.id} style={styles.historyItem}>
              <View style={styles.historyIconCol}>
                <View style={[styles.historyIconBg, { backgroundColor: `${hist.color}20` }]}>
                  <Feather name={hist.icon as any} size={14} color={hist.color} />
                </View>
                {index !== dummyHistory.length - 1 && <View style={styles.historyLine} />}
              </View>
              <View style={styles.historyContent}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyActionText}>
                    {hist.type === 'consume' ? 'Consumed ' : hist.type === 'restock' ? 'Restocked ' : 'Added '}
                    <Text style={{ fontFamily: 'Mali_700Bold' }}>{hist.amount}</Text>
                  </Text>
                  <Text style={styles.historyTimeText}>{hist.time}</Text>
                </View>
                <Text style={styles.historyUserText}>
                  {hist.type === 'consume' ? 'Dinner service' : hist.type === 'restock' ? 'Morning delivery' : 'Initial stock entry'} • {hist.user}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 🔴 Modal สำหรับ Delete & Alert */}
      <Modal animationType="fade" transparent={true} visible={modalConfig.visible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: modalConfig.type === 'alert' ? theme.dangerBg : theme.nearExpiryBg }]}>
              <Feather name="alert-triangle" size={32} color={modalConfig.type === 'alert' ? theme.danger : theme.nearExpiry} />
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
                style={[styles.modalButtonConfirm, { backgroundColor: modalConfig.type === 'alert' ? theme.primary : theme.danger }]} 
                onPress={() => {
                  if (modalConfig.type === 'confirm' && modalConfig.onConfirm) {
                    modalConfig.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonConfirmText}>{modalConfig.type === 'confirm' ? 'ลบข้อมูล' : 'ตกลง'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🔴 Modal สำหรับ Consume & Restock */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionModal.visible}
        onRequestClose={() => setActionModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: actionModal.type === 'consume' ? '#FEF3C7' : '#D1FAE5' }]}>
              <Feather 
                name={actionModal.type === 'consume' ? "minus-circle" : "plus-circle"} 
                size={32} 
                color={actionModal.type === 'consume' ? theme.nearExpiry : '#10B981'} 
              />
            </View>
            
            <Text style={styles.modalTitle}>
              {actionModal.type === 'consume' ? 'ใช้งานวัตถุดิบ (Consume)' : 'เติมสต็อก (Restock)'}
            </Text>
            <Text style={styles.modalMessage}>ปัจจุบันมีอยู่: {currentItem.quantity} {currentItem.unit}</Text>
            
            <View style={styles.editInputWrapper}>
              <Text style={styles.editLabel}>
                จำนวนที่ต้องการ{actionModal.type === 'consume' ? 'ใช้' : 'เพิ่ม'} ({currentItem.unit})
              </Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={actionModal.amount}
                onChangeText={(text) => setActionModal(prev => ({ ...prev, amount: text }))}
                placeholder="0"
                autoFocus
              />
            </View>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setActionModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.modalButtonCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButtonConfirm, { backgroundColor: theme.primary }]} 
                onPress={handleActionSubmit}
                disabled={isActionLoading}
              >
                {isActionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonConfirmText}>บันทึก</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  categoryPill: { backgroundColor: theme.border, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  categoryText: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight, textTransform: 'capitalize' },
  
  itemName: { fontFamily: 'Mali_700Bold', fontSize: 32, color: theme.textDark, marginBottom: 12 },
  
  badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontFamily: 'Mali_700Bold', fontSize: 12 },

  infoCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoCard: { flex: 1, backgroundColor: theme.card, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  infoCardLabel: { fontFamily: 'Mali_700Bold', fontSize: 10, color: theme.textLight, letterSpacing: 1, marginBottom: 8 },
  infoCardValue: { fontFamily: 'Mali_700Bold', fontSize: 24, color: theme.textDark },
  infoCardSub: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight, marginTop: 4, marginBottom: 12 },
  progressBarBg: { height: 6, backgroundColor: theme.inputBg, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.nearExpiry, borderRadius: 3 },

  storageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, gap: 12 },
  storageText: { fontFamily: 'Mali_400Regular', fontSize: 15, color: theme.textDark },

  mainActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mainActionBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  mainActionText: { fontFamily: 'Mali_700Bold', fontSize: 16 },

  secondaryActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  secActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.border, gap: 6 },
  secActionText: { fontFamily: 'Mali_700Bold', fontSize: 12, color: theme.textDark },

  historyTitle: { fontFamily: 'Mali_700Bold', fontSize: 18, color: theme.textDark, marginBottom: 16 },
  historyContainer: { paddingHorizontal: 4 },
  historyItem: { flexDirection: 'row', marginBottom: 0 },
  historyIconCol: { alignItems: 'center', width: 32, marginRight: 12 },
  historyIconBg: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  historyLine: { width: 1, flex: 1, backgroundColor: theme.border, marginVertical: 4 },
  historyContent: { flex: 1, paddingBottom: 24 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyActionText: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textDark },
  historyTimeText: { fontFamily: 'Mali_400Regular', fontSize: 11, color: theme.textLight },
  historyUserText: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74, 54, 35, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { backgroundColor: theme.card, width: '100%', borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Mali_700Bold', fontSize: 22, color: theme.textDark, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontFamily: 'Mali_400Regular', fontSize: 15, color: theme.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtonGroup: { flexDirection: 'row', width: '100%' },
  modalButtonCancel: { flex: 1, height: 52, backgroundColor: theme.inputBg, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: theme.border },
  modalButtonCancelText: { fontFamily: 'Mali_700Bold', fontSize: 15, color: theme.textLight },
  modalButtonConfirm: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalButtonConfirmText: { fontFamily: 'Mali_700Bold', fontSize: 15, color: '#FFF' },

  editInputWrapper: { width: '100%', marginBottom: 24 },
  editLabel: { fontFamily: 'Mali_700Bold', fontSize: 12, color: theme.textLight, marginBottom: 8, textAlign: 'center' },
  editInput: { fontFamily: 'Mali_700Bold', backgroundColor: theme.inputBg, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, height: 60, fontSize: 24, color: theme.textDark, textAlign: 'center' },
});