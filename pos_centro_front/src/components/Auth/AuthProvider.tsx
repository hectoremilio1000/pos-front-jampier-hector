// src/components/Auth/AuthProvider.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiAuth from "@/apis/apiAuth";
import { message } from "antd";
import { AuthContext } from "./AuthContext";
import type { User } from "./types";
import axios from "axios";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = sessionStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      apiAuth
        .get("/me")
        .then((res) => setUser(res.data))
        .catch(() => logout());
    }
    setLoading(false);
  }, []);

  const apiUrlLogin = import.meta.env.VITE_API_URL_AUTH;

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${apiUrlLogin}/login`, { email, password });
    if (["superadmin"].includes(res.data.user.role.code)) {
      setToken(res.data.value);
      sessionStorage.setItem("token", res.data.value);
      const meRes = await apiAuth.get("/me");
      setUser(meRes.data);
      navigate("/dashboard");
    } else {
      navigate("/");
      message.error("No tienes permisos para entrar");
    }
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
