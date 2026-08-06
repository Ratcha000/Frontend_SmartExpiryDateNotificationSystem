import apiClient from './client';
import { User } from '../types'; // นำเข้า Type ของ User ตามที่คุณมี

export const userService = {
  // ดึงข้อมูลตัวเอง (ผลลัพธ์เหมือน auth/me แต่แยกตาม Endpoint ของ Swagger)
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  // ดึงข้อมูล User คนอื่นด้วย ID
  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  // อัปเดตข้อมูลส่วนตัว (เช่น เปลี่ยนชื่อ)
  updateUser: async (id: string, data: { displayName?: string; role?: string }): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },

  // ค้นหารายชื่อ User (สามารถแนบ parameter เพื่อกรองตามร้านได้)
  getUsers: async (restaurantId?: string): Promise<User[]> => {
    const url = restaurantId ? `/users?restaurantId=${restaurantId}` : '/users';
    const response = await apiClient.get<User[]>(url);
    return response.data;
  }
};