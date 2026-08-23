import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { getPurchaseRunDetail } from '../../../api/purchasePlanning';
import { getErrorMessage } from '../../../api/suggestions';
import type { PurchaseRunDetail } from '../../../types';
import { theme, FONT, FONT_BOLD } from './components/suggestionTheme';
import ManagerOnly from './components/purchase/ManagerOnly';
import RecommendationCard from './components/purchase/RecommendationCard';
import PurchaseSkeleton from './components/purchase/PurchaseSkeleton';
import {
  RUN_SOURCE_TH,
  WEEKDAY_FULL_TH,
  formatClockTime,
  formatRunDate,
  needsPurchase,
} from './components/purchase/purchaseUtils';

/** '2026-08-25T09:00:00Z' -> '25 ส.ค. 09:00 น.' สำหรับบอกช่วงที่ AI ดูย้อนหลัง */
const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  return `${formatRunDate(isoDate)} ${formatClockTime(iso)}`;
};

export default function PurchaseRunDetailScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const runId = route?.params?.runId as string | undefined;

  const [run, setRun] = useState<PurchaseRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    if (!isManager) return;
    if (!runId) {
      setLoading(false);
      setError('ไม่พบรอบที่ต้องการดู');
      return;
    }
    setError(null);
    try {
      const res = await getPurchaseRunDetail(runId);
      setRun(res.data);
    } catch (err: any) {
      console.log('Error fetching run detail:', err?.response?.data || err.message);
      setError(getErrorMessage(err, 'โหลดรายละเอียดรอบนี้ไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, [isManager, runId]);

  useEffect(() => {
    fetchRun();
  }, [fetchRun]);

  if (!isManager) {
    return <ManagerOnly onBack={() => navigation.goBack()} />;
  }

  const failed = run?.status === 'FAILED';
  // แสดงเฉพาะที่ต้องซื้อจริง ส่วนจำนวนที่ AI พิจารณาทั้งหมดดูได้จากการ์ดสถิติด้านบน
  const buyItems = (run?.items || []).filter(needsPurchase);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดรอบ</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!!error && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={16} color={theme.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <PurchaseSkeleton />
        ) : !run ? null : (
          <>
            {/* สรุปรอบ */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.runDate}>{formatRunDate(run.runDate)}</Text>
                  <Text style={styles.runTime}>สร้างเมื่อ {formatClockTime(run.generatedAt)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: failed ? theme.dangerBg : theme.successBg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: failed ? theme.danger : theme.successText }]}
                  >
                    {failed ? 'ล้มเหลว' : 'สำเร็จ'}
                  </Text>
                </View>
              </View>

              <View style={styles.sourceRow}>
                <Feather
                  name={run.source === 'SCHEDULED' ? 'clock' : 'user'}
                  size={13}
                  color={theme.textLight}
                />
                <Text style={styles.sourceText}>{RUN_SOURCE_TH[run.source]}</Text>
              </View>

              {!failed && (
                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{run.itemCount}</Text>
                    <Text style={styles.statLabel}>รายการที่แนะนำ</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{run.totalBuyItems}</Text>
                    <Text style={styles.statLabel}>ต้องซื้อจริง</Text>
                  </View>
                </View>
              )}

              {failed && !!run.errorMessage && (
                <View style={styles.errorInline}>
                  <Text style={styles.errorInlineText}>{run.errorMessage}</Text>
                </View>
              )}
            </View>

            {/* snapshot ของ setting ตอนรันรอบนั้น */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>การตั้งค่า</Text>
              <Text style={styles.sectionDesc}>
                ค่าที่ใช้คำนวณรอบนี้ ต่อให้เปลี่ยนค่าตั้งไปแล้ว รอบนี้ก็ยังอ้างอิงค่าเดิม
              </Text>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>วันซื้อของ</Text>
                <Text style={styles.settingValue}>
                  {run.purchaseDays?.length === 7
                    ? 'ทุกวัน'
                    : run.purchaseDays?.map((day) => WEEKDAY_FULL_TH[day]).join(' · ') || '-'}
                </Text>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>ย้อนหลัง</Text>
                <Text style={styles.settingValue}>{run.lookbackPurchaseRuns} รอบ</Text>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>เผื่อของขาด</Text>
                <Text style={styles.settingValue}>{run.safetyBufferPercent}%</Text>
              </View>
              <View style={[styles.settingRow, styles.settingRowLast]}>
                <Text style={styles.settingLabel}>AI ดูข้อมูลตั้งแต่</Text>
                <Text style={styles.settingValue}>{formatDateTime(run.lookbackStartAt)}</Text>
              </View>
            </View>

            {/* รายการของรอบนี้ — backend เรียงจากซื้อมากไปน้อยมาแล้ว */}
            {!failed && (
              <>
                <Text style={styles.listTitle}>รายการที่ AI แนะนำ</Text>
                {buyItems.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyDesc}>รอบนี้ไม่มีรายการที่ต้องซื้อ</Text>
                  </View>
                ) : (
                  buyItems.map((item) => (
                    <RecommendationCard
                      key={item.id}
                      item={item}
                      expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    />
                  ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
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

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  runDate: { fontFamily: FONT_BOLD, fontSize: 17, color: theme.textDark },
  runTime: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONT_BOLD, fontSize: 12 },

  sourceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sourceText: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginLeft: 6 },

  statRow: { flexDirection: 'row', marginTop: 16 },
  statBox: {
    flex: 1,
    backgroundColor: theme.neutralBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  statValue: { fontFamily: FONT_BOLD, fontSize: 24, color: theme.textDark },
  statLabel: { fontFamily: FONT, fontSize: 12, color: theme.textLight, marginTop: 2 },

  errorInline: { marginTop: 14, backgroundColor: theme.dangerBg, borderRadius: 14, padding: 12 },
  errorInlineText: { fontFamily: FONT, fontSize: 13, color: theme.danger, lineHeight: 20 },

  sectionTitle: { fontFamily: FONT_BOLD, fontSize: 15, color: theme.textDark },
  sectionDesc: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.textLight,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  settingRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  settingLabel: { fontFamily: FONT, fontSize: 13, color: theme.textLight, flex: 1 },
  settingValue: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: theme.textDark,
    flex: 1.4,
    textAlign: 'right',
  },

  listTitle: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark, marginBottom: 12, marginTop: 4 },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.dangerBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 13,
    color: theme.danger,
    lineHeight: 20,
    marginLeft: 8,
  },

  emptyCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyDesc: { fontFamily: FONT, fontSize: 14, color: theme.textLight, textAlign: 'center' },
});
