import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { PurchaseRecommendation } from '../../../../../types';
import { theme, FONT, FONT_BOLD } from '../suggestionTheme';
import ConfidenceBadge from './ConfidenceBadge';
import { formatQuantity } from './purchaseUtils';

type Props = {
  item: PurchaseRecommendation;
  expanded: boolean;
  onToggle: () => void;
};

/** การ์ด 1 วัตถุดิบ: แตะเพื่อกางดูเหตุผลที่ AI แนะนำให้ซื้อเท่านี้ */
export default function RecommendationCard({ item, expanded, onToggle }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onToggle}>
      <View style={styles.headerRow}>
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {item.ingredientName}
          </Text>
          {!!item.category && <Text style={styles.category}>{item.category}</Text>}
        </View>
        <ConfidenceBadge confidence={item.confidence} />
      </View>

      <View style={styles.buyRow}>
        <Text style={styles.buyLabel}>ซื้อเพิ่ม</Text>
        <Text style={styles.buyValue}>{formatQuantity(item.recommendedBuyQuantity)}</Text>
        <Text style={styles.buyUnit}>{item.unit}</Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          คงเหลือ {formatQuantity(item.currentQuantity)} {item.unit}
        </Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.meta}>
          ใช้เฉลี่ย {formatQuantity(item.averageDailyUsage)} {item.unit}/วัน
        </Text>
      </View>

      {expanded && (
        <View style={styles.detail}>
          <Text style={styles.detailLine}>
            คาดว่าจะใช้ถึงรอบซื้อถัดไป{' '}
            <Text style={styles.detailStrong}>
              {formatQuantity(item.estimatedConsumptionUntilNextCycle)} {item.unit}
            </Text>
          </Text>
          {!!item.reason && <Text style={styles.reason}>{item.reason}</Text>}
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleText}>{expanded ? 'ย่อ' : 'ดูเหตุผล'}</Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.textLight}
        />
      </View>
    </TouchableOpacity>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  nameWrap: { flex: 1, paddingRight: 10 },
  name: { fontFamily: FONT_BOLD, fontSize: 17, color: theme.textDark },
  category: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginTop: 2 },
  buyRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 14 },
  buyLabel: { fontFamily: FONT, fontSize: 14, color: theme.textLight, marginRight: 8 },
  buyValue: { fontFamily: FONT_BOLD, fontSize: 26, color: theme.textDark },
  buyUnit: { fontFamily: FONT, fontSize: 15, color: theme.textDark, marginLeft: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8 },
  meta: { fontFamily: FONT, fontSize: 13, color: theme.textLight },
  metaDot: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginHorizontal: 6 },
  detail: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  detailLine: { fontFamily: FONT, fontSize: 14, color: theme.textDark, lineHeight: 22 },
  detailStrong: { fontFamily: FONT_BOLD, color: theme.textDark },
  reason: {
    fontFamily: FONT,
    fontSize: 14,
    color: theme.textLight,
    lineHeight: 22,
    marginTop: 8,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  toggleText: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginRight: 4 },
});
