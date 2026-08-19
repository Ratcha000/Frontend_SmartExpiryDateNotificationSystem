import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator, 
  RefreshControl,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';

const theme = {
  background: '#F9F8F4',
  card: '#FFFFFF',
  primary: '#24211D',
  textLight: '#A39C93',
  textDark: '#24211D',
  cardExpiring: '#FFF3E3',
  cardExpired: '#FCE8E8',
  cardLowStock: '#F0F4FC',
  textExpiring: '#D97706',
  textExpired: '#DC2626',
  textLowStock: '#2563EB',
  badgeBg: '#F3E8E8',
  badgeText: '#D9534F',
  border: '#E8E6E1',
  danger: '#DC2626',
};

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [userData, setUserData] = useState<any>(user);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    expiringSoon: 0,
    expired: 0,
    lowStock: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [hasReadNotifications, setHasReadNotifications] = useState(false);
  
  const prevActionCount = useRef(0); 

  const fetchHomeData = async () => {
    try {
      const resUser = await apiClient.get('/auth/me');
      setUserData(resUser.data);

      if (resUser.data?.restaurantId) {
        const resRest = await apiClient.get('/restaurants/me');
        setRestaurantData(resRest.data);

        const resInv = await apiClient.get(`/ingredients?restaurantId=${resUser.data.restaurantId}`);
        const activeItems = resInv.data.filter((item: any) => item.status !== 'DELETED');
        
        const expiring = activeItems.filter((item: any) => item.expiring);
        const expired = activeItems.filter((item: any) => item.expired || item.status === 'EXPIRED');
        const lowStock = activeItems.filter((item: any) => item.quantity <= (item.initialQuantity * 0.20));

        setStats({
          totalItems: activeItems.length,
          expiringSoon: expiring.length,
          expired: expired.length,
          lowStock: lowStock.length,
        });

        const newActionItems = [...expiring, ...expired];
        
        if (newActionItems.length > prevActionCount.current) {
          setHasReadNotifications(false);
        }
        
        prevActionCount.current = newActionItems.length;
        setActionItems(newActionItems);
      }
    } catch (error: any) {
      console.log('Error fetching Home data from API:', error?.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHomeData();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, []);

  const displayName = userData?.displayName?.split(' ')[0] || 'User';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const expiringItemsOnly = actionItems.filter(i => i.expiring);

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
      >
        
        {/* --- ส่วน Header ที่ปรับใหม่ --- */}
        <View style={styles.header}>
          {/* บรรทัดบน: วันที่ และ คำทักทาย */}
          <Text style={styles.dateText}>{today}</Text>
          <Text style={styles.greetingText}>Good morning, {displayName}</Text>
          
          {/* บรรทัดล่าง: ชื่อร้าน และ ปุ่มกระดิ่งแจ้งเตือน ให้อยู่ระดับเดียวกัน */}
          <View style={styles.locationAndNotificationRow}>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color={theme.danger} />
              <Text style={styles.restaurantSubtext}>{restaurantData?.name || 'No Workspace'}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => {
                setShowNotificationPopup(true);
                setHasReadNotifications(true);
              }}
            >
              <Feather name="bell" size={20} color={theme.textDark} />
              {actionItems.length > 0 && !hasReadNotifications ? (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeNumber}>{actionItems.length}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.card }]}>
            <Text style={styles.statTitle}>วัตถุดิบทั้งหมด</Text>
            <Text style={[styles.statValue, { color: theme.textDark }]}>{stats.totalItems}</Text>
            <Text style={styles.statDesc}>ในที่จัดเก็บ</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.cardExpiring }]}>
            <Text style={styles.statTitle}>ใกล้หมดอายุ</Text>
            <Text style={[styles.statValue, { color: theme.textExpiring }]}>{stats.expiringSoon}</Text>
            <Text style={styles.statDesc}>ภายใน3วัน</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.cardExpired }]}>
            <Text style={styles.statTitle}>หมดอายุ</Text>
            <Text style={[styles.statValue, { color: theme.textExpired }]}>{stats.expired}</Text>
            <Text style={styles.statDesc}>ต้องลบข้อมูล</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.cardLowStock }]}>
            <Text style={styles.statTitle}>สต๊อคเหลือน้อย</Text>
            <Text style={[styles.statValue, { color: theme.textLowStock }]}>{stats.lowStock}</Text>
            <Text style={styles.statDesc}> ต่ำกว่ามาตรฐาน</Text>
          </View>
        </View>

        {/* แสดงเฉพาะของที่ใกล้หมดอายุ ไม่รวมของที่หมดอายุไปแล้ว */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ต้องรีบใช้วันนี้แล้วนะ!</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{expiringItemsOnly.length} items</Text>
          </View>
        </View>

        <View style={styles.actionList}>
          {expiringItemsOnly.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="check-circle" size={32} color={theme.textLight} />
              <Text style={styles.emptyText}>No items requiring action today</Text>
            </View>
          ) : (
            expiringItemsOnly.map((item) => (
              <View key={item.id} style={styles.actionCard}>
                <View style={styles.actionInfo}>
                  <View style={[styles.dotIndicator, { backgroundColor: theme.textExpiring }]} />
                  <View>
                    <Text style={styles.actionName}>{item.name}</Text>
                    <Text style={styles.actionDesc}>
                      {item.quantity} {item.unit} • <Text style={{ color: theme.textExpiring }}>
                        {item.daysLeft} days left
                      </Text>
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: theme.cardExpiring }]}>
                  <Text style={[styles.statusBadgeText, { color: theme.textExpiring }]}>
                    Near Expiry
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>เมนูลัด</Text>
        <View style={styles.quickActionsGrid}>
          
          <TouchableOpacity style={[styles.quickBtn, styles.quickBtnPrimary]}>
            <Feather name="maximize" size={24} color="#FFF" />
            <Text style={[styles.quickBtnText, { color: '#FFF' }]}>สแกน</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickBtn}
            onPress={() => navigation.navigate('AddIngredient')}
          >
            <Feather name="plus" size={24} color={theme.textDark} />
            <Text style={styles.quickBtnText}>เพิ่มของ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickBtn}
            onPress={() => navigation.navigate('MenuSuggestions')}
          >
            <Feather name="book-open" size={24} color={theme.textDark} />
            <Text style={styles.quickBtnText}>เมนู AI</Text>
          </TouchableOpacity>
          
          {isManager ? (
            <TouchableOpacity style={styles.quickBtn}>
              <Feather name="shopping-cart" size={24} color={theme.textDark} />
              <Text style={styles.quickBtnText}>แผนซื้อของ</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>ใกล้หมดอายุ</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
            <Text style={{ fontFamily: FONT_REGULAR, fontSize: 13, color: theme.textLight }}>ดูทั้งหมด</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ marginBottom: 24, marginHorizontal: -20 }} 
          contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
        >
          {expiringItemsOnly.length === 0 ? (
            <Text style={{ fontFamily: FONT_REGULAR, color: theme.textLight }}>ไม่มีวัตถุดิบใกล้หมดอายุ</Text>
          ) : (
            expiringItemsOnly.map((item) => (
              <View key={`near-${item.id}`} style={styles.nearExpiryCard}>
                <View style={styles.nearExpiryCategory}>
                  <Text style={styles.nearExpiryCategoryText}>{item.category || 'General'}</Text>
                </View>
                <Text style={styles.nearExpiryName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.nearExpiryQty}>{item.quantity} {item.unit}</Text>
                <Text style={styles.nearExpiryDays}>{item.daysLeft} วันที่เหลือ</Text>
              </View>
            ))
          )}
        </ScrollView>

        {expiringItemsOnly.length > 0 ? (
          <TouchableOpacity 
            style={styles.aiCard}
            onPress={() => navigation.navigate('MenuSuggestions')}
          >
            <View style={styles.aiIconBg}>
              <Feather name="zap" size={20} color="#FFF" />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>AI SUGGESTION</Text>
              <Text style={styles.aiDesc}>
                มีไอเดียเมนูจากวัตถุดิบใกล้หมดอายุของคุณ กดเพื่อดูเลย!
              </Text>
              <View style={styles.aiLinkRow}>
                <Text style={styles.aiLinkText}>ดูเมนูแนะนำ</Text>
                <Feather name="chevron-right" size={16} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showNotificationPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotificationPopup(false)}
      >
        <TouchableOpacity 
          style={styles.popupOverlay} 
          activeOpacity={1} 
          onPress={() => setShowNotificationPopup(false)} 
        >
          <TouchableWithoutFeedback>
            <View style={styles.popupContent}>
              <Text style={styles.popupTitle}>Unread Notifications</Text>
              
              {actionItems.length === 0 ? (
                <Text style={styles.popupEmptyText}>You're all caught up!</Text>
              ) : (
                <>
                  {actionItems.slice(0, 3).map((item, idx) => (
                    <View key={`popup-${idx}`} style={styles.popupItemRow}>
                      <View style={[styles.popupDot, { backgroundColor: item.expired ? theme.textExpired : theme.textExpiring }]} />
                      <Text style={styles.popupItemText} numberOfLines={1}>
                        {item.name} <Text style={{ color: theme.textLight }}>- {item.expired ? 'Expired' : 'Expiring soon'}</Text>
                      </Text>
                    </View>
                  ))}
                  
                  {actionItems.length > 3 ? (
                    <Text style={styles.popupMoreText}>+{actionItems.length - 3} more items...</Text>
                  ) : null}
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
 header: { 
    marginBottom: 24,
    // 🔴 (เอา flexDirection: 'row' ของเดิมออก) 
  },
  
  // 🔴 สไตล์ใหม่สำหรับจัดบรรทัดชื่อร้านและกระดิ่ง
  locationAndNotificationRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 12 
  },
  dateText: { fontFamily: FONT_BOLD, fontSize: 11, color: theme.textLight, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  greetingText: { fontFamily: FONT_BOLD, fontSize: 24, color: theme.textDark },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  restaurantSubtext: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight },
  
  notificationBtn: { 
    backgroundColor: theme.card, 
    padding: 10, // 🔴 ลด padding ลงนิดนึงไม่ให้กระดิ่งดูเทอะทะ
    borderRadius: 99, 
    position: 'relative' 
  },
  badgeContainer: { position: 'absolute', top: -4, right: -4, backgroundColor: theme.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.background, paddingHorizontal: 4 },
  badgeNumber: { color: '#FFF', fontSize: 10, fontFamily: FONT_BOLD, includeFontPadding: false, textAlignVertical: 'center', marginTop: Platform.OS === 'android' ? -2 : 0 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    color: theme.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: FONT_BOLD,
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 4,
  },
  statDesc: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: theme.textLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    color: theme.textDark,
  },
  sectionBadge: {
    backgroundColor: theme.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
    color: theme.badgeText,
  },
  actionList: {
    marginBottom: 32,
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionName: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: theme.textDark,
  },
  actionDesc: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: theme.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    color: theme.textLight,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: theme.card,
    paddingVertical: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  quickBtnPrimary: {
    backgroundColor: theme.primary,
  },
  quickBtnText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: theme.textDark,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  popupContent: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: 20,
    width: 260,
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  popupTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    color: theme.textDark,
    marginBottom: 12,
  },
  popupItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  popupDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  popupItemText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: theme.textDark,
    flex: 1,
  },
  popupEmptyText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: theme.textLight,
  },
  popupMoreText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: theme.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  nearExpiryCard: {
    backgroundColor: theme.card,
    width: 140,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  nearExpiryCategory: {
    backgroundColor: theme.badgeBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  nearExpiryCategoryText: {
    fontFamily: FONT_REGULAR,
    fontSize: 10,
    color: theme.textLight,
    textTransform: 'capitalize',
  },
  nearExpiryName: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    color: theme.textDark,
    marginBottom: 4,
  },
  nearExpiryQty: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: theme.textLight,
  },
  nearExpiryDays: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: theme.textExpiring,
    marginTop: 8,
  },
  aiCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  aiIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  aiDesc: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
    marginBottom: 12,
  },
  aiLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiLinkText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: '#FFF',
    marginRight: 4,
  },
});