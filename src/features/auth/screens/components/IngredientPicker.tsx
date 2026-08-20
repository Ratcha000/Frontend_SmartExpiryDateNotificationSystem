import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { INGREDIENT_TYPES, IngredientType } from './ingredientCatalog';
import { FONT_REGULAR, FONT_BOLD } from '../../../../theme/fonts';

type Props = {
  selectedKey: string;
  onSelect: (type: IngredientType) => void;
  /** ระยะ padding ด้านข้างของหน้าจอ ใช้ทำ full-bleed scroll */
  edgePadding?: number;
  theme: {
    inputBg: string;
    border: string;
    primary: string;
    textLight: string;
    textDark: string;
    background: string;
  };
};

/** แถววงกลมเลือกวัตถุดิบ เลื่อนแนวนอนแบบสตอรี่ IG */
export default function IngredientPicker({ selectedKey, onSelect, edgePadding = 24, theme }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -edgePadding }}
      contentContainerStyle={{ paddingHorizontal: edgePadding, gap: 14 }}
    >
      {INGREDIENT_TYPES.map((type) => {
        const isActive = selectedKey === type.key;
        return (
          <TouchableOpacity
            key={type.key}
            style={styles.item}
            activeOpacity={0.7}
            onPress={() => onSelect(type)}
          >
            <View
              style={[
                styles.ring,
                { borderColor: isActive ? theme.primary : 'transparent', backgroundColor: theme.background },
              ]}
            >
              {type.image ? (
                <Image
                  source={type.image}
                  style={[styles.image, { opacity: isActive ? 1 : 0.45, borderColor: theme.border }]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.image,
                    styles.placeholder,
                    { backgroundColor: theme.inputBg, borderColor: theme.border, opacity: isActive ? 1 : 0.6 },
                  ]}
                >
                  <Feather name="plus" size={24} color={isActive ? theme.primary : theme.textLight} />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.textDark : theme.textLight },
                isActive ? styles.labelActive : undefined,
              ]}
              numberOfLines={2}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { width: 76, alignItems: 'center' },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: FONT_REGULAR, fontSize: 11, marginTop: 6, textAlign: 'center' },
  labelActive: { fontFamily: FONT_BOLD },
});
