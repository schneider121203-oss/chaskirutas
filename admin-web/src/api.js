import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({ baseURL });

// Inyecta el JWT guardado en cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chaski_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira/es inválido, limpia y manda al login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('chaski_admin_token');
      localStorage.removeItem('chaski_admin_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Extrae un mensaje de error legible de una respuesta de NestJS.
export function apiError(error, fallback = 'Ocurrió un error') {
  const raw = error?.response?.data?.message;
  if (Array.isArray(raw)) return raw.join(', ');
  return raw || error?.message || fallback;
}
