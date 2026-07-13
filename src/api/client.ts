import axios from 'axios';
import * as Keychain from 'react-native-keychain';

const DEFAULT_API_URL = 'http://localhost:8080/api';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT Token to every request automatically
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        config.headers.Authorization = `Bearer ${credentials.password}`;
      }
    } catch (error) {
      console.error('Failed to retrieve secure token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth errors (e.g. 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request - Clearing token...');
      try {
        await Keychain.resetGenericPassword();
      } catch (resetError) {
        console.error('Failed to clear secure token:', resetError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
