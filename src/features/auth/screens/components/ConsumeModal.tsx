import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ConsumeTarget, Ingredient } from '../../../../types';
import { consumeIngredient, getErrorMessage } from '../../../../api/suggestions';
import { theme, FONT, FONT_BOLD } from './suggestionTheme';

type Props = {
  visible: boolean;
  /** วัตถุดิบที่ตัดได้ ถ้ามีมากกว่า 1 จะให้ผู้ใช้เลือกก่อน */
  targets: ConsumeTarget[];
  onClose: () => void;
  onSuccess: (updated: Ingredient) => void;
};

export default function ConsumeModal({ visible, targets, onClose, onSuccess }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // รีเซ็ตฟอร์มทุกครั้งที่เปิด modal ใหม่
  useEffect(() => {
    if (visible) {
      setSelectedId(targets.length > 0 ? targets[0].id : null);
      setAmount('');
      setNote('');
      setErrorMsg(null);
      setIsSaving(false);
    }
  }, [visible, targets]);

  const selected = targets.find((t) => t.id === selectedId) || null;

  const handleSubmit = async () => {
    if (!selected) return;

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setErrorMsg('กรุณากรอกจำนวนที่มากกว่า 0');
      return;
    }
    if (value > selected.quantity) {
      setErrorMsg(`ใช้ได้ไม่เกิน ${selected.quantity} ${selected.unit} ที่เหลืออยู่`);
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const res = await consumeIngredient(selected.id, value, note);
      onSuccess(res.data);
      onClose();
    } catch (error: any) {
      setErrorMsg(getErrorMessage(error, 'ตัดสต็อกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconBg}>
            <Feather name="minus-circle" size={28} color={theme.successText} />
          </View>
          <Text style={styles.title}>ตัดสต็อกวัตถุดิบ</Text>

          {targets.length > 1 ? (
            <>
              <Text style={styles.subTitle}>เลือกวัตถุดิบที่ต้องการใช้</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                {targets.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.pickerPill, selectedId === t.id ? styles.pickerPillActive : undefined]}
                    onPress={() => setSelectedId(t.id)}
                  >
                    <Text style={[styles.pickerText, selectedId === t.id ? styles.pickerTextActive : undefined]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <Text style={styles.subTitle}>{selected?.name}</Text>
          )}

          {selected ? (
            <Text style={styles.remainText}>
              คงเหลือ {selected.quantity} {selected.unit}
            </Text>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder={`จำนวนที่ใช้ (${selected?.unit || 'หน่วย'})`}
            placeholderTextColor={theme.textLight}
            keyboardType="numeric"
            value={amount}
            onChangeText={(v) => { setAmount(v); setErrorMsg(null); }}
            autoFocus
          />

          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="หมายเหตุ (ไม่บังคับ) เช่น ใช้ทำเมนูมื้อเที่ยง"
            placeholderTextColor={theme.textLight}
            value={note}
            onChangeText={setNote}
          />

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
              <Text style={styles.cancelBtnText}>ยกเลิก</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={isSaving || !selected}>
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>ยืนยันการใช้</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  container: { width: '100%', backgroundColor: theme.card, borderRadius: 28, padding: 24, alignItems: 'center' },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },
  subTitle: { fontFamily: FONT, fontSize: 14, color: theme.textDark, marginTop: 6, textAlign: 'center' },
  remainText: { fontFamily: FONT, fontSize: 12, color: theme.textLight, marginTop: 4, marginBottom: 16 },
  pickerRow: { alignSelf: 'stretch', marginTop: 10, marginBottom: 4 },
  pickerPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.neutralBg,
    marginRight: 8,
  },
  pickerPillActive: { backgroundColor: theme.primary },
  pickerText: { fontFamily: FONT, fontSize: 13, color: theme.textDark },
  pickerTextActive: { color: '#FFF', fontFamily: FONT_BOLD },
  input: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    fontFamily: FONT,
    fontSize: 15,
    color: theme.textDark,
    backgroundColor: theme.card,
  },
  errorText: {
    alignSelf: 'stretch',
    fontFamily: FONT,
    fontSize: 12,
    color: theme.danger,
    marginTop: 10,
  },
  buttonGroup: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 20 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontFamily: FONT_BOLD, fontSize: 14, color: theme.neutralText },
  confirmBtn: {
    flex: 1.4,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { fontFamily: FONT_BOLD, fontSize: 14, color: '#FFF' },
});
