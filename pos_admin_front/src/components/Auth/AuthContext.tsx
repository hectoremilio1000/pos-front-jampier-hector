// src/components/Auth/AuthContext.tsx  (puedes mantener el mismo archivo y nombre)
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiAuth from "../apis/apiAuth";
import { message } from "antd";
import {
  clearAuthStorage,
  getAuthItem,
  setAuthItem,
} from "@/utils/authStorage";

interface Restaurant {
  id: number;
  name: string;
  address?: string | null;
  currency?: string | null;
  localBaseUrl?: string | null;
}

interface User {
  id: number;
  email: string;
  fullName: string;
  role: { code: string; name: string };
  restaurantId?: number | string | null;
  restaurant?: Restaurant | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null; // ← opaco del panel
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // ← admin_session_token
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Restaura sesión (opaco) para el panel
  useEffect(() => {
    const opaque = getAuthItem("token"); // opaco del panel
    const hasRefresh = !!getAuthItem("refresh_token");

    if (opaque && !hasRefresh) {
      clearAuthStorage();
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
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // 1) Login
      const res = await apiAuth.post("/login", { email, password });

      if (import.meta.env.DEV) {
        console.groupCollapsed(
          "%c[/login] OK",
          "color:#4caf50;font-weight:bold;",
        );
        console.log("status:", res.status);
        console.log("data:", res.data);
        console.groupEnd();
      }

      const data = res?.data ?? {};
      const user = data?.user ?? {};

      // 2) Normalización de rol y status
      const allowedAdminRoles = [
        "owner",
        "admin",
        "superadmin",
        "manager",
        "captain",
      ] as const;

      const roleRaw =
        user?.role?.code ?? user?.role_code ?? user?.roleCode ?? null;

      const statusRaw = (user?.status ?? "active") as string;
      if (statusRaw === "inactive") {
        message.error("Tu usuario está inactivo");
        return;
      }

      if (
        roleRaw &&
        !(allowedAdminRoles as readonly string[]).includes(String(roleRaw))
      ) {
        message.error("No tienes permisos para entrar");
        return;
      }

      // 3) Tokens
      const opaque = data?.admin_session_token as string | undefined;
      const access = data?.access_jwt as string | undefined;
      const refresh = data?.refresh_token as string | undefined;

      if (!opaque || typeof opaque !== "string") {
        message.error("No se recibió token de sesión del panel");
        if (import.meta.env.DEV)
          console.warn("[login] admin_session_token faltante:", { opaque });
        return;
      }

      // 4) Persistencia
      setToken(opaque);
      setAuthItem("token", opaque);

      if (access) {
        setAuthItem("access_jwt", access);
        const ttlSec = Number.isFinite(Number(data?.expires_in))
          ? Number(data?.expires_in)
          : 600;
        setAuthItem("access_jwt_exp", String(Date.now() + ttlSec * 1000));
      }
      if (refresh) setAuthItem("refresh_token", refresh);

      // 5) Cargar perfil con /me (retry con refresh si 401)
      let meData: any = null;
      try {
        const meRes = await apiAuth.get("/me");
        meData = meRes.data;
      } catch (meErr: any) {
        const is401 = meErr?.response?.status === 401;
        const hasRefresh = !!getAuthItem("refresh_token");
        if (is401 && hasRefresh) {
          if (import.meta.env.DEV)
            console.warn("[/me] 401, intentando refresh…");
          try {
            const refreshToken = getAuthItem("refresh_token");
            const r = await apiAuth.post("/auth/refresh", {
              refresh_token: refreshToken,
            });
            const newAccess = r?.data?.access_jwt as string | undefined;
            const newTtl = Number.isFinite(Number(r?.data?.expires_in))
              ? Number(r?.data?.expires_in)
              : 600;
            if (newAccess) {
              setAuthItem("access_jwt", newAccess);
              setAuthItem("access_jwt_exp", String(Date.now() + newTtl * 1000));
            }
            const meRes2 = await apiAuth.get("/me");
            meData = meRes2.data;
          } catch (refreshErr) {
            clearAuthStorage();
            setToken(null);
            setUser(null);
            message.error("Sesión expirada, inicia sesión de nuevo");
            navigate("/login");
            return;
          }
        } else {
          if (import.meta.env.DEV)
            console.error("[/me] fallo:", meErr?.response ?? meErr);
          message.error("No se pudo validar tu sesión");
          return;
        }
      }

      if (!meData) {
        message.error("No se pudo cargar tu perfil");
        return;
      }

      setUser(meData);
      navigate("/dashboard");
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.groupCollapsed(
          "%c[/login] ERROR",
          "color:#f44336;font-weight:bold;",
        );
        console.log("status:", err?.response?.status);
        console.log("data:", err?.response?.data);
        console.log("error:", err);
        console.groupEnd();
      }
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Error de autenticación";
      message.error(msg);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearAuthStorage();
    navigate("/login");
  };
  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
