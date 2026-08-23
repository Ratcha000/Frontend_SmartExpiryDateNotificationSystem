import apiClient from './client';
import type { Ingredient, UsageHistory } from '../types';

// ตัดสต็อกมีอยู่แล้วในโมดูล suggestions — re-export เพื่อให้หน้าจอ import จากที่เดียวได้
export { consumeIngredient, getErrorMessage } from './suggestions';

/**
 * PATCH /api/ingredients/{id}/restock
 * เติมสต็อก (backend สร้าง usage history RESTOCKED ให้เอง)
 */
export const restockIngredient = (id: string, quantity: number, note?: string) =>
  apiClient.patch<Ingredient>(`/ingredients/${id}/restock`, {
    quantity,
    ...(note && note.trim() ? { note: note.trim() } : {}),
  });

/**
 * PATCH /api/ingredients/{id}/adjust-quantity
 * แก้ยอดคงเหลือให้ตรงกับของจริง — ส่ง "ยอดใหม่" ไม่ใช่ส่วนต่าง (usage history ADJUSTED)
 */
export const adjustIngredientQuantity = (id: string, quantity: number, note?: string) =>
  apiClient.patch<Ingredient>(`/ingredients/${id}/adjust-quantity`, {
    quantity,
    ...(note && note.trim() ? { note: note.trim() } : {}),
  });

/**
 * PATCH /api/ingredients/{id}/used
 * ทำเครื่องหมายว่าใช้หมดแล้ว -> status เป็น USED (usage history USED)
 */
export const markIngredientUsed = (id: string, note?: string) =>
  apiClient.patch<Ingredient>(
    `/ingredients/${id}/used`,
    note && note.trim() ? { note: note.trim() } : {}
  );

/**
 * PATCH /api/ingredients/{id}/delete
 * soft delete -> status เป็น DELETED
 * หมายเหตุ: backend ไม่มีเส้น DELETE /ingredients/{id} ห้ามใช้ apiClient.delete กับวัตถุดิบ
 */
export const deleteIngredient = (id: string, note?: string) =>
  apiClient.patch<Ingredient>(
    `/ingredients/${id}/delete`,
    note && note.trim() ? { note: note.trim() } : {}
  );

/**
 * GET /api/usage-history?restaurantId=&ingredientId=&actionType=
 * ประวัติการเคลื่อนไหวของสต็อก ถ้าไม่ส่ง ingredientId จะได้ทั้งร้าน
 */
export const getUsageHistory = (restaurantId: string, ingredientId?: string) =>
  apiClient.get<UsageHistory[]>('/usage-history', {
    params: { restaurantId, ...(ingredientId ? { ingredientId } : {}) },
  });
