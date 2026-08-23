import apiClient, { AI_TIMEOUT } from './client';
import type {
  PurchaseRecommendation,
  PurchaseRunDetail,
  PurchaseRunSummary,
  PurchaseSetting,
  PurchaseSettingPayload,
} from '../types';

/**
 * GET /api/purchase-settings/{restaurantId}
 * ดูรอบซื้อของร้าน ถ้าร้านยังไม่เคยตั้งค่า backend จะคืน default (purchaseDays: ["MONDAY"], updatedAt: null)
 * Manager only
 */
export const getPurchaseSettings = (restaurantId: string) =>
  apiClient.get<PurchaseSetting>(`/purchase-settings/${restaurantId}`);

/**
 * PUT /api/purchase-settings/{restaurantId}
 * สร้างหรือแก้รอบซื้อของร้าน
 * Manager only
 */
export const updatePurchaseSettings = (
  restaurantId: string,
  payload: PurchaseSettingPayload
) => apiClient.put<PurchaseSetting>(`/purchase-settings/${restaurantId}`, payload);

/**
 * GET /api/purchase-recommendations?restaurantId=
 * รายการที่ AI คำนวณไว้ล่าสุด (เส้นเร็ว ไม่เรียก AI) เรียงตาม recommendedBuyQuantity มากไปน้อย
 * Manager only
 */
export const getPurchaseRecommendations = (restaurantId: string) =>
  apiClient.get<PurchaseRecommendation[]>('/purchase-recommendations', {
    params: { restaurantId },
  });

/**
 * POST /api/purchase-recommendations/generate
 * สั่งให้ AI คำนวณใหม่ทันที backend จะลบชุดเดิมแล้ว save ชุดใหม่
 * เรียก AI จริง ช้ามาก -> ต้อง override timeout
 * Manager only
 */
export const generatePurchaseRecommendations = (restaurantId: string) =>
  apiClient.post<PurchaseRecommendation[]>(
    '/purchase-recommendations/generate',
    { restaurantId },
    { timeout: AI_TIMEOUT }
  );

/**
 * GET /api/purchase-recommendations/runs?restaurantId=&limit=
 * สรุปประวัติรอบละ 1 รายการ เรียงใหม่ไปเก่า ไม่มี items ปนมา (payload เบา เหมาะกับ timeline)
 * ไม่ส่ง limit = ได้เท่าจำนวนรอบที่ระบบเก็บไว้
 * Manager only
 */
export const getPurchaseRuns = (restaurantId: string, limit?: number) =>
  apiClient.get<PurchaseRunSummary[]>('/purchase-recommendations/runs', {
    params: { restaurantId, ...(limit ? { limit } : {}) },
  });

/**
 * GET /api/purchase-recommendations/runs/{runId}
 * ข้อมูลรอบเดียวพร้อม items ทั้งหมดของรอบนั้น
 * Manager only — เข้าถึงได้เฉพาะรอบของร้านตัวเอง
 */
export const getPurchaseRunDetail = (runId: string) =>
  apiClient.get<PurchaseRunDetail>(`/purchase-recommendations/runs/${runId}`);
