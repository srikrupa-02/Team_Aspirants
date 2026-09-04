import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile } from "../types.js";
import { authService, getToken, setToken, clearToken } from "../services/api.js";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string, company?: string, job?: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSession() {
      const storedToken = getToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await authService.me();
        setUser(res.user);
      } catch (err) {
        clearToken();
        setTokenState(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authService.login({ email, password: pass });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name?: string, company?: string, job?: string) => {
    const res = await authService.register({
      email,
      password: pass,
      full_name: name,
      company,
      job_title: job
    });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const demoLogin = async () => {
    const res = await authService.demo();
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
