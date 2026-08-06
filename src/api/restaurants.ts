import apiClient from './client';

export const restaurantService = {
  // ---------------- สำหรับ MANAGER ----------------
  // สร้างร้านใหม่ (ได้ Invite Code กลับมาเลย)
  createRestaurant: async (name: string) => {
    const response = await apiClient.post('/restaurants', { name });
    return response.data;
  },

  // แก้ไขข้อมูลร้าน
  updateRestaurant: async (id: string, name: string) => {
    const response = await apiClient.put(`/restaurants/${id}`, { name });
    return response.data;
  },

  // รีเซ็ต Invite Code ใหม่
  regenerateInviteCode: async (id: string) => {
    const response = await apiClient.post(`/restaurants/${id}/invite-code`);
    return response.data;
  },

  // ---------------- สำหรับ EMPLOYEE ----------------
  // เข้าร่วมร้านด้วย Invite Code
  joinRestaurant: async (inviteCode: string) => {
    const response = await apiClient.post('/restaurants/join', { inviteCode });
    return response.data;
  },

  // เช็คข้อมูลร้านก่อนกดยืนยัน Join
  getRestaurantByInviteCode: async (inviteCode: string) => {
    const response = await apiClient.get(`/restaurants/invite/${inviteCode}`);
    return response.data;
  },

  // ---------------- สำหรับใช้งานทั่วไป ----------------
  // ดึงข้อมูลร้านที่ตัวเองสังกัดอยู่ (ใช้บ่อยตอนโหลดหน้า Dashboard)
  getMyRestaurant: async () => {
    const response = await apiClient.get('/restaurants/me');
    return response.data;
  },

  // ดึงรายชื่อสมาชิกทั้งหมดในร้าน (เอาไปวนลูปโชว์ในหน้า Team)
  getRestaurantMembers: async (id: string) => {
    const response = await apiClient.get(`/restaurants/${id}/members`);
    return response.data;
  },

  // ดึงข้อมูลร้านด้วย ID ตรงๆ
  getRestaurantById: async (id: string) => {
    const response = await apiClient.get(`/restaurants/${id}`);
    return response.data;
  }
};