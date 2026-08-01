import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as authApi from '../../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!authApi.getToken()) {
        setLoading(false);
        return;
      }
      try {
        const res = await authApi.me();
        setUser(res.data.user);
      } catch {
        authApi.clearToken();
      }
      setLoading(false);
    })();
  }, []);

  const signIn = useCallback(async (credentials) => {
    const res = credentials.google
      ? await authApi.loginWithGoogle(credentials.google)
      : await authApi.login(credentials.dev);
    authApi.setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const signOut = useCallback(() => {
    authApi.clearToken();
    setUser(null);
  }, []);

  const setUserFromResponse = useCallback((res) => setUser(res.data.user), []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUserFromResponse }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
