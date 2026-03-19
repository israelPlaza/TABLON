import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiLogin, apiMe, setToken, clearToken, getToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session from stored token
  useEffect(() => {
    const restore = async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const me = await apiMe();
        setUser(me);
      } catch (_) {
        clearToken();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    setToken(data.access_token);
    const me = await apiMe();
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
