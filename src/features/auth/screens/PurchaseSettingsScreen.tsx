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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../context/AuthContext';
import { getPurchaseSettings, updatePurchaseSettings } from '../../../api/purchasePlanning';
import { getErrorMessage } from '../../../api/suggestions';
import type { Weekday } from '../../../types';
import { theme, FONT, FONT_BOLD } from './components/suggestionTheme';
import ManagerOnly from './components/purchase/ManagerOnly';
import {
  WEEKDAYS,
  WEEKDAY_SHORT_TH,
  formatTimeLabel,
  toBackendTime,
} from './components/purchase/purchaseUtils';

// ขอบเขตเดียวกับ validation ฝั่ง backend (doc/completed-03.md)
const MIN_LOOKBACK = 1;
const MAX_LOOKBACK = 30;
const BUFFER_STEP = 5;
const MAX_BUFFER = 100;

/** "00:01:00" -> Date ของวันนี้เวลา 00:01 สำหรับป้อนให้ DateTimePicker */
const timeStringToDate = (value: string) => {
  const [hh, mm] = (value || '00:01:00').split(':');
  const date = new Date();
  date.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
  return date;
};

const dateToTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;

export default function PurchaseSettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const restaurantId = user?.restaurantId || null;

  const [purchaseDays, setPurchaseDays] = useState<Weekday[]>([]);
  const [lookback, setLookback] = useState(4);
  const [notificationTime, setNotificationTime] = useState('00:01:00');
  const [buffer, setBuffer] = useState(10);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!isManager) return;
    if (!restaurantId) {
      setLoading(false);
      setError('ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');
      return;
    }
    try {
      const res = await getPurchaseSettings(restaurantId);
      const data = res.data;
      setPurchaseDays(data.purchaseDays || []);
      setLookback(data.lookbackPurchaseRuns ?? 4);
      setNotificationTime(data.notificationTime || '00:01:00');
      setBuffer(data.safetyBufferPercent ?? 10);
    } catch (err: any) {
      console.log('Error fetching purchase settings:', err?.response?.data || err.message);
      setError(getErrorMessage(err, 'โหลดการตั้งค่ารอบซื้อไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, [isManager, restaurantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleDay = (day: Weekday) => {
    setError(null);
    setPurchaseDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleEveryDay = () => {
    setError(null);
    setPurchaseDays((prev) => (prev.length === 7 ? [] : [...WEEKDAYS]));
  };

  const handleSave = async () => {
    if (!restaurantId || saving) return;

    // เช็คให้ตรงกับ validation ของ backend ก่อน เพื่อไม่ต้องรอ 400 กลับมา
    if (purchaseDays.length === 0) {
      setError('กรุณาเลือกวันที่ร้านซื้อของอย่างน้อย 1 วัน');
      return;
    }
    if (lookback < MIN_LOOKBACK || lookback > MAX_LOOKBACK) {
      setError(`จำนวนรอบย้อนหลังต้องอยู่ระหว่าง ${MIN_LOOKBACK} ถึง ${MAX_LOOKBACK}`);
      return;
    }
    if (buffer < 0 || buffer > MAX_BUFFER) {
      setError(`buffer เผื่อของขาดต้องอยู่ระหว่าง 0 ถึง ${MAX_BUFFER}%`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // เรียงวันตามสัปดาห์ก่อนส่ง เพื่อให้ค่าที่เก็บอ่านง่ายเวลา debug
      const sortedDays = WEEKDAYS.filter((day) => purchaseDays.includes(day));
      await updatePurchaseSettings(restaurantId, {
        purchaseDays: sortedDays,
        lookbackPurchaseRuns: lookback,
        notificationTime: toBackendTime(notificationTime),
        safetyBufferPercent: buffer,
      });
      setSuccessVisible(true);
    } catch (err: any) {
      console.log('Error saving purchase settings:', err?.response?.data || err.message);
      setError(getErrorMessage(err, 'บันทึกการตั้งค่าไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  if (!isManager) {
    return <ManagerOnly onBack={() => navigation.goBack()} />;
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isEveryDay = purchaseDays.length === 7;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ตั้งค่ารอบซื้อของ</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* วันซื้อของ */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>วันที่ร้านซื้อของ</Text>
            <TouchableOpacity onPress={toggleEveryDay}>
              <Text style={styles.linkText}>{isEveryDay ? 'ล้างทั้งหมด' : 'ซื้อทุกวัน'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc}>
            ระบบจะให้ AI คำนวณรายการซื้อและแจ้งเตือนเฉพาะวันที่เลือกไว้
          </Text>

          <View style={styles.dayRow}>
            {WEEKDAYS.map((day) => {
              const active = purchaseDays.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                    {WEEKDAY_SHORT_TH[day]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ย้อนหลังกี่รอบ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ให้ AI ดูย้อนหลังกี่รอบซื้อ</Text>
          <Text style={styles.cardDesc}>
            ยิ่งย้อนหลังมาก AI จะเห็นแนวโน้มการใช้ชัดขึ้น แต่จะตามการเปลี่ยนแปลงล่าสุดช้าลง (1-30 รอบ)
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, lookback <= MIN_LOOKBACK && styles.stepperBtnDisabled]}
              onPress={() => setLookback((v) => Math.max(MIN_LOOKBACK, v - 1))}
              disabled={lookback <= MIN_LOOKBACK}
            >
              <Feather name="minus" size={18} color={theme.textDark} />
            </TouchableOpacity>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{lookback}</Text>
              <Text style={styles.stepperUnit}>รอบ</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperBtn, lookback >= MAX_LOOKBACK && styles.stepperBtnDisabled]}
              onPress={() => setLookback((v) => Math.min(MAX_LOOKBACK, v + 1))}
              disabled={lookback >= MAX_LOOKBACK}
            >
              <Feather name="plus" size={18} color={theme.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* เวลาแจ้งเตือน */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เวลาแจ้งเตือน</Text>
          <Text style={styles.cardDesc}>
            เวลาที่ระบบจะคำนวณรายการซื้อของและส่งแจ้งเตือนให้ในวันซื้อของ
          </Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
            <Feather name="clock" size={18} color={theme.textDark} />
            <Text style={styles.timeButtonText}>{formatTimeLabel(notificationTime)} น.</Text>
          </TouchableOpacity>
        </View>

        {/* buffer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>เผื่อของขาด (buffer)</Text>
          <Text style={styles.cardDesc}>
            บวกเพิ่มจากจำนวนที่คำนวณได้ เผื่อวันที่ขายดีกว่าปกติ (0-100%)
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, buffer <= 0 && styles.stepperBtnDisabled]}
              onPress={() => setBuffer((v) => Math.max(0, v - BUFFER_STEP))}
              disabled={buffer <= 0}
            >
              <Feather name="minus" size={18} color={theme.textDark} />
            </TouchableOpacity>
            <View style={styles.stepperValueWrap}>
              <Text style={styles.stepperValue}>{buffer}</Text>
              <Text style={styles.stepperUnit}>%</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperBtn, buffer >= MAX_BUFFER && styles.stepperBtnDisabled]}
              onPress={() => setBuffer((v) => Math.min(MAX_BUFFER, v + BUFFER_STEP))}
              disabled={buffer >= MAX_BUFFER}
            >
              <Feather name="plus" size={18} color={theme.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {!!error && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={16} color={theme.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>บันทึกการตั้งค่า</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          หลังบันทึก ระบบจะเริ่มใช้รอบใหม่ในวันซื้อของถัดไป{'\n'}
          ถ้าต้องการดูรายการเดี๋ยวนี้ ให้กลับไปกด "ให้ AI คำนวณใหม่" ที่หน้าแผนซื้อของ
        </Text>
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={timeStringToDate(notificationTime)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setShowTimePicker(false);
            if (event.type === 'dismissed') return;
            if (date) setNotificationTime(dateToTimeString(date));
          }}
        />
      )}

      {Platform.OS === 'ios' && showTimePicker && (
        <TouchableOpacity style={styles.pickerDone} onPress={() => setShowTimePicker(false)}>
          <Text style={styles.pickerDoneText}>เสร็จสิ้น</Text>
        </TouchableOpacity>
      )}

      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Feather name="check-circle" size={28} color={theme.successText} />
            </View>
            <Text style={styles.modalTitle}>บันทึกแล้ว</Text>
            <Text style={styles.modalMessage}>ระบบจะใช้รอบซื้อใหม่นี้ในการแจ้งเตือนครั้งถัดไป</Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setSuccessVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalBtnText}>ตกลง</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 8,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark },
  cardDesc: { fontFamily: FONT, fontSize: 13, color: theme.textLight, lineHeight: 20, marginTop: 6 },
  linkText: { fontFamily: FONT_BOLD, fontSize: 13, color: theme.textDark },

  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: theme.primary },
  dayChipText: { fontFamily: FONT, fontSize: 13, color: theme.textLight },
  dayChipTextActive: { fontFamily: FONT_BOLD, color: '#FFFFFF' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 110,
  },
  stepperValue: { fontFamily: FONT_BOLD, fontSize: 24, color: theme.textDark },
  stepperUnit: { fontFamily: FONT, fontSize: 14, color: theme.textLight, marginLeft: 6 },

  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.neutralBg,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 16,
  },
  timeButtonText: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark, marginLeft: 8 },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.dangerBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 13,
    color: theme.danger,
    lineHeight: 20,
    marginLeft: 8,
  },

  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontFamily: FONT_BOLD, fontSize: 15, color: '#FFFFFF' },
  footerNote: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },

  pickerDone: { alignItems: 'center', paddingVertical: 14, backgroundColor: theme.card },
  pickerDoneText: { fontFamily: FONT_BOLD, fontSize: 15, color: theme.textDark },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },
  modalMessage: {
    fontFamily: FONT,
    fontSize: 14,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  modalBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 20,
  },
  modalBtnText: { fontFamily: FONT_BOLD, fontSize: 15, color: '#FFFFFF' },
});
