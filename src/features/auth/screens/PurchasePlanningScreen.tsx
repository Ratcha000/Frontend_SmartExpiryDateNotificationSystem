import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import {
  getPurchaseRecommendations,
  getPurchaseRuns,
  getPurchaseSettings,
  generatePurchaseRecommendations,
} from '../../../api/purchasePlanning';
import { getErrorMessage } from '../../../api/suggestions';
import type { PurchaseRecommendation, PurchaseRunSummary, PurchaseSetting } from '../../../types';
import { theme, FONT, FONT_BOLD } from './components/suggestionTheme';
import ManagerOnly from './components/purchase/ManagerOnly';
import RecommendationCard from './components/purchase/RecommendationCard';
import PurchaseSkeleton from './components/purchase/PurchaseSkeleton';
import {
  RUN_SOURCE_TH,
  WEEKDAY_FULL_TH,
  formatPurchaseDate,
  formatRelativeTime,
  formatTimeLabel,
  getNextPurchaseDate,
  needsPurchase,
} from './components/purchase/purchaseUtils';

export default function PurchasePlanningScreen({ navigation }: any) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const restaurantId = user?.restaurantId || null;

  const [settings, setSettings] = useState<PurchaseSetting | null>(null);
  const [recommendations, setRecommendations] = useState<PurchaseRecommendation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // รอบล่าสุดจาก /runs?limit=1 ใช้บอกที่มาของรอบและเตือนเมื่อรอบล่าสุดพัง
  const [latestRun, setLatestRun] = useState<PurchaseRunSummary | null>(null);

  /** โหลด setting + รายการที่ save ไว้ (เส้นเร็ว ไม่เรียก AI) */
  const fetchAll = useCallback(async () => {
    if (!isManager) return;
    if (!restaurantId) {
      setLoading(false);
      setRefreshing(false);
      setError('ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');
      return;
    }

    setError(null);
    try {
      const [settingRes, recRes] = await Promise.all([
        getPurchaseSettings(restaurantId),
        getPurchaseRecommendations(restaurantId),
      ]);
      setSettings(settingRes.data);
      setRecommendations(recRes.data || []);

      // เส้นเสริม — ถ้าพังไม่ควรทำให้ทั้งหน้าพังตาม
      try {
        const runRes = await getPurchaseRuns(restaurantId, 1);
        setLatestRun(runRes.data?.[0] || null);
      } catch (runError: any) {
        console.log('Latest run unavailable:', runError?.response?.data || runError.message);
      }
    } catch (err: any) {
      console.log('Error fetching purchase planning:', err?.response?.data || err.message);
      setError(getErrorMessage(err, 'โหลดข้อมูลแผนซื้อของไม่สำเร็จ'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManager, restaurantId]);

  // กลับมาจากหน้าตั้งค่าแล้วต้องเห็นรอบซื้อใหม่ทันที
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  /** ปุ่มเดียวในหน้านี้ที่ยิง AI จริง (ใช้เวลานาน) */
  const handleGenerate = async () => {
    if (!restaurantId || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await generatePurchaseRecommendations(restaurantId);
      setRecommendations(res.data || []);
      setExpandedId(null);
    } catch (err: any) {
      console.log('Error generating recommendations:', err?.response?.data || err.message);
      setError(getErrorMessage(err, 'ให้ AI คำนวณรายการซื้อไม่สำเร็จ'));
    } finally {
      setGenerating(false);
    }
  };

  const nextPurchaseLabel = useMemo(() => {
    if (!settings?.purchaseDays?.length) return null;
    const next = getNextPurchaseDate(settings.purchaseDays);
    return next ? formatPurchaseDate(next) : null;
  }, [settings]);

  const purchaseDaysLabel = useMemo(() => {
    if (!settings?.purchaseDays?.length) return 'ยังไม่ได้ตั้งวันซื้อของ';
    if (settings.purchaseDays.length === 7) return 'ซื้อทุกวัน';
    return settings.purchaseDays.map((day) => WEEKDAY_FULL_TH[day]).join(' · ');
  }, [settings]);

  // แสดงเฉพาะที่ต้องซื้อจริง รายการที่ AI สรุปว่ายังไม่ต้องซื้อไม่ต้องรก
  const buyList = useMemo(
    () => (recommendations || []).filter(needsPurchase),
    [recommendations]
  );

  const highConfidenceCount = useMemo(
    () => buyList.filter((item) => item.confidence === 'HIGH').length,
    [buyList]
  );

  const generatedAtLabel = recommendations?.length
    ? formatRelativeTime(recommendations[0].generatedAt)
    : null;

  // กันสิทธิ์ตั้งแต่ก่อน fetch — endpoint กลุ่มนี้เป็น Manager only
  if (!isManager) {
    return <ManagerOnly onBack={() => navigation.goBack()} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>แผนซื้อของ</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('PurchaseRunHistory')}
          >
            <Feather name="clock" size={20} color={theme.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('PurchaseSettings')}
          >
            <Feather name="settings" size={20} color={theme.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.textLight} />
        }
      >
        <Text style={styles.pageSubtitle}>วางแผนการซื้อวัตถุดิบด้วย AI</Text>

        {/* การ์ดรอบซื้อ + ปุ่มสั่ง AI คำนวณ */}
        <View style={styles.cycleCard}>
          <View style={styles.cycleRow}>
            <View style={styles.cycleIcon}>
              <Feather name="shopping-cart" size={18} color={theme.textDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cycleTitle}>
                {nextPurchaseLabel ? `รอบซื้อถัดไป: ${nextPurchaseLabel}` : 'ยังไม่ได้ตั้งรอบซื้อของ'}
              </Text>
              <Text style={styles.cycleMeta}>
                {purchaseDaysLabel}
                {settings ? ` · แจ้งเตือน ${formatTimeLabel(settings.notificationTime)} น.` : ''}
              </Text>
            </View>
          </View>

          {generatedAtLabel && (
            <Text style={styles.cycleUpdated}>
              อัปเดตล่าสุด {generatedAtLabel}
              {latestRun?.status === 'SUCCESS' ? ` · ${RUN_SOURCE_TH[latestRun.source]}` : ''}
            </Text>
          )}

          {latestRun?.status === 'FAILED' && (
            <View style={styles.failedBanner}>
              <Feather name="alert-triangle" size={15} color={theme.danger} />
              <Text style={styles.failedText}>
                รอบล่าสุด ({RUN_SOURCE_TH[latestRun.source]}) สร้างรายการไม่สำเร็จ
                {recommendations && recommendations.length > 0 ? ' — รายการด้านล่างเป็นของรอบก่อนหน้า' : ''}
                {latestRun.errorMessage ? `\n${latestRun.errorMessage}` : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={generating || !restaurantId}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="zap" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.generateBtnText}>
              {generating ? 'AI กำลังวิเคราะห์...' : 'ให้ AI คำนวณใหม่'}
            </Text>
          </TouchableOpacity>

          {generating && (
            <Text style={styles.generateHint}>
              AI ต้องดูสต็อกและประวัติการใช้ทั้งร้าน อาจใช้เวลาสักครู่ กรุณาอย่าปิดหน้านี้
            </Text>
          )}
        </View>

        {!!error && (
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={16} color={theme.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading || generating ? (
          <PurchaseSkeleton />
        ) : recommendations === null ? null : recommendations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.neutralBg }]}>
              <Feather name="shopping-cart" size={26} color={theme.textLight} />
            </View>
            <Text style={styles.emptyTitle}>ยังไม่มีรายการแนะนำ</Text>
            <Text style={styles.emptyDesc}>
              ยังไม่เคยให้ AI คำนวณรอบนี้{'\n'}
              กดปุ่ม "ให้ AI คำนวณใหม่" เพื่อดูรายการซื้อของรอบนี้
            </Text>
          </View>
        ) : buyList.length === 0 ? (
          // AI คำนวณแล้วแต่ทุกตัวไม่ต้องซื้อ — ต่างจากกรณียังไม่เคยคำนวณ
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="check-circle" size={26} color={theme.successText} />
            </View>
            <Text style={styles.emptyTitle}>สต็อกเพียงพอ ไม่ต้องซื้อเพิ่มรอบนี้</Text>
            <Text style={styles.emptyDesc}>
              AI ตรวจวัตถุดิบ {recommendations.length} รายการแล้ว{'\n'}
              ทุกตัวมีพอใช้ถึงรอบซื้อถัดไป
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryChipText}>ต้องซื้อ {buyList.length} รายการ</Text>
              </View>
              {highConfidenceCount > 0 && (
                <View style={[styles.summaryChip, { backgroundColor: theme.successBg }]}>
                  <Text style={[styles.summaryChipText, { color: theme.successText }]}>
                    มั่นใจสูง {highConfidenceCount}
                  </Text>
                </View>
              )}
            </View>

            {buyList.map((item) => (
              <RecommendationCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            ))}

            <Text style={styles.footerNote}>
              AI เป็นผู้เสนอจำนวนที่ควรซื้อจากประวัติการใช้จริง กรุณาตรวจสอบก่อนสั่งซื้อ
            </Text>
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
  headerActions: { flexDirection: 'row' },
  headerTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  pageSubtitle: { fontFamily: FONT, fontSize: 14, color: theme.textLight, marginBottom: 16 },

  cycleCard: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cycleRow: { flexDirection: 'row', alignItems: 'center' },
  cycleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cycleTitle: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark },
  cycleMeta: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginTop: 3 },
  cycleUpdated: { fontFamily: FONT, fontSize: 12, color: theme.textLight, marginTop: 12 },

  failedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.dangerBg,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  failedText: {
    flex: 1,
    fontFamily: FONT,
    fontSize: 12,
    color: theme.danger,
    lineHeight: 19,
    marginLeft: 8,
  },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 14,
  },
  generateBtnDisabled: { opacity: 0.7 },
  generateBtnText: { fontFamily: FONT_BOLD, fontSize: 14, color: '#FFFFFF', marginLeft: 8 },
  generateHint: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },

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

  summaryRow: { flexDirection: 'row', marginBottom: 14 },
  summaryChip: {
    backgroundColor: theme.neutralBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  summaryChipText: { fontFamily: FONT_BOLD, fontSize: 12, color: theme.neutralText },

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
    backgroundColor: theme.successBg,
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

  footerNote: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
});
