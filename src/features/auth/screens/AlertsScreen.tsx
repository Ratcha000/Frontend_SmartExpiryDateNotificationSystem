import React, { useState, useCallback } from 'react';
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
import apiClient from '../../../api/client';

const theme = {
  background: '#F9F8F4',
  card: '#FFFFFF',
  textDark: '#24211D',
  textLight: '#A39C93',
  border: '#E8E6E1',
  
  // สีประจำแต่ละหมวดหมู่ตามดีไซน์
  critical: '#DC2626',   // Expired
  urgent: '#D97706',     // Expiring Today
  warning: '#D4A373',    // Within 3 days (สีทอง/ส้มอ่อน)
  stock: '#417B5A',      // Low Stock (สีเขียวเข้ม)
};

export default function AlertsScreen({ navigation }: any) {
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // สเตทแยกแต่ละกลุ่ม
  const [expiredItems, setExpiredItems] = useState<any[]>([]);
  const [todayItems, setTodayItems] = useState<any[]>([]);
  const [soonItems, setSoonItems] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  const fetchAlerts = async () => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await apiClient.get(`/ingredients?restaurantId=${user.restaurantId}`);
      const activeItems = res.data.filter((item: any) => item.status !== 'DELETED');
      
      // จัดกลุ่มข้อมูล
      const expired = activeItems.filter((i: any) => i.expired || i.daysLeft < 0);
      const today = activeItems.filter((i: any) => !i.expired && i.daysLeft === 0);
      const soon = activeItems.filter((i: any) => !i.expired && i.daysLeft > 0 && i.daysLeft <= 3);
      
      // Stock Alert: สินค้าน้อยกว่า 20% ของที่เคยมี
      const stock = activeItems.filter((i: any) => i.quantity <= (i.initialQuantity * 0.2) && !i.expired && i.daysLeft !== 0);

      setExpiredItems(expired);
      setTodayItems(today);
      setSoonItems(soon);
      setLowStockItems(stock);

    } catch (error) {
      console.log('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, []);

  const totalUnread = expiredItems.length + todayItems.length + soonItems.length + lowStockItems.length;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.textDark} />
      </View>
    );
  }

  // Component ตัวแทนสร้างการ์ดแต่ละใบ
  const AlertCard = ({ item, type, dotColor, timeText, subtitleFormat }: any) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDesc}>{subtitleFormat(item)}</Text>
        </View>
      </View>
      <Text style={styles.timeText}>{timeText}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
        {/* --- Header --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Alerts</Text>
            <Text style={styles.pageSubtitle}>{totalUnread} unread notification{totalUnread > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity onPress={() => {/* สำหรับต่อยอดฟังก์ชันอ่านทั้งหมด */}}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {totalUnread === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={48} color={theme.border} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubText}>You have no pending alerts right now.</Text>
          </View>
        )}

        {/* --- CRITICAL: EXPIRED --- */}
        {expiredItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.critical }]}>CRITICAL — EXPIRED</Text>
            {expiredItems.map(item => (
              <AlertCard 
                key={`exp-${item.id}`}
                item={item}
                dotColor={theme.critical}
                timeText="Just now"
                subtitleFormat={(i: any) => `Expired ${Math.abs(i.daysLeft)} day${Math.abs(i.daysLeft) > 1 ? 's' : ''} ago • ${i.quantity} ${i.unit} remaining`}
              />
            ))}
          </View>
        )}

        {/* --- URGENT: EXPIRING TODAY --- */}
        {todayItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.urgent }]}>URGENT — EXPIRING TODAY</Text>
            {todayItems.map(item => (
              <AlertCard 
                key={`tdy-${item.id}`}
                item={item}
                dotColor={theme.urgent}
                timeText="Just now"
                subtitleFormat={(i: any) => `Expires today • ${i.quantity} ${i.unit} remaining`}
              />
            ))}
          </View>
        )}

        {/* --- WARNING: WITHIN 3 DAYS --- */}
        {soonItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#6A7280' }]}>WARNING — WITHIN 3 DAYS</Text>
            {soonItems.map(item => (
              <AlertCard 
                key={`soon-${item.id}`}
                item={item}
                dotColor={theme.warning}
                timeText="1h ago"
                subtitleFormat={(i: any) => `Expires in ${i.daysLeft} days • ${i.quantity} ${i.unit} remaining`}
              />
            ))}
          </View>
        )}

        {/* --- STOCK ALERT --- */}
        {lowStockItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#6A7280' }]}>STOCK ALERT</Text>
            {lowStockItems.map(item => (
              <AlertCard 
                key={`stk-${item.id}`}
                item={item}
                dotColor={theme.stock}
                timeText="Today"
                subtitleFormat={(i: any) => `${i.quantity} ${i.unit} • below par of ${i.initialQuantity * 0.2} ${i.unit}`}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  pageTitle: {
    fontFamily: 'Mali_700Bold',
    fontSize: 28,
    color: theme.textDark,
  },
  pageSubtitle: {
    fontFamily: 'Mali_400Regular',
    fontSize: 14,
    color: theme.textLight,
  },
  markReadText: {
    fontFamily: 'Mali_400Regular',
    fontSize: 14,
    color: '#6A7280',
    marginTop: 8,
  },

  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Mali_700Bold',
    fontSize: 20,
    color: theme.textDark,
    marginBottom: 8,
  },
  emptySubText: {
    fontFamily: 'Mali_400Regular',
    fontSize: 14,
    color: theme.textLight,
  },

  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Mali_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  
  card: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Mali_700Bold',
    fontSize: 16,
    color: theme.textDark,
    marginBottom: 2,
  },
  itemDesc: {
    fontFamily: 'Mali_400Regular',
    fontSize: 13,
    color: '#6A7280',
  },
  timeText: {
    fontFamily: 'Mali_400Regular',
    fontSize: 12,
    color: theme.textLight,
  },
});