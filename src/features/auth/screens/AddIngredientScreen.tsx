import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
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
  inputBg: '#FFFFFF',
  border: '#E8E6E1',
  danger: '#DC2626',
  success: '#10B981',
};

const CATEGORY_MAP: Record<string, string[]> = {
  'ผักและผลไม้': ['กิโลกรัม', 'กรัม', 'กำ', 'ต้น', 'หัว', 'แพ็ค'],
  'เนื้อสัตว์': ['กิโลกรัม', 'กรัม', 'ชิ้น', 'แพ็ค'],
  'อาหารทะเล': ['กิโลกรัม', 'กรัม', 'ตัว', 'แพ็ค'],
  'นมและไข่': ['ฟอง', 'แผง', 'ลิตร', 'มิลลิลิตร', 'ขวด', 'แกลลอน'],
  'เครื่องปรุง': ['ขวด', 'ถุง', 'ลิตร', 'มิลลิลิตร', 'ช้อนโต๊ะ', 'กรัม'],
  'ของแห้ง': ['ถุง', 'แพ็ค', 'กิโลกรัม', 'กรัม', 'กระสอบ'],
  'เครื่องดื่ม': ['ขวด', 'กระป๋อง', 'ลิตร', 'แพ็ค', 'ลัง'],
  'อื่นๆ': ['ชิ้น', 'แพ็ค', 'กล่อง', 'กิโลกรัม', 'กรัม']
};

const CATEGORIES = Object.keys(CATEGORY_MAP);

export default function AddIngredientScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [addMode, setAddMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');
  const [name, setName] = useState('');
  const [lotName, setLotName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(CATEGORY_MAP[CATEGORIES[0]][0]);
  const [customUnit, setCustomUnit] = useState(''); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [notifyDaysBefore, setNotifyDaysBefore] = useState('2');
  const [storageLocation, setStorageLocation] = useState('');
  const [parts, setParts] = useState([{ partName: '', quantity: '' }]);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'error' as 'error' | 'success',
    title: '',
    message: '',
  });

  const showModal = (type: 'error' | 'success', title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const suggestedUnits = CATEGORY_MAP[category];
    setUnit(suggestedUnits[0]);
    setIsCustomUnit(false);
    setCustomUnit('');
    setIsDropdownOpen(false);
  }, [category]);

  const handleAddPart = () => {
    setParts([...parts, { partName: '', quantity: '' }]);
  };

  const handleRemovePart = (index: number) => {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
  };

  const handlePartChange = (index: number, field: 'partName' | 'quantity', value: string) => {
    const newParts = [...parts];
    newParts[index][field] = value;
    setParts(newParts);
  };

  const handleSave = async () => {
    if (!user?.restaurantId) return showModal('error', 'ข้อผิดพลาด', 'ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');
    
    if (addMode === 'SINGLE' && (!name || !quantity)) return showModal('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อวัตถุดิบและปริมาณให้ครบ');
    if (addMode === 'BATCH' && (!lotName || parts.some(p => !p.partName || !p.quantity))) return showModal('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อ Lot และชิ้นส่วนให้ครบ');
    if (!expiryDate) return showModal('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกวันหมดอายุ (YYYY-MM-DD)');
    if (isCustomUnit && !customUnit.trim()) return showModal('error', 'ข้อผิดพลาด', 'กรุณาระบุหน่วยที่กำหนดเอง');

    const finalUnit = isCustomUnit ? customUnit.trim() : unit;

    setIsLoading(true);
    try {
      if (addMode === 'SINGLE') {
        const payload = {
          restaurantId: user.restaurantId,
          name,
          category: category, 
          initialQuantity: parseFloat(quantity),
          quantity: parseFloat(quantity),
          unit: finalUnit,
          categoryUnitHint: finalUnit,
          expiryDate,
          notifyDaysBefore: parseInt(notifyDaysBefore, 10),
        };
        await apiClient.post('/ingredients', payload);
      } else {
        const items = parts.map(p => ({
          partName: p.partName,
          initialQuantity: parseFloat(p.quantity),
          quantity: parseFloat(p.quantity),
        }));
        
        const payload = {
          restaurantId: user.restaurantId,
          lotName,
          category: category,
          unit: finalUnit,
          categoryUnitHint: finalUnit,
          expiryDate,
          notifyDaysBefore: parseInt(notifyDaysBefore, 10),
          items,
        };
        await apiClient.post('/ingredients/batch', payload);
      }
      navigation.goBack();
    } catch (error: any) {
      showModal('error', 'บันทึกล้มเหลว', error?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const isError = modalConfig.type === 'error';
  const modalIconName = isError ? 'x-circle' : 'check-circle';
  const modalIconColor = isError ? theme.danger : theme.success;
  const modalIconBgColor = isError ? '#FEF2F2' : '#D1FAE5';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={theme.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Ingredient</Text>
        <View style={{ width: 36 }}></View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity style={[styles.modeButton, addMode === 'SINGLE' ? styles.modeButtonActive : undefined]} onPress={() => setAddMode('SINGLE')}>
            <Text style={[styles.modeButtonText, addMode === 'SINGLE' ? styles.modeButtonTextActive : undefined]}>Single Item</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeButton, addMode === 'BATCH' ? styles.modeButtonActive : undefined]} onPress={() => setAddMode('BATCH')}>
            <Text style={[styles.modeButtonText, addMode === 'BATCH' ? styles.modeButtonTextActive : undefined]}>Batch (Split Parts)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{addMode === 'SINGLE' ? 'INGREDIENT NAME' : 'LOT NAME'}</Text>
          <TextInput
            style={styles.input}
            placeholder={addMode === 'SINGLE' ? "e.g. แซลมอนนอร์เวย์" : "e.g. เนื้อหมูยกแผง"}
            placeholderTextColor={theme.textLight}
            value={addMode === 'SINGLE' ? name : lotName}
            onChangeText={addMode === 'SINGLE' ? setName : setLotName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.categoryPill, category === cat ? styles.categoryPillActive : undefined]} onPress={() => setCategory(cat)}>
                <Text style={[styles.categoryText, category === cat ? styles.categoryTextActive : undefined]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.rowGroup, { zIndex: 1000 }]}>
          {addMode === 'SINGLE' ? (
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>QUANTITY</Text>
              <TextInput style={styles.input} placeholder="0.0" placeholderTextColor={theme.textLight} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
            </View>
          ) : null}

          <View style={[styles.inputGroup, { flex: addMode === 'SINGLE' ? 1.5 : 1, zIndex: 1000 }]}>
            <Text style={styles.label}>UNIT</Text>
            <View style={{ position: 'relative', zIndex: 1000 }}>
              <TouchableOpacity style={[styles.dropdownHeader, isDropdownOpen ? styles.dropdownHeaderActive : undefined]} onPress={() => setIsDropdownOpen(!isDropdownOpen)} activeOpacity={0.7}>
                <Text style={[styles.dropdownHeaderText, (!unit && !isCustomUnit) ? { color: theme.textLight } : undefined]}>
                  {isCustomUnit ? 'กำหนดเอง' : (unit || 'เลือกหน่วย')}
                </Text>
                <Feather name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.textLight} />
              </TouchableOpacity>

              {isDropdownOpen ? (
                <View style={styles.dropdownListAbsolute}>
                  {CATEGORY_MAP[category].map((u) => (
                    <TouchableOpacity key={u} style={styles.dropdownItem} onPress={() => { setUnit(u); setIsCustomUnit(false); setIsDropdownOpen(false); }}>
                      <Text style={[styles.dropdownItemText, unit === u && !isCustomUnit ? styles.dropdownItemTextActive : undefined]}>{u}</Text>
                      {unit === u && !isCustomUnit ? (<Feather name="check" size={16} color={theme.primary} />) : null}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.dropdownItem, { borderBottomWidth: 0 }]} onPress={() => { setIsCustomUnit(true); setUnit(''); setIsDropdownOpen(false); }}>
                    <Text style={[styles.dropdownItemText, isCustomUnit ? styles.dropdownItemTextActive : undefined]}>กำหนดเอง</Text>
                    {isCustomUnit ? (<Feather name="check" size={16} color={theme.primary} />) : null}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {isCustomUnit ? (
              <TextInput style={[styles.input, { height: 44, marginTop: 8 }]} placeholder="ระบุหน่วย..." placeholderTextColor={theme.textLight} value={customUnit} onChangeText={setCustomUnit} autoFocus />
            ) : null}
          </View>
        </View>

        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>EXPIRY DATE (YYYY-MM-DD)</Text>
          <View style={styles.inputWithIconContainer}>
            <TextInput style={[styles.input, { flex: 1, paddingRight: 50 }]} placeholder="2026-08-09" placeholderTextColor={theme.textLight} value={expiryDate} onChangeText={setExpiryDate} />
            <TouchableOpacity style={styles.cameraButton}>
              <Feather name="camera" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.ocrHint}>
            <Feather name="camera" size={12} color={theme.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.ocrHintText}>Tap the camera to scan expiry date with OCR</Text>
          </View>
        </View>

        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>STORAGE LOCATION</Text>
          <TextInput style={styles.input} placeholder="Walk-in Fridge A" placeholderTextColor={theme.textLight} value={storageLocation} onChangeText={setStorageLocation} />
        </View>

        <View style={[styles.rowGroup, { zIndex: 1 }]}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>PAR LEVEL</Text>
            <TextInput style={[styles.input, { backgroundColor: '#F3F4F6', color: theme.textLight }]} placeholder="0" placeholderTextColor={theme.textLight} editable={false} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>NOTIFY (DAYS BEFORE)</Text>
            <TextInput style={styles.input} placeholder="2" placeholderTextColor={theme.textLight} keyboardType="numeric" value={notifyDaysBefore} onChangeText={setNotifyDaysBefore} />
          </View>
        </View>

        {addMode === 'BATCH' ? (
          <View style={styles.partsSection}>
            <Text style={styles.label}>PARTS (ชิ้นส่วนที่แยก)</Text>
            {parts.map((part, index) => (
              <View key={index} style={styles.partRow}>
                <TextInput style={[styles.input, { flex: 2, marginRight: 10 }]} placeholder="e.g. สันคอ" placeholderTextColor={theme.textLight} value={part.partName} onChangeText={(val) => handlePartChange(index, 'partName', val)} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Qty" placeholderTextColor={theme.textLight} keyboardType="numeric" value={part.quantity} onChangeText={(val) => handlePartChange(index, 'quantity', val)} />
                {parts.length > 1 ? (
                  <TouchableOpacity onPress={() => handleRemovePart(index)} style={styles.removePartBtn}>
                    <Feather name="trash-2" size={20} color={theme.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity style={styles.addPartBtn} onPress={handleAddPart}>
              <Feather name="plus" size={16} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={styles.addPartBtnText}>Add Another Part</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={{ height: 40 }}></View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.mainSaveButton} onPress={handleSave} disabled={isLoading}>
          {isLoading ? (<ActivityIndicator color="#FFF" />) : (<Text style={styles.mainSaveButtonText}>Save Ingredient</Text>)}
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent={true} visible={modalConfig.visible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconBg, { backgroundColor: modalIconBgColor }]}>
              <Feather name={modalIconName} size={32} color={modalIconColor} />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={[styles.modalButtonConfirm, { backgroundColor: theme.primary }]} onPress={closeModal}>
                <Text style={styles.modalButtonConfirmText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20 },
  backButton: { padding: 4 },
  headerTitle: { fontFamily: 'Mali_700Bold', fontSize: 20, color: theme.textDark },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#E8E6E1', borderRadius: 99, padding: 4, marginBottom: 24 },
  modeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 99 },
  modeButtonActive: { backgroundColor: theme.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  modeButtonText: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight },
  modeButtonTextActive: { fontFamily: 'Mali_700Bold', color: theme.textDark },
  inputGroup: { marginBottom: 20 },
  rowGroup: { flexDirection: 'row', gap: 16 },
  label: { fontFamily: 'Mali_700Bold', fontSize: 11, color: theme.textLight, marginBottom: 8, letterSpacing: 1 },
  input: { fontFamily: 'Mali_400Regular', backgroundColor: theme.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 54, fontSize: 15, color: theme.textDark, borderWidth: 1, borderColor: theme.border },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryPill: { backgroundColor: theme.inputBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
  categoryPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight },
  categoryTextActive: { fontFamily: 'Mali_700Bold', color: '#FFF' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 54, borderWidth: 1, borderColor: theme.border },
  dropdownHeaderActive: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  dropdownHeaderText: { fontFamily: 'Mali_400Regular', fontSize: 15, color: theme.textDark },
  dropdownListAbsolute: { position: 'absolute', top: 54, left: 0, right: 0, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderTopWidth: 0, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, zIndex: 9999, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontFamily: 'Mali_400Regular', fontSize: 14, color: theme.textLight },
  dropdownItemTextActive: { fontFamily: 'Mali_700Bold', color: theme.primary },
  inputWithIconContainer: { position: 'relative', justifyContent: 'center' },
  cameraButton: { position: 'absolute', right: 8, backgroundColor: theme.primary, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  ocrHint: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 },
  ocrHintText: { fontFamily: 'Mali_400Regular', fontSize: 12, color: theme.textLight },
  partsSection: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 20, marginBottom: 20 },
  partRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  removePartBtn: { padding: 10, marginLeft: 4 },
  addPartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  addPartBtnText: { fontFamily: 'Mali_700Bold', fontSize: 14, color: theme.primary },
  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 10, backgroundColor: theme.background },
  mainSaveButton: { backgroundColor: theme.primary, height: 56, borderRadius: 99, justifyContent: 'center', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  mainSaveButtonText: { fontFamily: 'Mali_700Bold', color: '#FFFFFF', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(74, 54, 35, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { backgroundColor: theme.card, width: '100%', borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Mali_700Bold', fontSize: 22, color: theme.textDark, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontFamily: 'Mali_400Regular', fontSize: 15, color: theme.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtonGroup: { flexDirection: 'row', width: '100%' },
  modalButtonConfirm: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalButtonConfirmText: { fontFamily: 'Mali_700Bold', fontSize: 15, color: '#FFF' }
});