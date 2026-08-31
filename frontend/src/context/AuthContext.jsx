import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { getAuthToken, setAuthToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!getAuthToken()) {
      setAdmin(null);
      setChecking(false);
      return;
    }
    try {
      const me = await api.me();
      setAdmin(me);
    } catch (_) {
      setAuthToken("");
      setAdmin(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  async function login(username, password) {
    const data = await api.login(username, password);
    setAuthToken(data.access_token);
    setAdmin(data.admin);
    return data.admin;
  }

  function logout() {
    setAuthToken("");
    setAdmin(null);
  }

  const value = {
    admin,
    isAdmin: Boolean(admin),
    isSuperAdmin: admin?.role === "superadmin",
    checking,
    login,
    logout,
    refreshMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
