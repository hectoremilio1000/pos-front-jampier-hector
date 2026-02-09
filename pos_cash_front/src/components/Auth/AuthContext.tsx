import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiAuth from "@/components/apis/apiAuth";
import { message } from "antd";

interface AuthContextType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any | null;
  token: string | null; // opaco (admin_session_token)
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null); // opaco del panel
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // MONTAR: si hay opaco pero NO refresh_token ⇒ sesión vieja → forzar login
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
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiAuth.post("/login", { email, password });

    const role = res.data.user?.role?.code;
    if (!["cashier", "owner", "admin", "superadmin"].includes(role)) {
      message.error("No tienes permisos para entrar");
      return;
    }

    // 1) OPACO para panel (pos-auth con guard api)
    const opaque = res.data.admin_session_token as string;
    setToken(opaque);
    sessionStorage.setItem("token", opaque);

    // 2) JWT corto + refresh para microservicios (pos-cash-api, pos-order-api)
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

    navigate("/dashboard");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
