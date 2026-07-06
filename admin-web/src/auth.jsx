import { createContext, useContext, useState, useCallback } from 'react';
import { api } from './api.js';

const AuthContext = createContext(null);

// Roles autorizados a usar el panel de backoffice.
export const BACKOFFICE_ROLES = ['ADMIN', 'OPERADOR', 'SUPERVISOR'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('chaski_admin_user');
    return raw ? JSON.parse(raw) : null;
  });

  const sendOtp = useCallback(async (phone) => {
    const res = await api.post('/auth/otp/send', { phone });
    return res.data; // { devCode, ... }
  }, []);

  const verifyOtp = useCallback(async (phone, code) => {
    const res = await api.post('/auth/otp/verify', { phone, code });
    const { accessToken, user: u } = res.data;

    const roles = u?.roles || [];
    const isBackoffice = roles.some((r) => BACKOFFICE_ROLES.includes(r));
    if (!isBackoffice) {
      throw new Error('Esta cuenta no tiene acceso al panel administrativo.');
    }

    localStorage.setItem('chaski_admin_token', accessToken);
    localStorage.setItem('chaski_admin_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chaski_admin_token');
    localStorage.removeItem('chaski_admin_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
