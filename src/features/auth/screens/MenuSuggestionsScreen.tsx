import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import {
  getExpiringIngredients,
  getNearExpirySuggestions,
  suggestMenusFromIngredients,
  getActiveStock,
  getErrorMessage,
} from '../../../api/suggestions';
import type { ConsumeTarget, Ingredient, SuggestedMenu } from '../../../types';
import {
  getUrgentCache,
  setUrgentCache,
  getChefCache,
  setChefCache,
  formatCacheAge,
} from '../../../api/suggestionCache';
import MenuCard from './components/MenuCard';
import MenuSkeleton from './components/MenuSkeleton';
import ConsumeModal from './components/ConsumeModal';
import { theme, FONT, FONT_BOLD } from './components/suggestionTheme';

const MAX_MENU_OPTIONS = [1, 3, 5];
const ALL_CATEGORIES = 'ทั้งหมด';

const normalize = (value: string) => value.trim().toLowerCase();

/** สีของ badge ตามความเร่งด่วน */
const getUrgency = (daysLeft: number) => {
  if (daysLeft <= 1) return { bg: theme.dangerBg, text: theme.danger };
  if (daysLeft <= 3) return { bg: theme.warningBg, text: theme.warningText };
  return { bg: theme.successBg, text: theme.successText };
};

export default function MenuSuggestionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId || null;

  // อ่านผลลัพธ์ที่แคชไว้ (อายุ 30 นาที) เพื่อไม่ต้องรอ AI ใหม่เมื่อกลับเข้าหน้านี้
  const cachedUrgent = restaurantId ? getUrgentCache(restaurantId) : null;
  const cachedChef = restaurantId ? getChefCache(restaurantId) : null;

  const [activeTab, setActiveTab] = useState<'URGENT' | 'CHEF'>('URGENT');

  // ---------- Tab 1: วัตถุดิบเร่งด่วน ----------
  // รายการใกล้หมดอายุโหลดจากเส้นธรรมดา (เร็ว ไม่เปลืองโควต้า AI)
  const [expiring, setExpiring] = useState<Ingredient[]>([]);
  const [expiringLoading, setExpiringLoading] = useState(false);
  const [expiringError, setExpiringError] = useState<string | null>(null);
  const [hasFetchedExpiring, setHasFetchedExpiring] = useState(false);
  // เมนูแนะนำจาก AI จะโหลดต่อเมื่อผู้ใช้กดปุ่มเองเท่านั้น
  const [menusByIngredient, setMenusByIngredient] = useState<Record<string, SuggestedMenu[]> | null>(
    cachedUrgent ? cachedUrgent.menusByIngredient : null
  );
  const [urgentFetchedAt, setUrgentFetchedAt] = useState<number | null>(
    cachedUrgent ? cachedUrgent.fetchedAt : null
  );
  const [aiUrgentLoading, setAiUrgentLoading] = useState(false);
  const [aiUrgentError, setAiUrgentError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---------- Tab 2: เชฟ AI ส่วนตัว ----------
  const [stock, setStock] = useState<Ingredient[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [hasFetchedStock, setHasFetchedStock] = useState(false);
  const [selectedNames, setSelectedNames] = useState<string[]>(
    cachedChef ? cachedChef.selectedNames : []
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);
  const [maxMenus, setMaxMenus] = useState(cachedChef ? cachedChef.maxMenus : 3);
  const [aiMenus, setAiMenus] = useState<SuggestedMenu[] | null>(cachedChef ? cachedChef.menus : null);
  const [chefFetchedAt, setChefFetchedAt] = useState<number | null>(
    cachedChef ? cachedChef.fetchedAt : null
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ---------- Consume modal ----------
  const [consumeTargets, setConsumeTargets] = useState<ConsumeTarget[]>([]);
  const [consumeVisible, setConsumeVisible] = useState(false);

  // ===================== Tab 1 =====================
  /** โหลดรายการวัตถุดิบใกล้หมดอายุ (ไม่เรียก AI) */
  const fetchExpiring = async () => {
    if (!user?.restaurantId) {
      setExpiringLoading(false);
      setHasFetchedExpiring(true);
      setExpiringError('ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');
      return;
    }

    setExpiringLoading(true);
    setExpiringError(null);
    try {
      const res = await getExpiringIngredients(user.restaurantId);
      const sorted = [...(res.data || [])].sort((a, b) => a.daysLeft - b.daysLeft);
      setExpiring(sorted);

      // ถ้ามีเมนูจากแคชอยู่แล้ว ให้กางการ์ดแรกที่มีเมนูให้เลย
      const currentMenus = getUrgentCache(user.restaurantId)?.menusByIngredient || null;
      if (currentMenus) {
        const firstWithMenus = sorted.find((item) => (currentMenus[item.id] || []).length > 0);
        setExpandedId(firstWithMenus ? firstWithMenus.id : null);
      }
    } catch (error: any) {
      console.log('Error fetching expiring ingredients:', error?.response?.data || error.message);
      setExpiringError(getErrorMessage(error, 'โหลดรายการวัตถุดิบใกล้หมดอายุไม่สำเร็จ'));
    } finally {
      setExpiringLoading(false);
      setHasFetchedExpiring(true);
    }
  };

  useEffect(() => {
    if (!hasFetchedExpiring) fetchExpiring();
  }, [user?.restaurantId]);

  /** ผู้ใช้กดขอเมนูแนะนำ -> ตรงนี้เท่านั้นที่ยิง AI */
  const fetchUrgentMenus = async () => {
    if (!user?.restaurantId) return;

    setAiUrgentLoading(true);
    setAiUrgentError(null);
    try {
      const res = await getNearExpirySuggestions(user.restaurantId);
      const map: Record<string, SuggestedMenu[]> = {};
      (res.data || []).forEach((group) => {
        const matched = expiring.find(
          (item) =>
            item.id === group.ingredientId || normalize(item.name) === normalize(group.ingredientName)
        );
        map[matched ? matched.id : group.ingredientId] = group.menus || [];
      });
      setMenusByIngredient(map);
      setUrgentFetchedAt(setUrgentCache(user.restaurantId, map));

      // เปิดการ์ดแรกที่มีเมนูให้ดูทันที
      const firstWithMenus = expiring.find((item) => (map[item.id] || []).length > 0);
      setExpandedId(firstWithMenus ? firstWithMenus.id : null);
    } catch (error: any) {
      console.log('Error fetching AI suggestions:', error?.response?.data || error.message);
      setAiUrgentError(
        getErrorMessage(error, 'ระบบ AI ไม่สามารถตอบสนองได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง')
      );
    } finally {
      setAiUrgentLoading(false);
    }
  };

  // ===================== Tab 2 =====================
  const fetchStock = async () => {
    if (!user?.restaurantId) return;
    setStockLoading(true);
    try {
      const res = await getActiveStock(user.restaurantId);
      setStock((res.data || []).filter((item) => item.quantity > 0));
    } catch (error: any) {
      console.log('Error fetching stock:', error?.message);
      setAiError(getErrorMessage(error, 'โหลดรายการวัตถุดิบไม่สำเร็จ'));
    } finally {
      setStockLoading(false);
      setHasFetchedStock(true);
    }
  };

  useEffect(() => {
    if (activeTab === 'CHEF' && !hasFetchedStock) fetchStock();
  }, [activeTab]);

  const categories = useMemo(() => {
    const found = Array.from(new Set(stock.map((item) => item.category).filter(Boolean)));
    return [ALL_CATEGORIES, ...found];
  }, [stock]);

  const visibleStock = useMemo(
    () =>
      selectedCategory === ALL_CATEGORIES
        ? stock
        : stock.filter((item) => item.category === selectedCategory),
    [stock, selectedCategory]
  );

  const toggleIngredient = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleGenerateMenus = async () => {
    if (!user?.restaurantId || selectedNames.length === 0) return;

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await suggestMenusFromIngredients(user.restaurantId, selectedNames, maxMenus);
      const menus = res.data?.menus || [];
      setAiMenus(menus);
      setChefFetchedAt(setChefCache(user.restaurantId, selectedNames, maxMenus, menus));
    } catch (error: any) {
      console.log('Error generating menus:', error?.response?.data || error.message);
      setAiError(getErrorMessage(error, 'AI ไม่สามารถแนะนำเมนูได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'));
    } finally {
      setAiLoading(false);
    }
  };

  // ===================== Consume =====================
  const openConsume = (targets: ConsumeTarget[]) => {
    if (targets.length === 0) return;
    setConsumeTargets(targets);
    setConsumeVisible(true);
  };

  const handleConsumeSuccess = (updated: Ingredient) => {
    // อัปเดตจำนวนคงเหลือในหน้าจอทันที ไม่ต้องยิง AI ใหม่
    setExpiring((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, quantity: updated.quantity } : item))
    );
    setStock((prev) =>
      prev
        .map((item) => (item.id === updated.id ? { ...item, quantity: updated.quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  /** Tab 2: หาวัตถุดิบที่ผู้ใช้เลือกไว้ ซึ่งตรงกับ ingredientsInStock ของเมนูนั้น */
  const resolveTargetsForMenu = (menu: SuggestedMenu): ConsumeTarget[] => {
    const inStock = (menu.ingredientsInStock || []).map(normalize);
    return stock
      .filter(
        (item) => selectedNames.includes(item.name) && inStock.includes(normalize(item.name))
      )
      .map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unit: item.unit }));
  };

  const disclaimer = (
    <View style={styles.disclaimer}>
      <Feather name="info" size={12} color={theme.textLight} style={{ marginTop: 2 }} />
      <Text style={styles.disclaimerText}>
        เมนูนี้เป็นคำแนะนำจาก AI โปรดตรวจสอบความถูกต้องและปริมาณสต็อกจริงอีกครั้ง
      </Text>
    </View>
  );

  // ===================== Render: Tab 1 =====================
  const renderUrgentTab = () => {
    if (expiringLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>กำลังตรวจสอบวัตถุดิบใกล้หมดอายุ...</Text>
        </View>
      );
    }

    if (expiringError) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="alert-circle" size={48} color={theme.danger} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>เกิดข้อผิดพลาด</Text>
          <Text style={[styles.emptySubText, { textAlign: 'center', marginHorizontal: 20 }]}>
            {expiringError}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchExpiring}>
            <Feather name="refresh-cw" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryBtnText}>ลองใหม่อีกครั้ง</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (expiring.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="smile" size={48} color={theme.successText} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>เยี่ยมเลย!</Text>
          <Text style={styles.emptySubText}>วัตถุดิบทุกอย่างยังอยู่ในสภาพดี</Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.listSummary}>
          มีวัตถุดิบใกล้หมดอายุ {expiring.length} รายการ
          {menusByIngredient
            ? urgentFetchedAt
              ? ` · ${formatCacheAge(urgentFetchedAt)}`
              : ''
            : ' · กดปุ่มด้านล่างเพื่อให้ AI แนะนำเมนู'}
        </Text>

        {aiUrgentError ? <Text style={styles.inlineError}>{aiUrgentError}</Text> : null}

        {expiring.map((item) => {
          const urgency = getUrgency(item.daysLeft);
          const menus = menusByIngredient ? menusByIngredient[item.id] || [] : null;
          const isOpen = expandedId === item.id;
          const canExpand = menus !== null && menus.length > 0;

          return (
            <View key={item.id} style={styles.accordion}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={canExpand ? 0.7 : 1}
                disabled={!canExpand}
                onPress={() => setExpandedId(isOpen ? null : item.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.accordionTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.accordionSubtitle}>
                    เหลือ {item.quantity} {item.unit}
                    {menus === null
                      ? ` · หมดอายุ ${item.expiryDate}`
                      : menus.length > 0
                      ? ` · ${menus.length} เมนูแนะนำ`
                      : ' · ยังไม่มีเมนูแนะนำ'}
                  </Text>
                </View>
                <View style={[styles.dayBadge, { backgroundColor: urgency.bg }]}>
                  <Text style={[styles.dayBadgeText, { color: urgency.text }]}>
                    {item.daysLeft <= 0 ? 'หมดอายุวันนี้' : `เหลือ ${item.daysLeft} วัน`}
                  </Text>
                </View>
                {canExpand ? (
                  <Feather
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textLight}
                    style={{ marginLeft: 8 }}
                  />
                ) : (
                  <View style={{ width: 28 }} />
                )}
              </TouchableOpacity>

              {isOpen && menus ? (
                <View style={styles.accordionBody}>
                  {menus.map((menu, i) => (
                    <MenuCard
                      key={`${item.id}-${i}`}
                      menu={menu}
                      onConsume={() =>
                        openConsume([
                          { id: item.id, name: item.name, quantity: item.quantity, unit: item.unit },
                        ])
                      }
                    />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {aiUrgentLoading ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.loadingText}>AI กำลังคิดเมนูให้แต่ละวัตถุดิบ...</Text>
            <Text style={styles.loadingSubText}>(อาจใช้เวลา 1-2 นาที)</Text>
            <MenuSkeleton count={2} />
          </View>
        ) : null}

        {menusByIngredient ? disclaimer : null}
      </View>
    );
  };

  // ===================== Render: Tab 2 =====================
  const renderChefTab = () => {
    if (aiLoading) {
      return (
        <View>
          <Text style={styles.loadingText}>AI กำลังเสกเมนูจากวัตถุดิบที่คุณเลือก...</Text>
          <Text style={styles.loadingSubText}>(อาจใช้เวลาสักครู่)</Text>
          <MenuSkeleton count={maxMenus > 3 ? 3 : maxMenus} />
        </View>
      );
    }

    if (aiMenus) {
      return (
        <View>
          <View style={styles.resultHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>ได้ {aiMenus.length} เมนู</Text>
              {chefFetchedAt ? (
                <Text style={styles.resultSubtitle}>{formatCacheAge(chefFetchedAt)}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setAiMenus(null);
                setChefFetchedAt(null);
                setAiError(null);
              }}
            >
              <Feather name="rotate-ccw" size={14} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>เลือกใหม่</Text>
            </TouchableOpacity>
          </View>

          {aiMenus.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="frown" size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>AI ยังคิดเมนูไม่ออก</Text>
              <Text style={styles.emptySubText}>ลองเลือกวัตถุดิบอื่นเพิ่มดูนะ</Text>
            </View>
          ) : (
            aiMenus.map((menu, i) => {
              const targets = resolveTargetsForMenu(menu);
              return (
                <MenuCard
                  key={i}
                  menu={menu}
                  onConsume={targets.length > 0 ? () => openConsume(targets) : undefined}
                />
              );
            })
          )}
          {disclaimer}
        </View>
      );
    }

    if (stockLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>กำลังโหลดวัตถุดิบในคลัง...</Text>
        </View>
      );
    }

    if (stock.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="package" size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>ยังไม่มีวัตถุดิบในคลัง</Text>
          <Text style={styles.emptySubText}>เพิ่มวัตถุดิบก่อนแล้วค่อยให้ AI ช่วยคิดเมนู</Text>
        </View>
      );
    }

    return (
      <View>
        {aiError ? <Text style={styles.inlineError}>{aiError}</Text> : null}

        <Text style={styles.fieldLabel}>หมวดหมู่</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterPill, selectedCategory === cat ? styles.filterPillActive : undefined]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[styles.filterText, selectedCategory === cat ? styles.filterTextActive : undefined]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>จำนวนเมนูที่ต้องการ</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MAX_MENU_OPTIONS.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.filterPill, maxMenus === n ? styles.filterPillActive : undefined]}
              onPress={() => setMaxMenus(n)}
            >
              <Text style={[styles.filterText, maxMenus === n ? styles.filterTextActive : undefined]}>
                {n} เมนู
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
          เลือกวัตถุดิบที่อยากใช้ ({selectedNames.length})
        </Text>
        <View style={styles.listCard}>
          {visibleStock.length === 0 ? (
            <Text style={[styles.emptySubText, { padding: 16 }]}>ไม่มีวัตถุดิบในหมวดนี้</Text>
          ) : (
            visibleStock.map((item, index) => {
              const checked = selectedNames.includes(item.name);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.stockRow, index === visibleStock.length - 1 ? { borderBottomWidth: 0 } : undefined]}
                  activeOpacity={0.7}
                  onPress={() => toggleIngredient(item.name)}
                >
                  <View style={[styles.checkbox, checked ? styles.checkboxActive : undefined]}>
                    {checked ? <Feather name="check" size={14} color="#FFF" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stockName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.stockMeta}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {disclaimer}
      </View>
    );
  };

  const showChefButton = activeTab === 'CHEF' && !aiMenus && !aiLoading && stock.length > 0;
  const showUrgentButton =
    activeTab === 'URGENT' && !expiringLoading && !expiringError && expiring.length > 0;
  const showFooter = showChefButton || showUrgentButton;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {navigation.canGoBack() ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={24} color={theme.textDark} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.headerTitle}>ไอเดียเมนูจาก AI</Text>
        {activeTab === 'URGENT' ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={fetchExpiring}
            disabled={expiringLoading || aiUrgentLoading}
          >
            <Feather
              name="refresh-cw"
              size={20}
              color={expiringLoading || aiUrgentLoading ? theme.border : theme.textDark}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'URGENT' ? styles.tabButtonActive : undefined]}
          onPress={() => setActiveTab('URGENT')}
        >
          <Text style={[styles.tabText, activeTab === 'URGENT' ? styles.tabTextActive : undefined]}>
            วัตถุดิบเร่งด่วน
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'CHEF' ? styles.tabButtonActive : undefined]}
          onPress={() => setActiveTab('CHEF')}
        >
          <Text style={[styles.tabText, activeTab === 'CHEF' ? styles.tabTextActive : undefined]}>
            เชฟ AI ส่วนตัว
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, showFooter ? { paddingBottom: 110 } : undefined]}
      >
        {activeTab === 'URGENT' ? renderUrgentTab() : renderChefTab()}
      </ScrollView>

      {showUrgentButton ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateBtn, aiUrgentLoading ? styles.generateBtnDisabled : undefined]}
            onPress={fetchUrgentMenus}
            disabled={aiUrgentLoading}
          >
            {aiUrgentLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="zap" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.generateBtnText}>
                  {menusByIngredient ? 'ขอเมนูแนะนำใหม่อีกครั้ง' : 'ค้นหาเมนูแนะนำจาก AI'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {showChefButton ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.generateBtn, selectedNames.length === 0 ? styles.generateBtnDisabled : undefined]}
            onPress={handleGenerateMenus}
            disabled={selectedNames.length === 0}
          >
            <Feather name="zap" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.generateBtnText}>
              เสกเมนูจาก AI{selectedNames.length > 0 ? ` (${selectedNames.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ConsumeModal
        visible={consumeVisible}
        targets={consumeTargets}
        onClose={() => setConsumeVisible(false)}
        onSuccess={handleConsumeSuccess}
      />
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
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONT_BOLD, fontSize: 18, color: theme.textDark },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.neutralBg,
    borderRadius: 18,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  tabButtonActive: { backgroundColor: theme.card },
  tabText: { fontFamily: FONT, fontSize: 13, color: theme.textLight },
  tabTextActive: { fontFamily: FONT_BOLD, color: theme.textDark },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    color: theme.textDark,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingSubText: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },

  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { fontFamily: FONT_BOLD, fontSize: 16, color: theme.textDark },
  emptySubText: { fontFamily: FONT, fontSize: 13, color: theme.textLight, marginTop: 4 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 20,
  },
  retryBtnText: { fontFamily: FONT_BOLD, fontSize: 14, color: '#FFF' },
  listSummary: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.textLight,
    marginBottom: 12,
    lineHeight: 18,
  },
  inlineError: {
    fontFamily: FONT,
    fontSize: 12,
    color: theme.danger,
    backgroundColor: theme.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },

  accordion: {
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  accordionTitle: { fontFamily: FONT_BOLD, fontSize: 15, color: theme.textDark },
  accordionSubtitle: { fontFamily: FONT, fontSize: 12, color: theme.textLight, marginTop: 2 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  dayBadgeText: { fontFamily: FONT_BOLD, fontSize: 11 },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: theme.background,
    paddingTop: 12,
  },

  fieldLabel: { fontFamily: FONT_BOLD, fontSize: 13, color: theme.textDark, marginBottom: 10 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  filterText: { fontFamily: FONT, fontSize: 13, color: theme.textDark },
  filterTextActive: { color: '#FFF', fontFamily: FONT_BOLD },

  listCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  stockName: { fontFamily: FONT, fontSize: 14, color: theme.textDark },
  stockMeta: { fontFamily: FONT, fontSize: 12, color: theme.textLight, marginTop: 2 },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultTitle: { fontFamily: FONT_BOLD, fontSize: 15, color: theme.textDark },
  resultSubtitle: { fontFamily: FONT, fontSize: 11, color: theme.textLight, marginTop: 2 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
  },
  resetBtnText: { fontFamily: FONT_BOLD, fontSize: 12, color: theme.primary },

  disclaimer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  disclaimerText: { flex: 1, fontFamily: FONT, fontSize: 11, color: theme.textLight, lineHeight: 17 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 20,
    backgroundColor: theme.primary,
  },
  generateBtnDisabled: { backgroundColor: theme.textLight },
  generateBtnText: { fontFamily: FONT_BOLD, fontSize: 15, color: '#FFF' },
});
