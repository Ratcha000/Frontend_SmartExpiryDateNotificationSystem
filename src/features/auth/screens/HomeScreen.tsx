import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client';

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
};

export default function HomeScreen() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  // ---------------- State สำหรับข้อมูลจริงจาก API ----------------
  const [userData, setUserData] = useState<any>(user);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  
  // State สำหรับ Items (ดึงจริงเมื่อ Backend เพิ่ม Endpoint ฝั่ง Stock)
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    expiringSoon: 0,
    expired: 0,
    lowStock: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ---------------- ฟังก์ชันดึงข้อมูลจาก API จริง ----------------
  const fetchHomeData = async () => {
    try {
      // 1. ดึงข้อมูล User ปัจจุบันจาก GET /api/auth/me
      const resUser = await apiClient.get('/auth/me');
      setUserData(resUser.data);

      // 2. ถ้า User มีร้านค้า ให้ดึงข้อมูลร้านจาก GET /api/restaurants/me
      if (resUser.data?.restaurantId) {
        const resRest = await apiClient.get('/restaurants/me');
        setRestaurantData(resRest.data);

        // 3. ดึงจำนวนสมาชิกจริงในร้านจาก GET /api/restaurants/{id}/members
        if (resRest.data?.id) {
          const resMembers = await apiClient.get(`/restaurants/${resRest.data.id}/members`);
          setMemberCount(resMembers.data?.length || 0);
        }

        // 4. (เตรียมไว้สำหรับดึงรายการสินค้าจริงเมื่อ Backend เปิดใช้ API Stock)
        // const resItems = await apiClient.get('/items');
        // setActionItems(resItems.data);
      }
    } catch (error) {
      console.error('Error fetching Home data from API:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  // ฟังก์ชันรองรับการลากลงเพื่อรีเฟรชข้อมูล (Pull to Refresh)
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

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
      }
    >
      
      {/* ---------------- 1. Header (ข้อมูลจาก Auth API) ---------------- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{today}</Text>
          <Text style={styles.greetingText}>Good morning, {displayName}</Text>
          {restaurantData?.name && (
            <Text style={styles.restaurantSubtext}>📍 {restaurantData.name}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Feather name="bell" size={24} color={theme.textDark} />
          {actionItems.length > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeNumber}>{actionItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ---------------- 2. Stats Grid ---------------- */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={styles.statTitle}>TOTAL ITEMS</Text>
          <Text style={[styles.statValue, { color: theme.textDark }]}>{stats.totalItems}</Text>
          <Text style={styles.statDesc}>in inventory</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.cardExpiring }]}>
          <Text style={styles.statTitle}>EXPIRING SOON</Text>
          <Text style={[styles.statValue, { color: theme.textExpiring }]}>{stats.expiringSoon}</Text>
          <Text style={styles.statDesc}>within 3 days</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.cardExpired }]}>
          <Text style={styles.statTitle}>EXPIRED</Text>
          <Text style={[styles.statValue, { color: theme.textExpired }]}>{stats.expired}</Text>
          <Text style={styles.statDesc}>needs removal</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.cardLowStock }]}>
          <Text style={styles.statTitle}>LOW STOCK</Text>
          <Text style={[styles.statValue, { color: theme.textLowStock }]}>{stats.lowStock}</Text>
          <Text style={styles.statDesc}>below par level</Text>
        </View>
      </View>

      {/* ---------------- 3. Needs Action Today ---------------- */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Needs Action Today</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{actionItems.length} items</Text>
        </View>
      </View>

      <View style={styles.actionList}>
        {actionItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="check-circle" size={32} color={theme.textLight} />
            <Text style={styles.emptyText}>No items requiring action today</Text>
          </View>
        ) : (
          actionItems.map((item) => (
            <View key={item.id} style={styles.actionCard}>
              <View style={styles.actionInfo}>
                <View style={styles.dotIndicator} />
                <View>
                  <Text style={styles.actionName}>{item.name}</Text>
                  <Text style={styles.actionDesc}>
                    {item.quantity} • <Text style={{ color: theme.textExpiring }}>{item.timeLeft}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.dotIndicator, { backgroundColor: theme.textExpiring }]} />
                <Text style={styles.statusBadgeText}>{item.status}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ---------------- 4. Quick Actions ---------------- */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        
        <TouchableOpacity style={[styles.quickBtn, styles.quickBtnPrimary]}>
          <Feather name="maximize" size={24} color="#FFF" />
          <Text style={[styles.quickBtnText, { color: '#FFF' }]}>Scan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickBtn}>
          <Feather name="plus" size={24} color={theme.textDark} />
          <Text style={styles.quickBtnText}>Add Item</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickBtn}>
          <Feather name="book-open" size={24} color={theme.textDark} />
          <Text style={styles.quickBtnText}>Menu AI</Text>
        </TouchableOpacity>
        
        {/* แสดงผลเฉพาะ Manager ตามสิทธิ์ Role ที่ดึงมาจาก API */}
        {isManager && (
          <TouchableOpacity style={styles.quickBtn}>
            <Feather name="shopping-cart" size={24} color={theme.textDark} />
            <Text style={styles.quickBtnText}>Buy Plan</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 100 }} />

    </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 11,
    color: theme.textLight,
    letterSpacing: 1,
    marginBottom: 4,
  },
  greetingText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 24,
    color: theme.textDark,
  },
  restaurantSubtext: {
    fontFamily: 'Mali_400Regular',
    fontSize: 13,
    color: theme.textLight,
    marginTop: 2,
  },
  notificationBtn: {
    backgroundColor: theme.card,
    padding: 12,
    borderRadius: 99,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.badgeText,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.background,
  },
  badgeNumber: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Mali_700Bold',
  },

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
  },
  statTitle: {
    fontFamily: 'Mali_700Bold',
    fontSize: 10,
    color: theme.textLight,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Mali_700Bold',
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 4,
  },
  statDesc: {
    fontFamily: 'Mali_400Regular',
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
    fontFamily: 'Mali_700Bold',
    fontSize: 18,
    color: theme.textDark,
    marginBottom: 16,
  },
  sectionBadge: {
    backgroundColor: theme.badgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontFamily: 'Mali_700Bold',
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
    backgroundColor: theme.textExpiring,
  },
  actionName: {
    fontFamily: 'Mali_700Bold',
    fontSize: 15,
    color: theme.textDark,
  },
  actionDesc: {
    fontFamily: 'Mali_400Regular',
    fontSize: 13,
    color: theme.textLight,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.cardExpiring,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  statusBadgeText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 11,
    color: theme.textExpiring,
  },

  emptyCard: {
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Mali_400Regular',
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
  },
  quickBtnPrimary: {
    backgroundColor: theme.primary,
  },
  quickBtnText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 12,
    color: theme.textDark,
  },
});