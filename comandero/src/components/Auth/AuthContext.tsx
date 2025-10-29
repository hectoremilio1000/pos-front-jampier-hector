// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Auth/AuthContext.tsx
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiAuth from "../apis/apiAuth";
import apiCash from "../apis/apiCash";
import { message } from "antd";
import { kioskCheckPairedStatus } from "../Kiosk/session";
import {
  kioskLoginWithPin,
  kioskPairConfirm,
  kioskPairStart,
} from "../Kiosk/token";

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
  doLogin: (pin: string) => Promise<void>;
  doPair: (
    code: string,
    deviceName: string,
    selectedDeviceId: number
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
  shift: Shift | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);

  const [kioskToken, setKioskToken] = useState<string | null>(null); // opaco
  const [kioskJwt, setKioskJwt] = useState<string | null>(null); // opaco
  const [kioskJwtExp, setKioskJwtExp] = useState<string | null>(null); // opaco
  const [kioskDeviceName, setKioskDeviceName] = useState<string | null>(null); // opaco

  const [hasPair, setHasPair] = useState<boolean>(
    !!sessionStorage.getItem("kiosk_token")
  );
  type PairState = "none" | "paired" | "revoked";
  const [pairState, setPairState] = useState<PairState>(
    sessionStorage.getItem("kiosk_token") ? "paired" : "none"
  );
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const status = await kioskCheckPairedStatus();
      if (status === "paired") {
        setHasPair(true);
        setPairState("paired");
      } else if (status === "revoked") {
        sessionStorage.removeItem("kiosk_token");
        sessionStorage.removeItem("kiosk_device_name");
        setHasPair(false);
        setPairState("revoked");
        message.warning(
          "Este dispositivo fue revocado desde Admin. Vuelve a emparejarlo."
        );
        navigate("/login");
      } else if (status === "invalid") {
        setHasPair(false);
        setPairState("none");
      }
    })();
  }, []);
  function getFingerprint(): string {
    const KEY = "kiosk_fp";
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const fp = `web-${crypto.randomUUID()}`;
    localStorage.setItem(KEY, fp);
    return fp;
  }
  async function doPair(
    code: string,
    deviceName: string,
    selectedDeviceId: number
  ) {
    try {
      if (sessionStorage.getItem("kiosk_token")) {
        setHasPair(true);
        setPairState("paired");
        return message.info("Este dispositivo ya está emparejado");
      }
      if (!code.trim()) return message.warning("Ingresa el pairing code");
      setLoading(true);
      const start = await kioskPairStart(code.trim(), "commander");
      if (start.requireStation) {
        message.error("Commander no requiere estación; revisa deviceType");
        return;
      }
      await kioskPairConfirm({
        code: code.trim(),
        deviceType: "commander",
        deviceName: deviceName.trim() || "Comandero",
        fingerprint: getFingerprint(),
        deviceId: selectedDeviceId ?? undefined,
      });
      const label = deviceName.trim() || "Comandero";
      sessionStorage.setItem("kiosk_device_name", label);

      setHasPair(true);
      setPairState("paired");
      message.success("Dispositivo emparejado");
    } catch (e: any) {
      const txt = String(e?.message || "");
      if (txt.includes("DEVICE_IN_USE")) {
        message.error(
          "Ese dispositivo ya está emparejado en otro equipo. Elige otro o desemparéjalo desde Admin."
        );
      } else {
        message.error(txt || "No se pudo emparejar");
      }
    } finally {
      setLoading(false);
    }
  }

  async function doLogin(pin: string) {
    try {
      if (!/^\d{6}$/.test(pin))
        return message.warning("PIN inválido (6 dígitos)");
      setLoading(true);
      await kioskLoginWithPin(pin);
      navigate("/control", { replace: true });
    } catch (e: any) {
      const msg =
        e?.message || e?.response?.data?.error || "No se pudo iniciar sesión";
      if (/revocado/i.test(msg)) {
        sessionStorage.removeItem("kiosk_token");
        sessionStorage.removeItem("kiosk_device_name");
        setHasPair(false);
        setPairState("revoked");
        message.error("Dispositivo revocado. Vuelve a emparejar.");
      } else {
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const logout = () => {
    setKioskToken(null);
    setKioskDeviceName(null);
    setKioskJwt(null);
    setKioskJwtExp(null);
    setKioskDeviceName(null);
    setUser(null);
    setShift(null);
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        kioskToken,
        kioskJwt,
        kioskJwtExp,
        kioskDeviceName,
        doLogin,
        doPair,
        logout,
        loading,
        shift,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
