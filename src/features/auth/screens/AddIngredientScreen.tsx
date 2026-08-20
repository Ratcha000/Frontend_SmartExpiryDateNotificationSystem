import React, { useState, useEffect, useMemo } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker'; // 🔴 นำเข้า DatePicker
import { useAuth } from '../../../context/AuthContext';
import apiClient from '../../../api/client';
import { FONT_REGULAR, FONT_BOLD } from '../../../theme/fonts';
import IngredientPicker from './components/IngredientPicker';
import PartDropdown from './components/PartDropdown';
import { getIngredientType, INGREDIENT_TYPES, OTHER_KEY } from './components/ingredientCatalog';

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
  successBg: '#E6F4EA',
};

// อัปเดต CATEGORY_MAP เพื่อแนบจำนวนวันหมดอายุที่แนะนำ (addDays)
const CATEGORY_MAP: Record<string, { units: string[], addDays: number }> = {
  'ผักและผลไม้': { units: ['กิโลกรัม', 'กรัม', 'กำ', 'ต้น', 'หัว', 'แพ็ค'], addDays: 5 },
  'เนื้อสัตว์': { units: ['กิโลกรัม', 'กรัม', 'ชิ้น', 'แพ็ค'], addDays: 3 },
  'อาหารทะเล': { units: ['กิโลกรัม', 'กรัม', 'ตัว', 'แพ็ค'], addDays: 2 },
  'นมและไข่': { units: ['ฟอง', 'แผง', 'ลิตร', 'มิลลิลิตร', 'ขวด', 'แกลลอน'], addDays: 7 },
  'เครื่องปรุง': { units: ['ขวด', 'ถุง', 'ลิตร', 'มิลลิลิตร', 'ช้อนโต๊ะ', 'กรัม'], addDays: 365 },
  'ของแห้ง': { units: ['ถุง', 'แพ็ค', 'กิโลกรัม', 'กรัม', 'กระสอบ'], addDays: 180 },
  'เครื่องดื่ม': { units: ['ขวด', 'กระป๋อง', 'ลิตร', 'แพ็ค', 'ลัง'], addDays: 180 },
  'อื่นๆ': { units: ['ชิ้น', 'แพ็ค', 'กล่อง', 'กิโลกรัม', 'กรัม'], addDays: 7 }
};

const CATEGORIES = Object.keys(CATEGORY_MAP);
const STORAGE_LOCATIONS = ['Walk-in Fridge', 'Freezer A', 'Freezer B', 'Dry Pantry', 'Countertop'];
const NOTIFY_DAYS = ['1', '2', '3', '5', '7'];

export default function AddIngredientScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [addMode, setAddMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');

  // ประเภทวัตถุดิบที่เลือกจากวงกลม (แทนช่องหมวดหมู่เดิม)
  const [typeKey, setTypeKey] = useState(INGREDIENT_TYPES[0].key);
  const selectedType = getIngredientType(typeKey);
  const isOther = typeKey === OTHER_KEY;

  // กรณีเลือก "อื่นๆ" ผู้ใช้กรอกชื่อและเลือกหมวดหมู่เอง
  const [otherCategory, setOtherCategory] = useState(CATEGORIES[0]);
  const [customName, setCustomName] = useState('');

  const category = isOther ? otherCategory : selectedType.category;

  // ชิ้นส่วน/ชนิด สำหรับโหมด Single
  const [part, setPart] = useState('');
  // ชื่อที่ผู้ใช้แก้เอง (null = ใช้ชื่อที่ระบบประกอบให้)
  const [nameOverride, setNameOverride] = useState<string | null>(null);

  const [lotName, setLotName] = useState(INGREDIENT_TYPES[0].label);
  const [lotNameTouched, setLotNameTouched] = useState(false);

  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(CATEGORY_MAP[INGREDIENT_TYPES[0].category].units[0]);

  // State วันหมดอายุ
  const [expiryDate, setExpiryDate] = useState('');
  const [isManualExpiry, setIsManualExpiry] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState('');

  // 🔴 State สำหรับเปิด/ปิด ปฏิทิน
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [notifyDaysBefore, setNotifyDaysBefore] = useState(NOTIFY_DAYS[1]);
  const [storageLocation, setStorageLocation] = useState(STORAGE_LOCATIONS[0]);
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

  // ชื่อวัตถุดิบที่จะส่งขึ้น backend (โหมด Single)
  const composedName = isOther
    ? customName.trim()
    : part.trim()
    ? `${selectedType.label} - ${part.trim()}`
    : selectedType.label;
  const finalName = nameOverride !== null ? nameOverride.trim() : composedName;

  // คำนวณวันหมดอายุแนะนำ
  const calculateSuggestedDate = (daysToAdd: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    const catInfo = CATEGORY_MAP[category];
    setUnit(catInfo.units[0]);

    // คำนวณวันหมดอายุใหม่เมื่อเปลี่ยนหมวดหมู่
    const newSuggestedDate = calculateSuggestedDate(catInfo.addDays);
    setSuggestedDate(newSuggestedDate);

    // ถ้าผู้ใช้ยังไม่เคยจิ้มเลือกปฏิทินเอง ให้ระบบเปลี่ยนให้เลย
    if (!isManualExpiry) {
      setExpiryDate(newSuggestedDate);
    }
  }, [category]);

  /** เลือกวงกลมวัตถุดิบ */
  const handleSelectType = (type: typeof INGREDIENT_TYPES[number]) => {
    setTypeKey(type.key);
    setPart('');
    setNameOverride(null);
    setParts([{ partName: '', quantity: '' }]);
    // เติมชื่อล็อตให้อัตโนมัติ ถ้าผู้ใช้ยังไม่ได้พิมพ์เอง
    if (!lotNameTouched) {
      setLotName(type.key === OTHER_KEY ? '' : type.label);
    }
  };

  // 🔴 ฟังก์ชันจัดการเมื่อเลือกวันที่จากปฏิทินเสร็จ
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false); // ปิดปฏิทิน
    if (selectedDate) {
      setExpiryDate(selectedDate.toISOString().split('T')[0]);
      setIsManualExpiry(true); // รู้ว่าผู้ใช้ตั้งใจเลือกเองแล้ว
    }
  };

  // ฟังก์ชันเวลากดป้ายแนะนำให้ดึงค่าแนะนำมาใช้ทันที
  const applySuggestedDate = () => {
    setExpiryDate(suggestedDate);
    setIsManualExpiry(false);
  };

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

  // ชิ้นส่วนที่ยังไม่ถูกเลือกในแถวอื่น (กันเพิ่มซ้ำ)
  const availableParts = useMemo(
    () =>
      parts.map((_, index) =>
        selectedType.parts.filter(
          (option) => !parts.some((p, i) => i !== index && p.partName === option)
        )
      ),
    [parts, selectedType]
  );

  const handleSave = async () => {
    if (!user?.restaurantId) return showModal('error', 'ข้อผิดพลาด', 'ไม่พบข้อมูลร้านค้า กรุณาล็อกอินใหม่');

    if (addMode === 'SINGLE') {
      if (!finalName) return showModal('error', 'ข้อมูลไม่ครบ', 'กรุณาระบุชื่อวัตถุดิบ');
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) return showModal('error', 'ข้อมูลไม่ถูกต้อง', 'กรุณากรอกจำนวนที่มากกว่า 0');
    } else {
      if (!lotName.trim()) return showModal('error', 'ข้อมูลไม่ครบ', 'กรุณาระบุชื่อล็อตวัตถุดิบ');
      const hasInvalidPart = parts.some(
        (p) => !p.partName.trim() || isNaN(parseFloat(p.quantity)) || parseFloat(p.quantity) <= 0
      );
      if (hasInvalidPart) {
        return showModal('error', 'ข้อมูลไม่ครบ', `กรุณาเลือก${selectedType.partLabel}และกรอกจำนวนที่มากกว่า 0 ให้ครบทุกแถว`);
      }
    }

    if (!expiryDate) return showModal('error', 'ข้อมูลไม่ครบ', 'กรุณากรอกวันหมดอายุ (YYYY-MM-DD)');
    if (!unit.trim()) return showModal('error', 'ข้อผิดพลาด', 'กรุณาระบุหน่วย');

    const finalUnit = unit.trim();

    setIsLoading(true);
    try {
      if (addMode === 'SINGLE') {
        const payload = {
          restaurantId: user.restaurantId,
          name: finalName,
          category: category,
          initialQuantity: parseFloat(quantity),
          quantity: parseFloat(quantity),
          unit: finalUnit,
          categoryUnitHint: finalUnit,
          expiryDate,
          notifyDaysBefore: parseInt(notifyDaysBefore, 10),
          storageLocation
        };
        await apiClient.post('/ingredients', payload);
      } else {
        const items = parts.map(p => ({
          partName: p.partName.trim(),
          initialQuantity: parseFloat(p.quantity),
          quantity: parseFloat(p.quantity),
        }));

        const payload = {
          restaurantId: user.restaurantId,
          lotName: lotName.trim(),
          category: category,
          unit: finalUnit,
          categoryUnitHint: finalUnit,
          expiryDate,
          notifyDaysBefore: parseInt(notifyDaysBefore, 10),
          storageLocation,
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

        {/* วงกลมเลือกวัตถุดิบ แทนช่องหมวดหมู่เดิม */}
        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>เลือกวัตถุดิบ</Text>
          <IngredientPicker
            selectedKey={typeKey}
            onSelect={handleSelectType}
            edgePadding={24}
            theme={theme}
          />
        </View>

        {/* เลือก "อื่นๆ" -> ต้องระบุหมวดหมู่เอง เพื่อให้ backend ยังกรองหมวดได้ */}
        {isOther ? (
          <View style={[styles.inputGroup, { zIndex: 1 }]}>
            <Text style={styles.label}>หมวดหมู่</Text>
            <View style={styles.categoryContainer}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, otherCategory === cat ? styles.categoryPillActive : undefined]}
                  onPress={() => setOtherCategory(cat)}
                >
                  <Text style={[styles.categoryText, otherCategory === cat ? styles.categoryTextActive : undefined]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        {addMode === 'SINGLE' ? (
          <View style={[styles.inputGroup, { zIndex: 3000 }]}>
            <Text style={styles.label}>{isOther ? 'ชื่อวัตถุดิบ' : selectedType.partLabel}</Text>

            {isOther ? (
              <TextInput
                style={styles.input}
                placeholder="e.g. แซลมอนนอร์เวย์"
                placeholderTextColor={theme.textLight}
                value={customName}
                onChangeText={setCustomName}
              />
            ) : (
              <PartDropdown
                key={typeKey}
                options={selectedType.parts}
                value={part}
                onChange={(value) => { setPart(value); setNameOverride(null); }}
                placeholder={`เลือก${selectedType.partLabel}...`}
                customPlaceholder={`ระบุ${selectedType.partLabel}...`}
                theme={theme}
              />
            )}

            {/* ชื่อที่จะบันทึกจริง แก้เองได้ */}
            {!isOther ? (
              nameOverride === null ? (
                <TouchableOpacity style={styles.namePreview} onPress={() => setNameOverride(composedName)}>
                  <Text style={styles.namePreviewText} numberOfLines={1}>
                    ชื่อที่จะบันทึก: <Text style={{ fontFamily: FONT_BOLD }}>{composedName}</Text>
                  </Text>
                  <Feather name="edit-2" size={14} color={theme.textLight} />
                </TouchableOpacity>
              ) : (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={nameOverride}
                    onChangeText={setNameOverride}
                    placeholder="ชื่อวัตถุดิบ"
                    placeholderTextColor={theme.textLight}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.nameResetBtn} onPress={() => setNameOverride(null)}>
                    <Feather name="rotate-ccw" size={18} color={theme.textLight} />
                  </TouchableOpacity>
                </View>
              )
            ) : null}
          </View>
        ) : (
          <View style={[styles.inputGroup, { zIndex: 1 }]}>
            <Text style={styles.label}>ชื่อล็อควัตถุดิบ</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. เนื้อหมูยกแผง"
              placeholderTextColor={theme.textLight}
              value={lotName}
              onChangeText={(value) => { setLotName(value); setLotNameTouched(true); }}
            />
          </View>
        )}

        <View style={[styles.rowGroup, { zIndex: 1000 }]}>
          {addMode === 'SINGLE' ? (
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>จำนวน</Text>
              <TextInput style={styles.input} placeholder="0.0" placeholderTextColor={theme.textLight} keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
            </View>
          ) : null}

          <View style={[styles.inputGroup, { flex: addMode === 'SINGLE' ? 1.5 : 1, zIndex: 1000 }]}>
            <Text style={styles.label}>หน่วย</Text>
            <PartDropdown
              key={category}
              options={CATEGORY_MAP[category].units}
              value={unit}
              onChange={setUnit}
              placeholder="เลือกหน่วย"
              customPlaceholder="ระบุหน่วย..."
              theme={theme}
            />
          </View>
        </View>

        {/* 🔴 ส่วนอัปเดต Date Picker และป้ายแนะนำตลอดเวลา */}
        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>วันหมดอายุ (YYYY-MM-DD)</Text>
          <View style={styles.inputWithIconContainer}>

            {/* เปลี่ยนเป็นปุ่มกดเพื่อเปิดปฏิทิน */}
            <TouchableOpacity
              style={[styles.input, { flex: 1, justifyContent: 'center', paddingRight: 50 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ fontFamily: FONT_REGULAR, fontSize: 15, color: expiryDate ? theme.textDark : theme.textLight }}>
                {expiryDate || 'เลือกวันหมดอายุ...'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cameraButton}>
              <Feather name="camera" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* ป้ายแนะนำวันหมดอายุ (โชว์ตลอดเวลา) */}
          <TouchableOpacity style={styles.suggestedDatePill} onPress={applySuggestedDate}>
            <Feather name="zap" size={14} color={theme.success} style={{ marginRight: 6 }} />
            <Text style={styles.suggestedDateText}>
              แนะนำสำหรับ {category}: <Text style={{ fontFamily: FONT_BOLD }}>{suggestedDate}</Text> (+{CATEGORY_MAP[category].addDays} วัน)
            </Text>
          </TouchableOpacity>

          <View style={styles.ocrHint}>
            <Feather name="camera" size={12} color={theme.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.ocrHintText}>กดรูปกล้องเพื่อสแกนวันหมดอายุด้วย OCR</Text>
          </View>
        </View>

        {/* ตัว Component ปฏิทินที่จะเด้งขึ้นมา */}
        {showDatePicker && (
          <DateTimePicker
            value={expiryDate ? new Date(expiryDate) : new Date(suggestedDate || Date.now())}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>ที่จัดเก็บ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}>
            {STORAGE_LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[styles.scrollPill, storageLocation === loc ? styles.scrollPillActive : undefined]}
                onPress={() => setStorageLocation(loc)}
              >
                <Text style={[styles.scrollPillText, storageLocation === loc ? styles.scrollPillTextActive : undefined]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🔴 Par Level (แยกบรรทัดมาเดี่ยวๆ) */}
        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>ปริมาณขั้นต่ำที่ต้องมี</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#F3F4F6', color: theme.textLight }]}
            placeholder="ระบบคำนวณให้อัตโนมัติ (20% ของเริ่มต้น)"
            placeholderTextColor={theme.textLight}
            editable={false}
          />
        </View>

        {/* 🔴 แจ้งเตือนล่วงหน้า (แยกบรรทัด ให้เลื่อนแนวนอนได้ยาวๆ เต็มจอ) */}
        <View style={[styles.inputGroup, { zIndex: 1 }]}>
          <Text style={styles.label}>แจ้งเตือนล่วงหน้าก่อนหมดอายุ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -24 }}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
          >
            {NOTIFY_DAYS.map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.scrollPill, notifyDaysBefore === days ? styles.scrollPillActive : undefined]}
                onPress={() => setNotifyDaysBefore(days)}
              >
                <Text style={[styles.scrollPillText, notifyDaysBefore === days ? styles.scrollPillTextActive : undefined]}>{days} วัน</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {addMode === 'BATCH' ? (
          <View style={styles.partsSection}>
            <Text style={styles.label}>{selectedType.partLabel.toUpperCase()} (ที่แยกในล็อตนี้)</Text>
            {parts.map((partRow, index) => (
              <View key={index} style={[styles.partRow, { zIndex: 900 - index * 10 }]}>
                <View style={{ flex: 2, marginRight: 10 }}>
                  <PartDropdown
                    key={`${typeKey}-${index}`}
                    options={availableParts[index] || []}
                    value={partRow.partName}
                    onChange={(value) => handlePartChange(index, 'partName', value)}
                    placeholder={`เลือก${selectedType.partLabel}...`}
                    customPlaceholder={`ระบุ${selectedType.partLabel}...`}
                    theme={theme}
                  />
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Qty"
                  placeholderTextColor={theme.textLight}
                  keyboardType="numeric"
                  value={partRow.quantity}
                  onChangeText={(val) => handlePartChange(index, 'quantity', val)}
                />
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
            <Text style={styles.batchHint}>
              ชื่อที่บันทึกจะเป็น "{lotName || 'ชื่อล็อต'} - {parts[0]?.partName || selectedType.partLabel}"
            </Text>
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
  headerTitle: { fontFamily: FONT_BOLD, fontSize: 20, color: theme.textDark },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#E8E6E1', borderRadius: 99, padding: 4, marginBottom: 24 },
  modeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 99 },
  modeButtonActive: { backgroundColor: theme.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  modeButtonText: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight },
  modeButtonTextActive: { fontFamily: FONT_BOLD, color: theme.textDark },
  inputGroup: { marginBottom: 20 },
  rowGroup: { flexDirection: 'row', gap: 16 },
  label: { fontFamily: FONT_BOLD, fontSize: 11, color: theme.textLight, marginBottom: 8, letterSpacing: 1 },
  input: { fontFamily: FONT_REGULAR, backgroundColor: theme.inputBg, borderRadius: 16, paddingHorizontal: 16, height: 54, fontSize: 15, color: theme.textDark, borderWidth: 1, borderColor: theme.border },

  namePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.successBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  namePreviewText: { flex: 1, fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textDark, marginRight: 8 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  nameResetBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryPill: { backgroundColor: theme.inputBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
  categoryPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  categoryText: { fontFamily: FONT_REGULAR, fontSize: 14, color: theme.textLight },
  categoryTextActive: { fontFamily: FONT_BOLD, color: '#FFF' },

  scrollPill: { backgroundColor: theme.inputBg, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
  scrollPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  scrollPillText: { fontFamily: FONT_BOLD, fontSize: 13, color: theme.textLight },
  scrollPillTextActive: { color: '#FFF' },

  inputWithIconContainer: { position: 'relative', justifyContent: 'center' },
  cameraButton: { position: 'absolute', right: 8, backgroundColor: theme.primary, width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  suggestedDatePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.successBg, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginTop: 12 },
  suggestedDateText: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.success },

  ocrHint: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 4 },
  ocrHintText: { fontFamily: FONT_REGULAR, fontSize: 12, color: theme.textLight },

  partsSection: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 20, marginBottom: 20 },
  partRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  removePartBtn: { padding: 10, marginLeft: 4 },
  addPartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  addPartBtnText: { fontFamily: FONT_BOLD, fontSize: 14, color: theme.primary },
  batchHint: { fontFamily: FONT_REGULAR, fontSize: 11, color: theme.textLight, textAlign: 'center', marginTop: 4 },

  footer: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20, paddingTop: 10, backgroundColor: theme.background },
  mainSaveButton: { backgroundColor: theme.primary, height: 56, borderRadius: 99, justifyContent: 'center', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  mainSaveButtonText: { fontFamily: FONT_BOLD, color: '#FFFFFF', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(74, 54, 35, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContainer: { backgroundColor: theme.card, width: '100%', borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 15 },
  modalIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: FONT_BOLD, fontSize: 22, color: theme.textDark, marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontFamily: FONT_REGULAR, fontSize: 15, color: theme.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtonGroup: { flexDirection: 'row', width: '100%' },
  modalButtonConfirm: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalButtonConfirmText: { fontFamily: FONT_BOLD, fontSize: 15, color: '#FFF' }
});
