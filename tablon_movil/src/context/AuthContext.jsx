import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiLogin, apiMe, saveToken, removeToken, getToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await apiMe();
          setUser(me);
        }
      } catch (_) {
        await removeToken();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    await saveToken(data.access_token);
    const me = await apiMe();
    setUser(me);
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
