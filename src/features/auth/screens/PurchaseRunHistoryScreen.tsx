import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { getPurchaseRuns } from '../../../api/purchasePlanning';
import { getErrorMessage } from '../../../api/suggestions';
import type { PurchaseRunSummary } from '../../../types';
import { theme, FONT, FONT_BOLD } from './components/suggestionTheme';
import ManagerOnly from './components/purchase/ManagerOnly';
import PurchaseSkeleton from './components/purchase/PurchaseSkeleton';
import {
  RUN_SOURCE_TH,
  formatClockTime,
  formatRunDate,
} from './components/purchase/purchaseUtils';

export default function PurchaseRunHistoryScreen({ navigation }: any) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const restaurantId = user?.restaurantId || null;

  const [runs, setRuns] = useState<PurchaseRunSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // รอบที่ล้มเหลวกดเพื่อกางอ่าน errorMessage เต็ม ๆ ได้
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    if (!isManager) return;
    if (!restaurantId) {
      setLoading(false);
      setRefreshing(false);
      setError('ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');
      return;
    }

    setError(null);
    try {
      // ไม่ส่ง limit เพื่อเอาเท่าจำนวนรอบที่ระบบเก็บไว้ทั้งหมด
      const res = await getPurchaseRuns(restaurantId);
      setRuns(res.data || []);
    } catch (err: any) {
      console.log('Error fetching purchase runs:', err?.response?.data || err.message);
      setError(getErrorMessage(err, 'โหลดประวัติการแนะนำไม่สำเร็จ'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManager, restaurantId]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRuns();
  }, [fetchRuns]);

  if (!isManager) {
    return <ManagerOnly onBack={() => navigation.goBack()} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติการแนะนำ</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textLight} />
        }
      >
        {runs && runs.length > 0 && (
          <Text style={styles.pageSubtitle}>ทั้งหมด {runs.length} รอบ · ใหม่ไปเก่า</Text>
        )}

        {!!error && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={16} color={theme.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <PurchaseSkeleton />
        ) : runs === null ? null : runs.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="clock" size={26} color={theme.textLight} />
            </View>
            <Text style={styles.emptyTitle}>ยังไม่เคย generate รอบไหนเลย</Text>
            <Text style={styles.emptyDesc}>
              เมื่อถึงวันซื้อของ ระบบจะคำนวณให้อัตโนมัติ{'\n'}
              หรือกด "ให้ AI คำนวณใหม่" ที่หน้าแผนซื้อของได้เลย
            </Text>
          </View>
        ) : (
          runs.map((run) => {
            const failed = run.status === 'FAILED';
            const expanded = expandedId === run.runId;
            return (
              <TouchableOpacity
                key={run.runId}
                style={styles.card}
                activeOpacity={failed ? 0.85 : 0.7}
                onPress={() =>
                  failed
                    ? setExpandedId(expanded ? null : run.runId)
                    : navigation.navigate('PurchaseRunDetail', { runId: run.runId })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.runDate}>{formatRunDate(run.runDate)}</Text>
                    <Text style={styles.runTime}>{formatClockTime(run.generatedAt)}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: failed ? theme.dangerBg : theme.successBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: failed ? theme.danger : theme.successText },
                      ]}
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

                {failed ? (
                  <View style={styles.errorInline}>
                    <Text
                      style={styles.errorInlineText}
                      numberOfLines={expanded ? undefined : 2}
                    >
                      {run.errorMessage || 'ไม่ทราบสาเหตุ'}
                    </Text>
                    <Text style={styles.expandHint}>{expanded ? 'ย่อ' : 'แตะเพื่ออ่านทั้งหมด'}</Text>
                  </View>
                ) : (
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>แนะนำ {run.itemCount} รายการ</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.meta}>ต้องซื้อ {run.totalBuyItems} ตัว</Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={theme.textLight}
                      style={{ marginLeft: 'auto' }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  pageSubtitle: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginBottom: 16 },

  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  runDate: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark },
  runTime: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONT_BOLD, fontSize: 12 },

  sourceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sourceText: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginLeft: 6 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  meta: { fontFamily: FONT, fontSize: 13, color: theme.textDark },
  metaDot: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginHorizontal: 6 },

  errorInline: {
    marginTop: 10,
    backgroundColor: theme.dangerBg,
    borderRadius: 14,
    padding: 12,
  },
  errorInlineText: { fontFamily: FONT, fontSize: 13, color: theme.danger, lineHeight: 20 },
  expandHint: { fontFamily: FONT, fontSize: 11, color: theme.danger, marginTop: 6, opacity: 0.8 },

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
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: FONT_BOLD, fontSize: 17, color: theme.textDark, marginBottom: 8 },
  emptyDesc: {
    fontFamily: FONT,
    fontSize: 14,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
