import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe, postLogin, postLogout, patchMe } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getMe()
      .then(({ user: u }) => {
        if (alive) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const { ok, data } = await postLogin({ username, password });
    if (!ok) throw new Error(data.error || 'That username or password is not right.');
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await postLogout();
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const { ok, data } = await patchMe(patch);
    if (!ok) throw new Error(data.error || 'Could not save your profile.');
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
