import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme, FONT, FONT_BOLD } from '../suggestionTheme';

/**
 * จอที่แสดงแทนเนื้อหาจริงเมื่อ user ไม่ใช่ MANAGER
 * endpoint กลุ่ม purchase-* เป็น Manager only อยู่แล้ว หน้าจอนี้กันไม่ให้ยิงไปโดน 403
 */
export default function ManagerOnly({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Feather name="arrow-left" size={22} color={theme.textDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={28} color={theme.textLight} />
        </View>
        <Text style={styles.title}>เฉพาะผู้จัดการร้านเท่านั้น</Text>
        <Text style={styles.desc}>
          หน้าวางแผนการซื้อวัตถุดิบใช้ได้เฉพาะบัญชีที่มีสิทธิ์ Manager{'\n'}
          หากต้องการเข้าถึง กรุณาติดต่อผู้จัดการร้านของคุณ
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>กลับหน้าก่อนหน้า</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 80 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark, textAlign: 'center' },
  desc: {
    fontFamily: FONT,
    fontSize: 14,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  backButtonText: { fontFamily: FONT_BOLD, fontSize: 14, color: theme.textDark },
});
