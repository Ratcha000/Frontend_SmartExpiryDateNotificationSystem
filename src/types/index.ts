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

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
