export type Role = 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string; // UUID from Backend
  email: string;
  displayName: string;
  role: Role;
  restaurantId: string | null; // null if not yet affiliated
}

export interface Restaurant {
  id: string;
  name: string;
  managerId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export type IngredientStatus = 'ACTIVE' | 'USED' | 'DELETED' | 'EXPIRED';

export interface Ingredient {
  id: string;
  restaurantId: string;
  name: string;
  lotId: string | null;
  lotName: string | null;
  category: string;
  initialQuantity: number;
  quantity: number;
  unit: string;
  categoryUnitHint?: string;
  expiryDate: string;
  notifyDaysBefore: number;
  status: IngredientStatus;
  daysLeft: number;
  expiring: boolean;
  expired: boolean;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SuggestedMenu {
  menuName: string;
  description: string;
  ingredientsRequired: string[];
  ingredientsInStock: string[];
  missingIngredients: string[];
  steps: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface NearExpirySuggestion {
  ingredientId: string;
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysLeft: number;
  menus: SuggestedMenu[];
}

export interface MenuSuggestionResponse {
  restaurantId: string;
  sourceIngredients?: string[];
  ingredientName?: string;
  menus: SuggestedMenu[];
}

/** เป้าหมายของการตัดสต็อก (ใช้ได้ทั้งจาก Ingredient เต็มๆ และจาก near-expiry response) */
export interface ConsumeTarget {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

/* ---------- OCR สแกนวันหมดอายุ ----------
 * backend ไม่ได้ทำ OCR — frontend อ่านตัวอักษรจากรูปเองแล้วส่ง rawText ไปให้ backend
 * หา "วันที่" ในข้อความ (ดู doc/frontend-ocr.md)
 */

export type OcrConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type OcrSource = 'CAMERA' | 'GALLERY';

export interface OcrExtractResponse {
  rawText: string;
  /** 'YYYY-MM-DD' — เป็น null เมื่อหาวันที่ในข้อความไม่เจอ (confidence = LOW) */
  expiryDate: string | null;
  /** ข้อความวันที่ต้นฉบับที่ backend จับได้ เช่น "09/08/2026" ควรแสดงให้ผู้ใช้ตรวจสอบ */
  matchedText: string | null;
  confidence: OcrConfidence;
  /** ข้อความเตือนภาษาไทย เอาไปแสดงตรงๆ ได้เลย */
  warnings: string[];
  /** ตอนนี้ backend ส่ง null ทุก field — อย่าเขียนโค้ดที่พึ่งค่านี้ */
  suggestedIngredient?: {
    name: string | null;
    category: string | null;
    quantity: number | null;
    unit: string | null;
  };
  /** ส่งต่อไป POST /api/ingredients ได้เลย (ชื่อ field เดียวกัน) เพื่อเก็บ audit */
  scannedAt: string;
  scannedBy: string;
}

/** ข้อมูล audit ที่พกจากหน้าสแกนกลับมาที่ฟอร์มเพิ่มวัตถุดิบ */
export interface ScanMeta {
  scannedAt: string;
  scannedBy: string;
}

/* ---------- Purchase Planning (Manager only) ----------
 * ร้านตั้งว่า "ซื้อวันไหนของสัปดาห์" แล้ว scheduler ฝั่ง backend จะให้ AI
 * คำนวณรายการซื้อของให้ตอนถึงเวลา notificationTime (ดู doc/completed-03.md)
 */

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PurchaseSetting {
  restaurantId: string;
  /** วันที่ร้านซื้อของ ห้ามว่าง ถ้าซื้อทุกวันให้ส่งครบ 7 วัน */
  purchaseDays: Weekday[];
  /** ให้ AI ดูข้อมูลย้อนหลังกลับไปกี่รอบซื้อ (1-30) */
  lookbackPurchaseRuns: number;
  /** เวลาที่ระบบ generate และแจ้งเตือน รูปแบบ "HH:mm:ss" */
  notificationTime: string;
  /** buffer เผื่อของขาด (0-100) */
  safetyBufferPercent: number;
  /** null เมื่อร้านยังไม่เคยตั้งค่า (backend คืนค่า default มาให้) */
  updatedAt: string | null;
}

/** body ของ PUT /api/purchase-settings/{restaurantId} */
export type PurchaseSettingPayload = Omit<PurchaseSetting, 'restaurantId' | 'updatedAt'>;

export interface PurchaseRecommendation {
  id: string;
  restaurantId: string;
  /** รอบที่ AI สร้างรายการนี้ ใช้ย้อนดูประวัติได้ */
  runId: string;
  ingredientName: string;
  category: string;
  unit: string;
  currentQuantity: number;
  averageDailyUsage: number;
  estimatedConsumptionUntilNextCycle: number;
  recommendedBuyQuantity: number;
  reason: string;
  confidence: Confidence;
  generatedAt: string;
}

/* ---------- ประวัติรอบที่ AI แนะนำ ----------
 * backend เก็บทุกรอบที่ generate ไว้ (ทั้งที่สำเร็จและล้มเหลว) พร้อม snapshot ของ setting
 * ตอนนั้น รอบเก่าจึงอธิบายตัวเองได้แม้ผู้จัดการจะเปลี่ยนค่าตั้งไปแล้ว
 */

export type PurchaseRunSource = 'SCHEDULED' | 'MANUAL';
export type PurchaseRunStatus = 'SUCCESS' | 'FAILED';

export interface PurchaseRunSummary {
  runId: string;
  restaurantId: string;
  /** 'YYYY-MM-DD' — วันที่ของรอบซื้อ */
  runDate: string;
  generatedAt: string;
  source: PurchaseRunSource;
  status: PurchaseRunStatus;
  /** มีค่าเฉพาะรอบที่ status = FAILED */
  errorMessage: string | null;
  /** จำนวนรายการที่ AI แนะนำทั้งหมดในรอบนั้น */
  itemCount: number;
  /** จำนวนวัตถุดิบที่ต้องซื้อจริง (recommendedBuyQuantity > 0) */
  totalBuyItems: number;
  // ---- snapshot ของ setting ตอนรันรอบนั้น ----
  purchaseDays: Weekday[];
  lookbackPurchaseRuns: number;
  safetyBufferPercent: number;
  /** AI ดูข้อมูลย้อนหลังตั้งแต่เวลานี้ */
  lookbackStartAt: string;
}

export interface PurchaseRunDetail extends PurchaseRunSummary {
  /** เรียงจาก recommendedBuyQuantity มากไปน้อยมาจาก backend แล้ว */
  items: PurchaseRecommendation[];
}

export type NotificationType = 'PURCHASE_RECOMMENDATION' | 'PURCHASE_RECOMMENDATION_FAILED';

/** ชื่อ AppNotification กัน conflict กับ Notification ของ DOM/React Native */
export interface AppNotification {
  id: string;
  restaurantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/* ---------- Usage History ----------
 * backend สร้าง record ให้เองทุกครั้งที่เรียก consume/restock/adjust-quantity/used/delete
 * Purchase Planning AI ใช้ประวัติ CONSUMED และ USED ในการคำนวณ (doc/completed-03.md)
 */

export type UsageActionType =
  | 'ADDED'
  | 'EDITED'
  | 'CONSUMED'
  | 'RESTOCKED'
  | 'ADJUSTED'
  | 'USED'
  | 'DELETED';

export interface UsageHistory {
  id: string;
  ingredientId: string;
  ingredientName: string;
  actionType: UsageActionType;
  quantityChanged: number;
  unit: string;
  quantityBefore: number;
  quantityAfter: number;
  /** เป็น user id ไม่ใช่ชื่อ — backend ยังไม่ได้ join ชื่อผู้ใช้มาให้ */
  performedBy: string;
  performedAt: string;
  restaurantId: string;
  note: string | null;
}
