import type { SuggestedMenu } from '../types';

/**
 * แคชผลลัพธ์จาก AI ไว้ในหน่วยความจำ (หายเมื่อปิดแอป)
 * เพื่อไม่ให้ต้องรอ AI ใหม่ทุกครั้งที่สลับหน้าไปมา
 */
export const CACHE_TTL = 30 * 60 * 1000; // 30 นาที

type UrgentCache = {
  restaurantId: string;
  menusByIngredient: Record<string, SuggestedMenu[]>;
  fetchedAt: number;
};

type ChefCache = {
  restaurantId: string;
  selectedNames: string[];
  maxMenus: number;
  menus: SuggestedMenu[];
  fetchedAt: number;
};

let urgentCache: UrgentCache | null = null;
let chefCache: ChefCache | null = null;

const isFresh = (fetchedAt: number) => Date.now() - fetchedAt < CACHE_TTL;

export const getUrgentCache = (restaurantId: string) =>
  urgentCache && urgentCache.restaurantId === restaurantId && isFresh(urgentCache.fetchedAt)
    ? urgentCache
    : null;

export const setUrgentCache = (
  restaurantId: string,
  menusByIngredient: Record<string, SuggestedMenu[]>
) => {
  urgentCache = { restaurantId, menusByIngredient, fetchedAt: Date.now() };
  return urgentCache.fetchedAt;
};

export const getChefCache = (restaurantId: string) =>
  chefCache && chefCache.restaurantId === restaurantId && isFresh(chefCache.fetchedAt)
    ? chefCache
    : null;

export const setChefCache = (
  restaurantId: string,
  selectedNames: string[],
  maxMenus: number,
  menus: SuggestedMenu[]
) => {
  chefCache = { restaurantId, selectedNames, maxMenus, menus, fetchedAt: Date.now() };
  return chefCache.fetchedAt;
};

/** ล้างแคชทั้งหมด (เรียกตอน logout) */
export const clearSuggestionCache = () => {
  urgentCache = null;
  chefCache = null;
};

/** แปลง timestamp เป็นข้อความ เช่น "ผลจากเมื่อ 5 นาทีที่แล้ว" */
export const formatCacheAge = (fetchedAt: number) => {
  const minutes = Math.floor((Date.now() - fetchedAt) / 60000);
  if (minutes < 1) return 'ผลจากเมื่อสักครู่';
  return `ผลจากเมื่อ ${minutes} นาทีที่แล้ว`;
};
