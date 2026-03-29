import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Rol = 'ADMINISTRADOR' | 'RRHH' | 'SUPERVISOR' | 'TRABAJADOR';

interface User {
  id?: number;
  username?: string;
  email?: string;
  rut: string;
  nombres: string;
  rol: Rol;
  trabajador_rut?: string | null;
  area?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('serkan_user');
    const savedToken = localStorage.getItem('serkan_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('serkan_token', token);
    localStorage.setItem('serkan_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('serkan_token');
    localStorage.removeItem('serkan_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
};
