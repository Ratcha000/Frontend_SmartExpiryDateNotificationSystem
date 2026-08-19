import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator, 
  RefreshControl,
  TextInput,
  Modal
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
  inputBg: '#FFFFFF',
  
  fresh: '#10B981',      
  freshBg: '#E6F4EA',
  nearExpiry: '#D97706', 
  nearExpiryBg: '#FEF3C7',
  expired: '#DC2626',    
  expiredBg: '#FEE2E2',
  
  border: '#E8E6E1',
  danger: '#DC2626',
};

export default function InventoryScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  // 🔴 แก้ไขค่าเริ่มต้นให้ตรงกับปุ่มภาษาไทย
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด');
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State สำหรับ Modal แจ้งเตือนทั่วไป
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: null as (() => void) | null,
  });

  // State สำหรับ Modal แก้ไขจำนวนวัตถุดิบ
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const showModal = (title: string, message: string, onConfirm: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, onConfirm });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

  const expiringCount = inventory.filter(item => item.expiring && item.status !== 'DELETED').length;
  const expiredCount = inventory.filter(item => (item.expired || item.status === 'EXPIRED') && item.status !== 'DELETED').length;
  const lowStockCount = inventory.filter(item => item.quantity <= (item.initialQuantity * 0.20) && item.status !== 'DELETED').length;

  const filters = [
    { label: 'ทั้งหมด', count: null },
    { label: 'กำลังจะหมดอายุ', count: expiringCount },
    { label: 'หมดอายุ', count: expiredCount },
    { label: 'เหลือน้อย', count: lowStockCount },
  ];

  const fetchInventory = async () => {
    if (!user?.restaurantId) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await apiClient.get(`/ingredients?restaurantId=${user.restaurantId}`);
      const activeItems = res.data.filter((item: any) => item.status !== 'DELETED');
      setInventory(activeItems);
    } catch (error: any) {
      console.log('Error fetching inventory:', error?.message);
      
      if (error?.response?.status === 403) {
        showModal(
          'เซสชันหมดอายุ', 
          'การเชื่อมต่อของคุณหมดอายุแล้ว ระบบจะนำคุณออกจากระบบอัตโนมัติ กรุณาล็อกอินใหม่อีกครั้งครับ',
          () => {
            closeModal();
            logout(); 
          }
        );
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [user])
  );

  useEffect(() => {
    let result = inventory;

    // 🔴 เปลี่ยนคำเงื่อนไขการกรองให้ตรงกับปุ่มภาษาไทย
    if (activeFilter === 'กำลังจะหมดอายุ') {
      result = result.filter(item => item.expiring);
    } else if (activeFilter === 'หมดอายุ') {
      result = result.filter(item => item.expired || item.status === 'EXPIRED');
    } else if (activeFilter === 'เหลือน้อย') {
      result = result.filter(item => item.quantity <= (item.initialQuantity * 0.20));
    }

    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => 
        (item.name && item.name.toLowerCase().includes(lowerQuery)) ||
        (item.category && item.category.toLowerCase().includes(lowerQuery))
      );
    }

    setFilteredData(result);
  }, [inventory, activeFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInventory();
  }, []);

  const handleUpdateQuantity = async () => {
    if (!editingItem) return;
    
    const newQty = parseFloat(editQuantity);
    if (isNaN(newQty) || newQty < 0) {
      showModal('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกจำนวนตัวเลขที่ถูกต้อง (ห้ามติดลบครับ)');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.put(`/ingredients/${editingItem.id}`, {
        ...editingItem,
        quantity: newQty
      });
      
      setEditingItem(null);
      fetchInventory(); 
    } catch (error: any) {
      console.log('Update Error:', error?.message);
      showModal('ข้อผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง หรือเช็ค API หลังบ้านครับ');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusDisplay = (item: any) => {
    if (item.expired || item.status === 'EXPIRED') {
      return { label: 'Expired', color: theme.expired, bg: theme.expiredBg };
    }
    if (item.expiring) {
      return { label: 'Near Expiry', color: theme.nearExpiry, bg: theme.nearExpiryBg };
    }
    if (item.status === 'USED' || item.quantity <= 0) {
      return { label: 'Used Up', color: theme.textLight, bg: '#F3F4F6' };
    }
    return { label: 'Fresh', color: theme.fresh, bg: theme.freshBg };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Inventory</Text>
        <Text style={styles.pageSubtitle}>{inventory.length} items tracked</Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={theme.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients or category..."
          placeholderTextColor={theme.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {filters.map((filter, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.filterPill, activeFilter === filter.label ? styles.filterPillActive : undefined]}
              onPress={() => setActiveFilter(filter.label)}
            >
              <Text style={[styles.filterText, activeFilter === filter.label ? styles.filterTextActive : undefined]}>
                {filter.label}
              </Text>
              {filter.count !== null ? (
                <Text style={[styles.filterCount, activeFilter === filter.label ? styles.filterCountActive : undefined]}>
                  {filter.count}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
        >
          {filteredData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="box" size={48} color={theme.textLight} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>No ingredients found.</Text>
            </View>
          ) : (
            filteredData.map((item) => {
              const statusStyle = getStatusDisplay(item);
              const isLowStock = item.quantity <= (item.initialQuantity * 0.20);
              
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.card} 
                  activeOpacity={0.7}
                  onPress={() => {
                    navigation.navigate('IngredientDetail', { item: item });
                  }}
                >
                  <View style={[styles.cardAccent, { backgroundColor: statusStyle.color }]} />
                  
                  <View style={styles.cardContent}>
                    
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.categoryPill}>
                          <Text style={styles.categoryText}>{item.category || 'Uncategorized'}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusStyle.color }]} />
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDetails}>
                      <Text style={styles.quantityText}>
                        {item.quantity} <Text style={styles.unitText}>{item.unit}</Text>
                      </Text>
                      
                      <View style={styles.expiryContainer}>
                        <Feather name="calendar" size={14} color={theme.textLight} />
                        <Text style={styles.dateText}>{formatDate(item.expiryDate)}</Text>
                        <Text style={[styles.daysLeftText, { color: statusStyle.color }]}>
                          {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)}d overdue` : `${item.daysLeft} day${item.daysLeft > 1 ? 's' : ''} left`}
                        </Text>
                      </View>
                    </View>

                    {isLowStock ? (
                      <View style={styles.lowStockAlert}>
                        <Feather name="trending-down" size={14} color={theme.nearExpiry} />
                        <Text style={styles.lowStockText}>Low stock — 20% or below initial quantity</Text>
                      </View>
                    ) : null}
                  </View>
                  
                  <Feather name="edit-2" size={20} color={theme.border} style={styles.chevron} />
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AddIngredient')}
      >
        <Feather name="plus" size={32} color="#FFF" />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="alert-triangle" size={32} color={theme.danger} />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={[styles.modalButtonConfirm, { backgroundColor: theme.primary }]} 
                onPress={() => {
                  if (modalConfig.onConfirm) {
                    modalConfig.onConfirm();
                  } else {
                    closeModal();
                  }
                }}
              >
                <Text style={styles.modalButtonConfirmText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!editingItem}
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: '#F3F4F6' }]}>
              <Feather name="edit-2" size={32} color={theme.primary} />
            </View>
            <Text style={styles.modalTitle}>อัปเดตจำนวนสต็อก</Text>
            <Text style={styles.modalMessage}>คุณกำลังแก้ไข: {editingItem?.name}</Text>
            
            <View style={styles.editInputWrapper}>
              <Text style={styles.editLabel}>จำนวนที่เหลืออยู่ ({editingItem?.unit})</Text>
              <TextInput
                style={styles.editInput}
                keyboardType="numeric"
                value={editQuantity}
                onChangeText={setEditQuantity}
                autoFocus
              />
            </View>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity 
                style={[styles.modalButtonCancel, { marginRight: 12 }]} 
                onPress={() => setEditingItem(null)}
              >
                <Text style={styles.modalButtonCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButtonConfirm, { backgroundColor: theme.primary }]} 
                onPress={handleUpdateQuantity}
                disabled={isUpdating}
              >
                {isUpdating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalButtonConfirmText}>บันทึก</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    color: theme.textLight,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 16,
  },
  pageTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 28,
    color: theme.textDark,
  },
  pageSubtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    color: theme.textLight,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONT_REGULAR,
    fontSize: 15,
    color: theme.textDark,
  },

  filterWrapper: {
    height: 50,
    marginBottom: 8,
  },
  filterContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterPillActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
    color: theme.textDark,
  },
  filterTextActive: {
    color: '#FFF',
  },
  filterCount: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: theme.textLight,
    marginLeft: 6,
  },
  filterCountActive: {
    color: 'rgba(255,255,255,0.7)',
  },

  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardAccent: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemName: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: theme.textDark,
    marginBottom: 4,
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontFamily: FONT_REGULAR,
    fontSize: 11,
    color: theme.textLight,
    textTransform: 'capitalize',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: theme.textDark,
  },
  unitText: {
    fontFamily: FONT_REGULAR,
    fontSize: 13,
    color: theme.textLight,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: theme.textLight,
  },
  daysLeftText: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
  },
  lowStockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  lowStockText: {
    fontFamily: FONT_REGULAR,
    fontSize: 12,
    color: theme.nearExpiry,
  },
  chevron: {
    alignSelf: 'center',
    paddingRight: 16,
  },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: theme.primary,
    width: 64,
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 54, 35, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: theme.card,
    width: '100%',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
  },
  modalIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    color: theme.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontFamily: FONT_REGULAR,
    fontSize: 15,
    color: theme.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButtonConfirm: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: '#FFF',
  },
  modalButtonCancel: {
    flex: 1,
    height: 52,
    backgroundColor: theme.inputBg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalButtonCancelText: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    color: theme.textLight,
  },

  editInputWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  editLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 12,
    color: theme.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  editInput: {
    fontFamily: FONT_BOLD,
    backgroundColor: theme.inputBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    height: 60,
    fontSize: 24,
    color: theme.textDark,
    textAlign: 'center',
  },
});