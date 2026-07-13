import apiClient from './client';
import { Restaurant } from '../types';

export const restaurantsApi = {
  getDetails: async (id: string): Promise<Restaurant> => {
    const response = await apiClient.get<Restaurant>(`/restaurants/${id}`);
    return response.data;
  },
};
