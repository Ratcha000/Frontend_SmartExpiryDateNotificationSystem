import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SuggestedMenu } from '../../../../types';
import { theme, FONT, FONT_BOLD } from './suggestionTheme';

type Props = {
  menu: SuggestedMenu;
  /** ถ้าส่งมา จะแสดงปุ่ม "ใช้วัตถุดิบนี้เลย" ท้ายการ์ด */
  onConsume?: () => void;
};

const PRIORITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: '#FEF2F2', text: theme.danger, label: 'ควรทำก่อน' },
  MEDIUM: { bg: theme.warningBg, text: theme.warningText, label: 'ปานกลาง' },
  LOW: { bg: theme.neutralBg, text: theme.neutralText, label: 'ทำเมื่อว่าง' },
};

export default function MenuCard({ menu, onConsume }: Props) {
  const priority = PRIORITY_STYLE[menu.priority] || PRIORITY_STYLE.MEDIUM;
  const inStock = menu.ingredientsInStock || [];
  const missing = menu.missingIngredients || [];
  const steps = menu.steps || [];

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.menuName} numberOfLines={2}>{menu.menuName}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
          <Text style={[styles.priorityText, { color: priority.text }]}>{priority.label}</Text>
        </View>
      </View>

      {menu.description ? (
        <Text style={styles.description}>{menu.description}</Text>
      ) : null}

      {menu.reason ? (
        <View style={styles.reasonBox}>
          <Feather name="zap" size={14} color={theme.successText} style={{ marginTop: 2 }} />
          <Text style={styles.reasonText}>{menu.reason}</Text>
        </View>
      ) : null}

      {inStock.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>วัตถุดิบที่มี (IN STOCK)</Text>
          <View style={styles.tagWrap}>
            {inStock.map((name, i) => (
              <View key={`${name}-${i}`} style={[styles.tag, { backgroundColor: theme.successBg }]}>
                <Text style={[styles.tagText, { color: theme.successText }]}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {missing.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ต้องซื้อเพิ่ม (NEED TO BUY)</Text>
          <View style={styles.tagWrap}>
            {missing.map((name, i) => (
              <View key={`${name}-${i}`} style={[styles.tag, { backgroundColor: theme.neutralBg }]}>
                <Text style={[styles.tagText, styles.tagTextMissing]}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {steps.length > 0 ? (
        <View style={styles.stepsBox}>
          <Text style={styles.sectionLabel}>ขั้นตอนการทำ</Text>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {onConsume ? (
        <TouchableOpacity style={styles.consumeBtn} onPress={onConsume} activeOpacity={0.8}>
          <Feather name="check-circle" size={16} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.consumeBtnText}>ใช้วัตถุดิบนี้เลย</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  menuName: { flex: 1, fontFamily: FONT_BOLD, fontSize: 17, color: theme.textDark, marginRight: 10 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontFamily: FONT_BOLD, fontSize: 11 },
  description: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginTop: 6, lineHeight: 20 },
  reasonBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.successBg,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  reasonText: { flex: 1, fontFamily: FONT, fontSize: 12, color: '#0F7A55', lineHeight: 19 },
  section: { marginTop: 14 },
  sectionLabel: { fontFamily: FONT_BOLD, fontSize: 11, color: theme.textLight, marginBottom: 8, letterSpacing: 0.5 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  tagText: { fontFamily: FONT, fontSize: 12 },
  tagTextMissing: { color: theme.neutralText, textDecorationLine: 'line-through' },
  stepsBox: { marginTop: 14, backgroundColor: theme.background, borderRadius: 14, padding: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: { fontFamily: FONT_BOLD, fontSize: 11, color: '#FFF' },
  stepText: { flex: 1, fontFamily: FONT, fontSize: 13, color: theme.textDark, lineHeight: 20 },
  consumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  consumeBtnText: { fontFamily: FONT_BOLD, fontSize: 14, color: '#FFF' },
});
