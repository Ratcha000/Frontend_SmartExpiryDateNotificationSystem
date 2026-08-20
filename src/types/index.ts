export interface User {
  id: string; // UUID from Backend
  email: string;
  displayName: string;
  role: 'MANAGER' | 'EMPLOYEE';
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
