import type {
  Confidence,
  PurchaseRecommendation,
  PurchaseRunSource,
  Weekday,
} from '../../../../../types';
import { theme } from '../suggestionTheme';

/** เรียงตามสัปดาห์แบบไทย (จันทร์ขึ้นต้น) ตรงกับลำดับที่ backend ใช้ */
export const WEEKDAYS: Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** ตัวย่อบน chip เลือกวัน */
export const WEEKDAY_SHORT_TH: Record<Weekday, string> = {
  MONDAY: 'จ',
  TUESDAY: 'อ',
  WEDNESDAY: 'พ',
  THURSDAY: 'พฤ',
  FRIDAY: 'ศ',
  SATURDAY: 'ส',
  SUNDAY: 'อา',
};

export const WEEKDAY_FULL_TH: Record<Weekday, string> = {
  MONDAY: 'จันทร์',
  TUESDAY: 'อังคาร',
  WEDNESDAY: 'พุธ',
  THURSDAY: 'พฤหัสบดี',
  FRIDAY: 'ศุกร์',
  SATURDAY: 'เสาร์',
  SUNDAY: 'อาทิตย์',
};

const MONTH_SHORT_TH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/** Date.getDay() คืน 0=อาทิตย์ ส่วน WEEKDAYS เริ่มที่จันทร์ */
const weekdayOfDate = (date: Date): Weekday => WEEKDAYS[(date.getDay() + 6) % 7];

export const CONFIDENCE_LABEL_TH: Record<Confidence, string> = {
  HIGH: 'มั่นใจสูง',
  MEDIUM: 'มั่นใจปานกลาง',
  LOW: 'มั่นใจต่ำ',
};

export const getConfidenceColors = (confidence: Confidence) => {
  if (confidence === 'HIGH') return { bg: theme.successBg, text: theme.successText };
  if (confidence === 'MEDIUM') return { bg: theme.warningBg, text: theme.warningText };
  return { bg: theme.neutralBg, text: theme.neutralText };
};

/**
 * หาว่ารอบซื้อถัดไปคือวันไหน โดยไล่จากวันนี้ไปข้างหน้าไม่เกิน 7 วัน
 * วันนี้เองก็นับเป็นรอบซื้อได้ (scheduler รันตอน notificationTime ของวันนั้น)
 */
export const getNextPurchaseDate = (
  purchaseDays: Weekday[],
  from: Date = new Date()
): Date | null => {
  if (!purchaseDays.length) return null;
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    if (purchaseDays.includes(weekdayOfDate(candidate))) return candidate;
  }
  return null;
};

/** "จันทร์ 25 ส.ค." — ถ้าเป็นวันนี้จะขึ้นว่า "วันนี้ (จันทร์)" */
export const formatPurchaseDate = (date: Date, now: Date = new Date()) => {
  const isToday = date.toDateString() === now.toDateString();
  const name = WEEKDAY_FULL_TH[weekdayOfDate(date)];
  if (isToday) return `วันนี้ (${name})`;
  return `${name} ${date.getDate()} ${MONTH_SHORT_TH[date.getMonth()]}`;
};

/** "00:01:00" -> "00:01" สำหรับแสดงผล */
export const formatTimeLabel = (notificationTime: string) =>
  (notificationTime || '').slice(0, 5) || '--:--';

/** "00:01" -> "00:01:00" สำหรับส่งขึ้น backend */
export const toBackendTime = (hhmm: string) =>
  hhmm.length === 5 ? `${hhmm}:00` : hhmm;

/** ตัดเลขทศนิยมที่ backend ส่งมาแบบ 3.000 ให้อ่านง่าย */
export const formatQuantity = (value: number) => {
  if (!Number.isFinite(value)) return '-';
  return Number(value.toFixed(2)).toString();
};

/** "อัปเดตล่าสุด 5 นาทีที่แล้ว" — ใช้กับ generatedAt / createdAt */
export const formatRelativeTime = (iso: string) => {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
};

/** ป้ายบอกว่ารอบนั้นมาจากไหน */
export const RUN_SOURCE_TH: Record<PurchaseRunSource, string> = {
  SCHEDULED: 'ระบบรันอัตโนมัติ',
  MANUAL: 'กดสร้างเอง',
};

/**
 * 'YYYY-MM-DD' -> 'จันทร์ 25 ส.ค.'
 * แยกสตริงเองแทน new Date() เพราะ new Date('2026-08-25') คือเที่ยงคืน UTC
 * ถ้า timezone ของเครื่องอยู่หลัง UTC วันที่จะเลื่อนไปหนึ่งวัน
 */
export const formatRunDate = (isoDate: string) => {
  const [y, m, d] = (isoDate || '').split('-').map(Number);
  if (!y || !m || !d) return isoDate || '-';
  const local = new Date(y, m - 1, d);
  const name = WEEKDAY_FULL_TH[WEEKDAYS[(local.getDay() + 6) % 7]];
  return `${name} ${d} ${MONTH_SHORT_TH[m - 1]}`;
};

/** '2026-08-25T09:00:00Z' -> '09:00 น.' ตามเวลาเครื่อง */
export const formatClockTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} น.`;
};

/**
 * รายการนี้ต้องซื้อจริงไหม
 * ใช้เกณฑ์เดียวกับที่ backend นับ totalBuyItems (PurchaseRunWriter: recommendedBuyQuantity > 0)
 * จำนวนที่แสดงบนหน้าจอจึงตรงกับตัวเลขที่ backend ส่งมาเสมอ
 */
export const needsPurchase = (item: PurchaseRecommendation) =>
  Number(item.recommendedBuyQuantity) > 0;
