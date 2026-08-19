import apiClient, { AI_TIMEOUT } from './client';
import type {
  Ingredient,
  MenuSuggestionResponse,
  NearExpirySuggestion,
} from '../types';

/**
 * GET /api/suggestions/ingredients/near-expiry
 * ดึงวัตถุดิบใกล้หมดอายุพร้อมเมนูแนะนำ (สูงสุด 3 เมนูต่อวัตถุดิบ)
 * backend เรียก AI แยกต่อวัตถุดิบ 1 ตัว จึงช้ามาก -> ต้อง override timeout
 */
export const getNearExpirySuggestions = (restaurantId: string) =>
  apiClient.get<NearExpirySuggestion[]>('/suggestions/ingredients/near-expiry', {
    params: { restaurantId },
    timeout: AI_TIMEOUT,
  });

/**
 * POST /api/suggestions/menu
 * ขอเมนูแนะนำจากวัตถุดิบที่ผู้ใช้เลือกเอง (maxMenus รับค่า 1-10)
 */
export const suggestMenusFromIngredients = (
  restaurantId: string,
  ingredientNames: string[],
  maxMenus: number = 3
) =>
  apiClient.post<MenuSuggestionResponse>(
    '/suggestions/menu',
    { restaurantId, ingredientNames, maxMenus, language: 'th' },
    { timeout: AI_TIMEOUT }
  );

/**
 * GET /api/ingredients?restaurantId=&status=ACTIVE
 * ดึงเฉพาะสต็อกที่ยังใช้งานได้ สำหรับให้ผู้ใช้เลือกใน Tab เชฟ AI
 */
export const getActiveStock = (restaurantId: string) =>
  apiClient.get<Ingredient[]>('/ingredients', {
    params: { restaurantId, status: 'ACTIVE' },
  });

/**
 * GET /api/ingredients/expiring?restaurantId=
 * รายการวัตถุดิบใกล้หมดอายุแบบเร็ว (ไม่เรียก AI) ใช้แสดงก่อนที่ผู้ใช้จะกดขอเมนูแนะนำ
 */
export const getExpiringIngredients = (restaurantId: string) =>
  apiClient.get<Ingredient[]>('/ingredients/expiring', {
    params: { restaurantId },
  });

/**
 * PATCH /api/ingredients/{id}/consume
 * ตัดสต็อกจริง (backend จะสร้าง usage history CONSUMED และอัปเดต lastUsedAt ให้เอง)
 */
export const consumeIngredient = (id: string, quantity: number, note?: string) =>
  apiClient.patch<Ingredient>(`/ingredients/${id}/consume`, {
    quantity,
    ...(note && note.trim() ? { note: note.trim() } : {}),
  });

/** แปลง error จาก axios เป็นข้อความภาษาไทยที่ผู้ใช้อ่านรู้เรื่อง */
export const getErrorMessage = (error: any, fallback: string) => {
  if (error?.code === 'ECONNABORTED') {
    return 'AI ใช้เวลาประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้ง';
  }
  if (!error?.response) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  }
  return error?.response?.data?.message || fallback;
};
