// src/components/Auth/AuthContext.tsx
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiAuth from "../apis/apiAuth";
import apiCash from "../apis/apiCash";
import { message } from "antd";

interface Restaurant {
  id: number;
  name: string;
  address?: string;
}
interface User {
  id: number;
  email: string;
  fullName: string;
  role: { code: string; name: string };
  restaurant?: Restaurant | null;
}
interface Shift {
  id: number;
  restaurantId: number;
  userId: number;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  status: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null; // opaco
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  shift: Shift | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [token, setToken] = useState<string | null>(null); // opaco
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const apiUrlAuth = import.meta.env.VITE_API_URL_AUTH;

  // sesión vieja: opaco sin refresh → forzar login
  useEffect(() => {
    const opaque = sessionStorage.getItem("token");
    const hasRefresh = !!sessionStorage.getItem("refresh_token");

    if (opaque && !hasRefresh) {
      sessionStorage.clear();
      navigate("/login");
      setLoading(false);
      return;
    }

    if (opaque) {
      setToken(opaque);
      apiAuth
        .get("/me")
        .then((res) => setUser(res.data))
        .catch(() => logout());

      // Si tu API de cash permite /shifts/current sin params, lo dejamos.
      // Si requiere stationCode, deberás pasarlo desde UI.
      apiCash
        .get("/shifts/current")
        .then((res) => setShift(res.data || null))
        .catch(() => setShift(null));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${apiUrlAuth}/login`, { email, password });

    const role = res.data.user?.role?.code;
    // permite waiter/captain/owner/admin/superadmin según necesites
    if (!["waiter", "captain", "owner", "admin", "superadmin"].includes(role)) {
      message.error("No tienes permisos para entrar al Comandero");
      return;
    }

    // 1) OPACO
    const opaque = res.data.admin_session_token as string;
    setToken(opaque);
    sessionStorage.setItem("token", opaque);

    // 2) JWT corto + refresh
    const access = res.data.access_jwt as string | undefined;
    const refresh = res.data.refresh_token as string | undefined;
    if (access) {
      const ttl = Number(res.data.expires_in ?? 600);
      sessionStorage.setItem("access_jwt", access);
      sessionStorage.setItem("access_jwt_exp", String(Date.now() + ttl * 1000));
    }
    if (refresh) {
      sessionStorage.setItem("refresh_token", refresh);
    }

    // 3) /me con opaco
    const meRes = await apiAuth.get("/me");
    setUser(meRes.data);

    // 4) Shift actual (si tu endpoint lo permite sin params)
    try {
      const { data } = await apiCash.get("/shifts/current");
      setShift(data || null);
    } catch {
      setShift(null);
    }

    navigate("/control");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setShift(null);
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, loading, shift }}
    >
      {children}
    </AuthContext.Provider>
  );
};
