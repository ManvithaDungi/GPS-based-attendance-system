import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error('VITE_API_URL not defined');
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // If calling refresh/logout which rely on refresh cookie, include CSRF header (double-submit)
  try {
    const url = config.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : null;
      };
      const csrf = getCookie('refreshCsrf');
      if (csrf) config.headers['x-csrf-token'] = csrf;
    }
  } catch (e) {
    // ignore in non-browser environments
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${baseURL}/auth/refresh`,
          {},
          { headers: { 'Content-Type': 'application/json' }, withCredentials: true }
        );

        localStorage.setItem('accessToken', response.data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
