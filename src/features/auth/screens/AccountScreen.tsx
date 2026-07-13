import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { restaurantsApi } from '../../../api/restaurants';
import { useAuth } from '../../../context/AuthContext';
import { Restaurant } from '../../../types';
import { colors, shadows } from '../../../theme/colors';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!user?.restaurantId) {
        setRestaurant(null);
        return;
      }

      try {
        setIsLoadingRestaurant(true);
        const response = await restaurantsApi.getDetails(user.restaurantId);
        setRestaurant(response);
      } catch (error) {
        console.warn('Failed to load restaurant details:', error);
        setRestaurant(null);
      } finally {
        setIsLoadingRestaurant(false);
      }
    };

    fetchRestaurant();
  }, [user?.restaurantId]);

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Account overview</Text>
        <Text style={styles.heroTitle}>Professional profile and restaurant access.</Text>
        <Text style={styles.heroSubtitle}>
          ข้อมูลด้านล่างดึงจาก session ปัจจุบันและ API อ่านข้อมูลที่ backend ทำเสร็จแล้ว
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Display name</Text>
          <Text style={styles.value}>{user?.displayName ?? '-'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '-'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user?.role ?? '-'}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.label}>Restaurant ID</Text>
          <Text style={styles.value}>{user?.restaurantId ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Restaurant</Text>
        {isLoadingRestaurant ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Loading restaurant details</Text>
          </View>
        ) : restaurant ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{restaurant.name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Invite code</Text>
              <Text style={styles.codeValue}>{restaurant.inviteCode}</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <Text style={styles.label}>Restaurant ID</Text>
              <Text style={styles.value}>{restaurant.id}</Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No restaurant data</Text>
            <Text style={styles.emptyText}>
              ยังไม่พบข้อมูลร้าน หรือบัญชีนี้ยังไม่ได้เชื่อมกับร้านอาหาร
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>ออกจากระบบ</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: colors.background,
    gap: 18,
  },
  hero: {
    gap: 8,
    marginBottom: 4,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    color: colors.accentStrong,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSoft,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  roleText: {
    color: colors.accentStrong,
    fontSize: 13,
    fontWeight: '700',
  },
  codeValue: {
    fontSize: 18,
    color: colors.accentStrong,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyState: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  logoutButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
