import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client';

const theme = {
  background: '#F9F8F4',
  card: '#FFFFFF',
  primary: '#24211D',
  textLight: '#A39C93',
  textDark: '#24211D',
  border: '#E8E6E1',
  successBg: '#E6F4EA',
  successText: '#10B981',
  warningBg: '#FEF3C7',
  warningText: '#D97706',
  neutralBg: '#F3F4F6',
  neutralText: '#6B7280',
  danger: '#DC2626',
};

export default function MenuSuggestionsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔴 เพิ่ม State สำหรับเก็บข้อความ Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!user?.restaurantId) return;
    
    setIsLoading(true);
    setErrorMsg(null); // เคลียร์ Error ก่อนเริ่มโหลดใหม่
    
    try {
      // เรียก API ดึงเมนูแนะนำ
      const res = await apiClient.get(`/suggestions/ingredients/near-expiry?restaurantId=${user.restaurantId}`);
      setSuggestions(res.data);
    } catch (error: any) {
      console.log('Error fetching AI suggestions:', error?.response?.data || error.message);
      // 🔴 ดักจับและแสดง Error
      setErrorMsg(
        error?.response?.data?.message || 
        'ระบบ AI ไม่สามารถตอบสนองได้ในขณะนี้ อาจเกิดจากการเชื่อมต่อเซิร์ฟเวอร์ขัดข้องหรือรันนานเกินไป'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSuggestions();
    }, [user])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ไอเดียเมนูจาก AI</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.banner}>
          <Feather name="zap" size={20} color={theme.successText} style={{ marginTop: 2 }} />
          <Text style={styles.bannerText}>
            ไอเดียเมนูที่สร้างโดย AI จากวัตถุดิบใกล้หมดอายุของคุณ ช่วยลดขยะอาหารและวางแผนได้ชาญฉลาดขึ้น
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>AI กำลังคิดค้นเมนูสุดพิเศษให้คุณ...</Text>
            <Text style={styles.loadingSubText}>(อาจใช้เวลาสักครู่)</Text>
          </View>
        ) : errorMsg ? (
          // 🔴 กรณีมี Error จาก Backend
          <View style={styles.emptyContainer}>
            <Feather name="alert-circle" size={48} color={theme.danger} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>เกิดข้อผิดพลาด</Text>
            <Text style={[styles.emptySubText, { textAlign: 'center', marginHorizontal: 20 }]}>{errorMsg}</Text>
            
            <TouchableOpacity style={styles.retryBtn} onPress={fetchSuggestions}>
              <Feather name="refresh-cw" size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.retryBtnText}>ลองใหม่อีกครั้ง</Text>
            </TouchableOpacity>
          </View>
        ) : suggestions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="smile" size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>ไม่มีวัตถุดิบใกล้หมดอายุ</Text>
            <Text style={styles.emptySubText}>เยี่ยมมาก! คลังของคุณสดใหม่สุดๆ</Text>
          </View>
        ) : (
          suggestions.map((item, index) => (
            <View key={index} style={styles.ingredientGroup}>
              <View style={styles.groupHeader}>
                <View style={styles.groupDot} />
                <Text style={styles.groupTitle}>ใช้ {item.ingredientName} เป็นหลัก</Text>
              </View>

              {item.menus && item.menus.map((menu: any, mIdx: number) => (
                <View key={mIdx} style={styles.menuCard}>
                  
                  <View style={styles.menuHeader}>
                    <Text style={styles.menuName}>{menu.menuName}</Text>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>แนะนำ</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionLabel}>วัตถุดิบที่มี (IN STOCK)</Text>
                  <View style={styles.tagContainer}>
                    {menu.ingredientsInStock && menu.ingredientsInStock.map((ing: string, iIdx: number) => (
                      <View key={iIdx} style={[styles.tag, { backgroundColor: theme.successBg }]}>
                        <Feather name="check" size={12} color={theme.successText} style={{ marginRight: 4 }} />
                        <Text style={[styles.tagText, { color: theme.successText }]}>{ing}</Text>
                      </View>
                    ))}
                  </View>

                  {menu.missingIngredients && menu.missingIngredients.length > 0 ? (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionLabel}>ต้องซื้อเพิ่ม (NEED TO BUY)</Text>
                      <View style={styles.tagContainer}>
                        {menu.missingIngredients.map((ing: string, missingIdx: number) => (
                          <View key={missingIdx} style={[styles.tag, { backgroundColor: theme.neutralBg }]}>
                            <Text style={[styles.tagText, { color: theme.neutralText }]}>{ing}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.stepsBox}>
                    <Text style={styles.stepsTitle}>วิธีทำเบื้องต้น</Text>
                    <Text style={styles.stepsText}>{menu.steps ? menu.steps.join(' ') : 'ไม่มีข้อมูลวิธีทำ'}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerTitle: { fontFamily: 'Mali_700Bold', fontSize: 20, color: theme.textDark },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  banner: { flexDirection: 'row', backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#DCFCE7' },
  bannerText: { flex: 1, fontFamily: 'Mali_400Regular', fontSize: 13, color: '#166534', marginLeft: 12, lineHeight: 20 },
  
  loadingContainer: { marginTop: 60, alignItems: 'center' },
  loadingText: { fontFamily: 'Mali_700Bold', fontSize: 16, color: theme.textDark, marginTop: 16 },
  loadingSubText: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight, marginTop: 4 },
  
  emptyContainer: { marginTop: 60, alignItems: 'center' },
  emptyText: { fontFamily: 'Mali_700Bold', fontSize: 18, color: theme.textDark },
  emptySubText: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight, marginTop: 4 },
  
  // 🔴 สไตล์สำหรับปุ่มลองใหม่
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 99, marginTop: 24 },
  retryBtnText: { fontFamily: 'Mali_700Bold', fontSize: 14, color: '#FFF' },

  ingredientGroup: { marginBottom: 32 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  groupDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.warningText, marginRight: 8 },
  groupTitle: { fontFamily: 'Mali_700Bold', fontSize: 13, color: theme.textLight, letterSpacing: 1, textTransform: 'uppercase' },
  menuCard: { backgroundColor: theme.card, borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 3 },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  menuName: { flex: 1, fontFamily: 'Mali_700Bold', fontSize: 18, color: theme.textDark, marginRight: 12 },
  timeBadge: { backgroundColor: theme.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timeText: { fontFamily: 'Mali_700Bold', fontSize: 11, color: theme.successText },
  sectionLabel: { fontFamily: 'Mali_700Bold', fontSize: 11, color: theme.textLight, letterSpacing: 1, marginBottom: 8 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontFamily: 'Mali_700Bold', fontSize: 12 },
  stepsBox: { backgroundColor: theme.background, borderRadius: 16, padding: 16, marginTop: 20 },
  stepsTitle: { fontFamily: 'Mali_700Bold', fontSize: 12, color: theme.textLight, marginBottom: 6 },
  stepsText: { fontFamily: 'Mali_400Regular', fontSize: 13, color: theme.textDark, lineHeight: 22 },
});