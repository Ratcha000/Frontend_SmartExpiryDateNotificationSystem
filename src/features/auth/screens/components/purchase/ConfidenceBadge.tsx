import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Confidence } from '../../../../../types';
import { FONT_BOLD } from '../suggestionTheme';
import { CONFIDENCE_LABEL_TH, getConfidenceColors } from './purchaseUtils';

/** ป้ายบอกว่า AI มั่นใจกับคำแนะนำนี้แค่ไหน (ชุดสีเดียวกับ badge ความเร่งด่วนในหน้าเมนูแนะนำ) */
export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const colors = getConfidenceColors(confidence);
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{CONFIDENCE_LABEL_TH[confidence]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  text: { fontFamily: FONT_BOLD, fontSize: 12 },
});
