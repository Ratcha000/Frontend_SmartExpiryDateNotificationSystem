import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
// 🔴 นำเข้า authApi หรือ apiClient ของคุณที่ใช้ยิงไปหา Backend
import { authApi } from '../../../api/auth'; 
import apiClient from '../../../api/client'; // (ปรับ Path ให้ตรงกับไฟล์ API ของคุณนะครับ)

const Tab = createBottomTabNavigator();

const theme = {
  background: '#F5F3E9',
  card: '#FFFFFF',
  primary: '#4A3623',
  textLight: '#8D867E',
  textDark: '#382512',
  danger: '#D9534F',
  inputBg: '#EBE7E0'
};

// ---------------- 1. หน้า Home (โครงร่าง) ----------------
const HomeScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.title}>Home Screen</Text>
    <Text style={styles.subtitle}>(รอใส่กราฟและเมนู Quick Actions)</Text>
  </View>
);

// ---------------- 2. หน้า Inventory (โครงร่าง) ----------------
const InventoryScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.title}>Inventory</Text>
  </View>
);

// ---------------- 3. หน้า Alerts (โครงร่าง) ----------------
const AlertsScreen = () => (
  <View style={styles.centerContainer}>
    <Text style={styles.title}>Alerts</Text>
  </View>
);

// ---------------- 4. หน้า Team (เชื่อม API จริง) ----------------
const TeamScreen = () => {
  const { user, logout } = useAuth();
  const isManager = user?.role === 'MANAGER';

  // State เก็บข้อมูลจริงจาก Database
  const [restaurant, setRestaurant] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ฟังก์ชันดึงข้อมูลเมื่อเปิดหน้านี้
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setIsLoading(true);
        // 1. ดึงข้อมูลร้านของตัวเอง
        const resRest = await apiClient.get('/restaurants/me');
        const currentRestaurant = resRest.data;
        setRestaurant(currentRestaurant);

        // 2. ดึงรายชื่อสมาชิกในร้าน
        if (currentRestaurant?.id) {
          const resMembers = await apiClient.get(`/restaurants/${currentRestaurant.id}/members`);
          setMembers(resMembers.data);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, []);

  // ฟังก์ชันสร้างตัวย่อชื่ออัตโนมัติ (เช่น Marco Ricci -> MR)
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  // แสดงตัวโหลดระหว่างรอข้อมูล
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ส่วนหัว */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Team</Text>
          {/* แสดงชื่อร้านจริง */}
          <Text style={styles.pageSubtitle}>{restaurant?.name || 'No Restaurant'}</Text>
        </View>
        <TouchableOpacity style={styles.profileIcon}>
          <Feather name="user" size={24} color={theme.card} />
        </TouchableOpacity>
      </View>

      {/* สถิติร้าน */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          {/* แสดงจำนวนสมาชิกจริง */}
          <Text style={styles.statNumber}>{members.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Items Tracked</Text>
        </View>
      </View>

      {/* 🔴 เงื่อนไข: ถ้าเป็น Manager จะเห็นรหัสเชิญของร้าน */}
      {isManager && restaurant?.inviteCode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEAM INVITE CODE</Text>
          <View style={styles.inviteCard}>
            <View>
              {/* แสดง Invite Code จริง */}
              <Text style={styles.inviteCode}>{restaurant.inviteCode}</Text>
              <Text style={styles.inviteDesc}>Share this code with new team members</Text>
            </View>
            <TouchableOpacity style={styles.copyButton}>
              <Feather name="copy" size={20} color={theme.textDark} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* รายชื่อสมาชิก */}
      <View style={[styles.section, { flex: 1 }]}>
        <View style={styles.memberHeader}>
          <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>
          {isManager && (
            <TouchableOpacity>
              <Text style={styles.inviteLink}>+ Invite</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.avatar}>
                {/* ดึงชื่อมาแปลงเป็นตัวย่อ */}
                <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.displayName}</Text>
                <Text style={styles.memberRoleBadge}>
                  {item.role.charAt(0).toUpperCase() + item.role.slice(1).toLowerCase()}
                </Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* ปุ่ม Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
};

// ---------------- Component หลัก (Bottom Tabs) ----------------
export default function MainDashboard() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Inventory') iconName = 'box';
          else if (route.name === 'Alerts') iconName = 'bell';
          else if (route.name === 'Team') iconName = 'users';
          
          return <Feather name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textLight,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Mali_700Bold',
          fontSize: 11,
          marginTop: 4,
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Team" component={TeamScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  container: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { fontFamily: 'Mali_700Bold', fontSize: 24, color: theme.textDark },
  subtitle: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight, marginTop: 8 },
  
  // สไตล์หน้า Team
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontFamily: 'Mali_700Bold', fontSize: 28, color: theme.textDark },
  pageSubtitle: { fontFamily: 'Mali_400Regular', fontSize: 16, color: theme.textLight },
  profileIcon: { backgroundColor: theme.textDark, padding: 12, borderRadius: 16 },
  
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: theme.card, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statNumber: { fontFamily: 'Mali_700Bold', fontSize: 20, color: theme.textDark },
  statLabel: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight, marginTop: 4 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Mali_700Bold', fontSize: 11, color: theme.textLight, letterSpacing: 1, marginBottom: 12 },
  
  inviteCard: { flexDirection: 'row', backgroundColor: theme.card, padding: 20, borderRadius: 20, justifyContent: 'space-between', alignItems: 'center' },
  inviteCode: { fontFamily: 'Mali_700Bold', fontSize: 22, letterSpacing: 2, color: theme.textDark },
  inviteDesc: { fontFamily: 'Mali_400Regular', fontSize: 13, color: theme.textLight, marginTop: 4 },
  copyButton: { backgroundColor: theme.inputBg, padding: 12, borderRadius: 12 },
  
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inviteLink: { fontFamily: 'Mali_700Bold', fontSize: 14, color: '#3B82F6' },
  
  memberCard: { flexDirection: 'row', backgroundColor: theme.card, padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.textDark, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontFamily: 'Mali_700Bold', color: '#FFF', fontSize: 16 },
  memberInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberName: { fontFamily: 'Mali_700Bold', fontSize: 16, color: theme.textDark },
  memberRoleBadge: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight, backgroundColor: theme.inputBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  
  logoutButton: { backgroundColor: theme.danger, padding: 16, borderRadius: 99, alignItems: 'center', marginBottom: 20 },
  logoutButtonText: { fontFamily: 'Mali_700Bold', color: '#FFF', fontSize: 16 },
});