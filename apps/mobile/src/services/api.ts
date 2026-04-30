import axios, { AxiosInstance } from 'axios';

// TODO: Load from env config in production
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance with base config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// TODO: Add JWT token interceptor
// apiClient.interceptors.request.use((config) => {
//   const token = await getAuthToken();
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// TODO: Add response error handling interceptor
// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // Handle 401, refresh token, retry
//     // Handle other errors
//   }
// );

export default apiClient;
