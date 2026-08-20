import type { ImageSourcePropType } from 'react-native';

/**
 * รายการวัตถุดิบสำหรับวงกลมเลือกในหน้าเพิ่มวัตถุดิบ
 * - category ต้องตรงกับ key ของ CATEGORY_MAP ใน AddIngredientScreen (ใช้กำหนดหน่วยและวันหมดอายุแนะนำ)
 * - รูปทั้งหมดรวม require ไว้ที่ไฟล์นี้ที่เดียว
 */
export type IngredientType = {
  key: string;
  label: string;
  image: ImageSourcePropType | null;
  category: string;
  partLabel: string;
  parts: string[];
};

export const OTHER_KEY = 'other';
export const CUSTOM_OPTION = 'กำหนดเอง';

export const INGREDIENT_TYPES: IngredientType[] = [
  {
    key: 'chicken',
    label: 'ไก่',
    image: require('../../../../../assets/ingredients/chicken.png'),
    category: 'เนื้อสัตว์',
    partLabel: 'ชิ้นส่วน',
    parts: ['สะโพก', 'น่อง', 'ปีก', 'อก', 'สันใน', 'เครื่องใน', 'โครงไก่', 'ตีนไก่'],
  },
  {
    key: 'pork',
    label: 'หมู',
    image: require('../../../../../assets/ingredients/pig.png'),
    category: 'เนื้อสัตว์',
    partLabel: 'ชิ้นส่วน',
    parts: ['สันคอ', 'สามชั้น', 'สันนอก', 'สันใน', 'สะโพก', 'ซี่โครง', 'หมูบด', 'เครื่องใน'],
  },
  {
    key: 'beef',
    label: 'เนื้อวัว',
    image: require('../../../../../assets/ingredients/cow.png'),
    category: 'เนื้อสัตว์',
    partLabel: 'ชิ้นส่วน',
    parts: ['สันคอ', 'สันนอก', 'สันใน', 'ริบอาย', 'เสือร้องไห้', 'เนื้อบด', 'ซี่โครง'],
  },
  {
    key: 'seafood',
    label: 'อาหารทะเล',
    image: require('../../../../../assets/ingredients/seafoods.png'),
    category: 'อาหารทะเล',
    partLabel: 'ชนิด',
    parts: ['ปลา', 'ปลาแล่/ฟิลเล่', 'กุ้ง', 'ปลาหมึก', 'หอย', 'ปู'],
  },
  {
    key: 'eggMilk',
    label: 'นมและไข่',
    image: require('../../../../../assets/ingredients/eggAndSauce.png'),
    category: 'นมและไข่',
    partLabel: 'ชนิด',
    parts: ['ไข่ไก่', 'ไข่เป็ด', 'ไข่นกกระทา', 'นมสด', 'เนย', 'ชีส', 'วิปครีม'],
  },
  {
    key: 'vegetable',
    label: 'ผักและผลไม้',
    image: require('../../../../../assets/ingredients/vegetables.png'),
    category: 'ผักและผลไม้',
    partLabel: 'ชนิด',
    parts: ['ผักใบ', 'ผักหัว', 'เห็ด', 'สมุนไพร', 'ผลไม้สด', 'ผลไม้ตัดแต่ง'],
  },
  {
    key: 'dried',
    label: 'ของแห้ง',
    image: require('../../../../../assets/ingredients/driedfoods.png'),
    category: 'ของแห้ง',
    partLabel: 'ชนิด',
    parts: ['ข้าวสาร', 'เส้น', 'แป้ง', 'ถั่ว/ธัญพืช', 'ของแห้งอื่นๆ'],
  },
  {
    key: 'condiment',
    label: 'เครื่องปรุง',
    image: require('../../../../../assets/ingredients/condiment.png'),
    category: 'เครื่องปรุง',
    partLabel: 'ชนิด',
    parts: ['ซอส', 'น้ำมัน', 'ผงปรุงรส', 'เครื่องเทศ', 'น้ำส้มสายชู'],
  },
  {
    key: 'drink',
    label: 'เครื่องดื่ม',
    image: require('../../../../../assets/ingredients/drinks.png'),
    category: 'เครื่องดื่ม',
    partLabel: 'ชนิด',
    parts: ['น้ำเปล่า', 'น้ำผลไม้', 'น้ำอัดลม', 'ชา/กาแฟ'],
  },
  {
    key: OTHER_KEY,
    label: 'อื่นๆ',
    image: null, // ใช้ไอคอน + แทนรูป
    category: 'อื่นๆ',
    partLabel: 'ชนิด',
    parts: [],
  },
];

export const getIngredientType = (key: string) =>
  INGREDIENT_TYPES.find((type) => type.key === key) || INGREDIENT_TYPES[0];
