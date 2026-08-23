import React, { useCallback, useEffect, useState } from 'react';
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
import {
  adjustIngredientQuantity,
  consumeIngredient,
  deleteIngredient,
  getErrorMessage,
  getUsageHistory,
  markIngredientUsed,
  restockIngredient,
} from '../../../api/ingredients';
import type { UsageActionType, UsageHistory } from '../../../types';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';
import { formatRelativeTime } from './components/purchase/purchaseUtils';

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

/** หน้าตาของแต่ละ action ในไทม์ไลน์ประวัติ */
const USAGE_META: Record<UsageActionType, { label: string; icon: string; color: string }> = {
  ADDED: { label: 'เพิ่มเข้าคลัง', icon: 'plus', color: theme.textLight },
  EDITED: { label: 'แก้ไขข้อมูล', icon: 'edit-2', color: theme.textLight },
  CONSUMED: { label: 'ใช้ไป', icon: 'arrow-down', color: theme.nearExpiry },
  RESTOCKED: { label: 'เติมสต็อก', icon: 'refresh-cw', color: '#10B981' },
  ADJUSTED: { label: 'ปรับยอดคงเหลือ', icon: 'edit-3', color: theme.lowStock },
  USED: { label: 'ใช้หมดแล้ว', icon: 'check', color: theme.textLight },
  DELETED: { label: 'ลบออกจากคลัง', icon: 'trash-2', color: theme.danger },
};

/** ตัดทศนิยมท้ายที่ backend ส่งมาแบบ 3.000 ให้อ่านง่าย */
const formatQty = (value: number) =>
  Number.isFinite(value) ? Number(Number(value).toFixed(2)).toString() : '-';

type ActionType = 'consume' | 'restock' | 'adjust';

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

  // State สำหรับ Modal Consume / Restock / Adjust
  const [actionModal, setActionModal] = useState({
    visible: false,
    type: 'consume' as ActionType,
    amount: '',
    note: '',
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // ประวัติการใช้งานจริงจาก backend
  const [history, setHistory] = useState<UsageHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const isActive = currentItem.status === 'ACTIVE';

  const showModal = (title: string, message: string, type: 'alert' | 'confirm' = 'alert', onConfirm: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, type, onConfirm });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  /** ลบวัตถุดิบ (soft delete — backend ไม่มีเส้น DELETE /ingredients/{id}) */
  const executeDelete = async () => {
    setIsLoading(true);
    try {
      await deleteIngredient(currentItem.id);
      closeModal();
      navigation.goBack();
    } catch (error: any) {
      console.log('Delete error:', error?.response?.status, error?.message);
      showModal('ข้อผิดพลาด', getErrorMessage(error, 'ไม่สามารถลบวัตถุดิบได้'), 'alert');
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

  /** โหลดประวัติจริงของวัตถุดิบตัวนี้ */
  const fetchHistory = useCallback(async () => {
    if (!user?.restaurantId) {
      setHistoryLoading(false);
      setHistoryError('ไม่พบข้อมูลร้านค้า');
      return;
    }
    setHistoryError(null);
    try {
      const res = await getUsageHistory(user.restaurantId, currentItem.id);
      // เรียงใหม่สุดขึ้นก่อน เผื่อ backend ไม่ได้เรียงมาให้
      const sorted = [...(res.data || [])].sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );
      setHistory(sorted);
    } catch (error: any) {
      console.log('Usage history error:', error?.response?.data || error?.message);
      setHistoryError(getErrorMessage(error, 'โหลดประวัติการใช้งานไม่สำเร็จ'));
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.restaurantId, currentItem.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /**
   * Consume / Restock / Adjust
   * ส่งจำนวนให้ backend คำนวณเอง เพื่อให้เกิด usage history (AI แผนซื้อของใช้ประวัตินี้)
   * consume/restock ส่ง "ส่วนต่าง" ส่วน adjust ส่ง "ยอดคงเหลือใหม่"
   */
  const handleActionSubmit = async () => {
    const val = parseFloat(actionModal.amount);
    const isAdjust = actionModal.type === 'adjust';
    if (isNaN(val) || (isAdjust ? val < 0 : val <= 0)) {
      showModal(
        'ข้อมูลไม่ถูกต้อง',
        isAdjust ? 'กรุณากรอกยอดคงเหลือที่ถูกต้อง (ห้ามติดลบ)' : 'กรุณากรอกจำนวนตัวเลขที่มากกว่า 0',
        'alert'
      );
      return;
    }

    setIsActionLoading(true);
    try {
      const note = actionModal.note;
      const res =
        actionModal.type === 'consume'
          ? await consumeIngredient(currentItem.id, val, note)
          : actionModal.type === 'restock'
          ? await restockIngredient(currentItem.id, val, note)
          : await adjustIngredientQuantity(currentItem.id, val, note);

      setCurrentItem(res.data);
      setActionModal({ visible: false, type: 'consume', amount: '', note: '' });
      fetchHistory();
    } catch (error: any) {
      console.log('Action update error:', error?.response?.data || error?.message);
      showModal('ข้อผิดพลาด', getErrorMessage(error, 'ไม่สามารถอัปเดตจำนวนสต็อกได้'), 'alert');
    } finally {
      setIsActionLoading(false);
    }
  };

  /** ทำเครื่องหมายว่าใช้หมดแล้ว -> status เป็น USED */
  const executeMarkUsed = async () => {
    setIsLoading(true);
    try {
      const res = await markIngredientUsed(currentItem.id);
      setCurrentItem(res.data);
      closeModal();
      fetchHistory();
    } catch (error: any) {
      console.log('Mark used error:', error?.response?.data || error?.message);
      showModal('ข้อผิดพลาด', getErrorMessage(error, 'ไม่สามารถอัปเดตสถานะได้'), 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkUsedPress = () => {
    showModal(
      'ยืนยันการใช้หมด',
      `ทำเครื่องหมายว่า "${currentItem.name}" ถูกใช้หมดแล้วใช่หรือไม่?`,
      'confirm',
      executeMarkUsed
    );
  };

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

        {/* --- ข้อมูลล็อต / การใช้ล่าสุด (backend ไม่มี field ที่เก็บ storage location) --- */}
        {(currentItem.lotName || currentItem.lastUsedAt) && (
          <View style={styles.storageCard}>
            {currentItem.lotName ? (
              <>
                <Feather name="package" size={18} color={theme.textLight} />
                <Text style={styles.storageText}>ล็อต {currentItem.lotName}</Text>
              </>
            ) : null}
            {currentItem.lastUsedAt ? (
              <>
                <Feather name="clock" size={18} color={theme.textLight} />
                <Text style={styles.storageText}>ใช้ล่าสุด {formatRelativeTime(currentItem.lastUsedAt)}</Text>
              </>
            ) : null}
          </View>
        )}

        {/* --- Main Action Buttons (Consume / Restock) --- */}
        <View style={styles.mainActionsRow}>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: theme.primary }, !isActive && styles.disabledBtn]}
            onPress={() => setActionModal({ visible: true, type: 'consume', amount: '', note: '' })}
            disabled={!isActive}
          >
            <Text style={[styles.mainActionText, { color: '#FFF' }]}>Consume</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mainActionBtn, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }, !isActive && styles.disabledBtn]}
            onPress={() => setActionModal({ visible: true, type: 'restock', amount: '', note: '' })}
            disabled={!isActive}
          >
            <Text style={[styles.mainActionText, { color: theme.textDark }]}>Restock</Text>
          </TouchableOpacity>
        </View>

        {/* --- Secondary Action Buttons --- */}
        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={[styles.secActionBtn, !isActive && styles.disabledBtn]}
            onPress={handleMarkUsedPress}
            disabled={!isActive}
          >
            <Feather name="check" size={16} color={theme.textDark} />
            <Text style={styles.secActionText}>Mark Used</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secActionBtn, !isActive && styles.disabledBtn]}
            onPress={() =>
              setActionModal({
                visible: true,
                type: 'adjust',
                amount: String(currentItem.quantity ?? ''),
                note: '',
              })
            }
            disabled={!isActive}
          >
            <Feather name="edit-2" size={16} color={theme.textDark} />
            <Text style={styles.secActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secActionBtn, { backgroundColor: theme.dangerBg, borderColor: theme.dangerBg }]} onPress={handleDeletePress}>
            <Feather name="trash-2" size={16} color={theme.danger} />
            <Text style={[styles.secActionText, { color: theme.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* --- Usage History (จาก GET /api/usage-history) --- */}
        <Text style={styles.historyTitle}>Usage History</Text>
        {historyLoading ? (
          <View style={styles.historyPlaceholder}>
            <ActivityIndicator color={theme.textLight} />
          </View>
        ) : historyError ? (
          <View style={styles.historyPlaceholder}>
            <Text style={styles.historyEmptyText}>{historyError}</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.historyPlaceholder}>
            <Text style={styles.historyEmptyText}>ยังไม่มีประวัติการใช้งาน</Text>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {history.map((hist, index) => {
              const meta = USAGE_META[hist.actionType];
              const byMe = hist.performedBy && hist.performedBy === user?.id;
              // performedBy เป็น user id ไม่ใช่ชื่อ จึงบอกได้แค่ว่าเป็นตัวเราเองหรือไม่
              const subLine = [hist.note, byMe ? 'โดยคุณ' : null].filter(Boolean).join(' • ');
              return (
                <View key={hist.id} style={styles.historyItem}>
                  <View style={styles.historyIconCol}>
                    <View style={[styles.historyIconBg, { backgroundColor: `${meta.color}20` }]}>
                      <Feather name={meta.icon as any} size={14} color={meta.color} />
                    </View>
                    {index !== history.length - 1 && <View style={styles.historyLine} />}
                  </View>
                  <View style={styles.historyContent}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyActionText}>
                        {meta.label}{' '}
                        {hist.quantityChanged ? (
                          <Text style={{ fontFamily: FONT_BOLD }}>
                            {formatQty(hist.quantityChanged)} {hist.unit || currentItem.unit}
                          </Text>
                        ) : null}
                      </Text>
                      <Text style={styles.historyTimeText}>{formatRelativeTime(hist.performedAt)}</Text>
                    </View>
                    <Text style={styles.historyUserText}>
                      {subLine
                        ? subLine
                        : `คงเหลือ ${formatQty(hist.quantityAfter)} ${hist.unit || currentItem.unit}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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
            <View style={[styles.modalIconBg, { backgroundColor: actionModal.type === 'consume' ? '#FEF3C7' : actionModal.type === 'restock' ? '#D1FAE5' : theme.lowStockBg }]}>
              <Feather 
                name={actionModal.type === 'consume' ? 'minus-circle' : actionModal.type === 'restock' ? 'plus-circle' : 'edit-3'} 
                size={32} 
                color={actionModal.type === 'consume' ? theme.nearExpiry : actionModal.type === 'restock' ? '#10B981' : theme.lowStock} 
              />
            </View>
            
            <Text style={styles.modalTitle}>
              {actionModal.type === 'consume'
                ? 'ใช้งานวัตถุดิบ (Consume)'
                : actionModal.type === 'restock'
                ? 'เติมสต็อก (Restock)'
                : 'แก้จำนวนให้ตรงกับของจริง'}
            </Text>
            <Text style={styles.modalMessage}>
              {actionModal.type === 'adjust'
                ? `ระบบบันทึกไว้ ${currentItem.quantity} ${currentItem.unit} — กรอกยอดที่นับได้จริง`
                : `ปัจจุบันมีอยู่: ${currentItem.quantity} ${currentItem.unit}`}
            </Text>
            
            <View style={styles.editInputWrapper}>
              <Text style={styles.editLabel}>
                {actionModal.type === 'consume'
                  ? `จำนวนที่ต้องการใช้ (${currentItem.unit})`
                  : actionModal.type === 'restock'
                  ? `จำนวนที่ต้องการเพิ่ม (${currentItem.unit})`
                  : `ยอดคงเหลือจริง (${currentItem.unit})`}
              </Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={actionModal.amount}
                onChangeText={(text) => setActionModal(prev => ({ ...prev, amount: text }))}
                placeholder="0"
                autoFocus
              />

              <Text style={[styles.editLabel, { marginTop: 16 }]}>หมายเหตุ (ไม่บังคับ)</Text>
              <TextInput
                style={styles.noteInput}
                value={actionModal.note}
                onChangeText={(text) => setActionModal(prev => ({ ...prev, note: text }))}
                placeholder="เช่น ใช้ทำอาหารมื้อเย็น"
                placeholderTextColor={theme.textLight}
              />
            </View>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={styles.modalButtonCancel} 
                onPress={() => setActionModal({ visible: false, type: 'consume', amount: '', note: '' })}
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
  categoryText: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textLight, textTransform: 'capitalize' },
  
  itemName: { fontFamily: FONT_BOLD, fontSize: 32, color: theme.textDark, marginBottom: 12 },
  
  badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  badgeText: { fontFamily: FONT_BOLD, fontSize: 12 },

  infoCardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  infoCard: { flex: 1, backgroundColor: theme.card, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  infoCardLabel: { fontFamily: FONT_BOLD, fontSize: 10, color: theme.textLight, letterSpacing: 1, marginBottom: 8 },
  infoCardValue: { fontFamily: FONT_BOLD, fontSize: 24, color: theme.textDark },
  infoCardSub: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textLight, marginTop: 4, marginBottom: 12 },
  progressBarBg: { height: 6, backgroundColor: theme.inputBg, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: theme.nearExpiry, borderRadius: 3 },

  storageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, gap: 12 },
  storageText: { fontFamily: FONT_REGULAR, fontSize: 15, color: theme.textDark },

  mainActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mainActionBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  mainActionText: { fontFamily: FONT_BOLD, fontSize: 16 },

  secondaryActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  secActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.border, gap: 6 },
  secActionText: { fontFamily: FONT_BOLD, fontSize: 12, color: theme.textDark },

  historyTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark, marginBottom: 16 },
  historyContainer: { paddingHorizontal: 4 },
  historyPlaceholder: { backgroundColor: theme.card, borderRadius: 16, paddingVertical: 28, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  historyEmptyText: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  disabledBtn: { opacity: 0.4 },
  historyItem: { flexDirection: 'row', marginBottom: 0 },
  historyIconCol: { alignItems: 'center', width: 32, marginRight: 12 },
  historyIconBg: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  historyLine: { width: 1, flex: 1, backgroundColor: theme.border, marginVertical: 4 },
  historyContent: { flex: 1, paddingBottom: 24 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyActionText: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textDark },
  historyTimeText: { fontFamily: FONT_REGULAR, fontSize: 11, color: theme.textLight },
  historyUserText: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textLight },

  // Modal Styles
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

  editInputWrapper: { width: '100%', marginBottom: 24 },
  editLabel: { fontFamily: FONT_BOLD, fontSize: 12, color: theme.textLight, marginBottom: 8, textAlign: 'center' },
  editInput: { fontFamily: FONT_BOLD, backgroundColor: theme.inputBg, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, height: 60, fontSize: 24, color: theme.textDark, textAlign: 'center' },
  noteInput: { fontFamily: FONT_REGULAR, backgroundColor: theme.inputBg, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16, height: 48, fontSize: 14, color: theme.textDark, textAlign: 'center' },
});