import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CUSTOM_OPTION } from './ingredientCatalog';
import { FONT_REGULAR, FONT_BOLD } from '../../../../theme/fonts';

type Props = {
  options: string[];
  /** ค่าที่เลือกอยู่ ('' = ยังไม่เลือก) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** เพิ่มตัวเลือก "กำหนดเอง" ท้ายลิสต์ */
  allowCustom?: boolean;
  customPlaceholder?: string;
  /** จำนวนรายการที่แสดงก่อนต้องเลื่อน (default 4) */
  visibleItems?: number;
  theme: {
    inputBg: string;
    border: string;
    primary: string;
    textLight: string;
    textDark: string;
  };
};

/** ความสูงต่อรายการ (ใช้คำนวณความสูงลิสต์ให้ตรงกับที่แสดงจริง) */
const ITEM_HEIGHT = 46;

/**
 * Dropdown ที่ใช้ร่วมกันทั้งช่องหน่วยและช่องชิ้นส่วน
 * รายการแสดงผ่าน Modal ที่วางตำแหน่งตรงกับช่อง เพื่อให้เลื่อนได้จริง
 * (ถ้าวางเป็น absolute ในหน้าจอ ScrollView หลักจะแย่ง gesture ไปเลื่อนทั้งหน้าแทน)
 */
export default function PartDropdown({
  options,
  value,
  onChange,
  placeholder = 'เลือก...',
  allowCustom = true,
  customPlaceholder = 'ระบุเอง...',
  visibleItems = 4,
  theme,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // อยู่ในโหมดพิมพ์เอง เมื่อกด "กำหนดเอง" หรือค่าปัจจุบันไม่อยู่ในลิสต์
  const [isCustom, setIsCustom] = useState(!!value && !options.includes(value));

  const headerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const totalItems = options.length + (allowCustom ? 1 : 0);
  const listHeight = Math.min(totalItems, visibleItems) * ITEM_HEIGHT;

  const openList = () => {
    headerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  };

  // ถ้าพื้นที่ด้านล่างไม่พอ ให้เด้งขึ้นด้านบนช่องแทน
  const screenHeight = Dimensions.get('window').height;
  const spaceBelow = screenHeight - (anchor.y + anchor.height);
  const showAbove = spaceBelow < listHeight + 24 && anchor.y > listHeight;
  const listTop = showAbove ? anchor.y - listHeight - 6 : anchor.y + anchor.height + 6;

  const headerText = isCustom ? CUSTOM_OPTION : value || placeholder;

  const renderItem = (label: string, active: boolean, onPress: () => void, isLast: boolean) => (
    <TouchableOpacity
      key={label}
      style={[styles.item, { borderBottomColor: theme.border }, isLast ? { borderBottomWidth: 0 } : undefined]}
      onPress={onPress}
    >
      <Text style={[styles.itemText, { color: theme.textDark }, active ? styles.itemTextActive : undefined]}>
        {label}
      </Text>
      {active ? <Feather name="check" size={16} color={theme.primary} /> : null}
    </TouchableOpacity>
  );

  return (
    <View>
      <TouchableOpacity
        ref={headerRef}
        style={[
          styles.header,
          { backgroundColor: theme.inputBg, borderColor: isOpen ? theme.primary : theme.border },
        ]}
        onPress={openList}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.headerText, { color: value || isCustom ? theme.textDark : theme.textLight }]}
          numberOfLines={1}
        >
          {headerText}
        </Text>
        <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textLight} />
      </TouchableOpacity>

      {isCustom ? (
        <TextInput
          style={[
            styles.customInput,
            { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textDark },
          ]}
          placeholder={customPlaceholder}
          placeholderTextColor={theme.textLight}
          value={value}
          onChangeText={onChange}
          autoFocus
        />
      ) : null}

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.list,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              top: listTop,
              left: anchor.x,
              width: anchor.width,
              height: listHeight,
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
            {options.map((option, index) =>
              renderItem(
                option,
                value === option && !isCustom,
                () => {
                  setIsCustom(false);
                  onChange(option);
                  setIsOpen(false);
                },
                !allowCustom && index === options.length - 1
              )
            )}

            {allowCustom
              ? renderItem(
                  CUSTOM_OPTION,
                  isCustom,
                  () => {
                    setIsCustom(true);
                    onChange('');
                    setIsOpen(false);
                  },
                  true
                )
              : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: { flex: 1, fontFamily: FONT_REGULAR, fontSize: 15, marginRight: 8 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  list: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  item: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  itemText: { fontFamily: FONT_REGULAR, fontSize: 14 },
  itemTextActive: { fontFamily: FONT_BOLD },
  customInput: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: FONT_REGULAR,
    fontSize: 15,
    marginTop: 8,
  },
});
