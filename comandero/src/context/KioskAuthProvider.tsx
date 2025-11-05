import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  kioskPairStart,
  kioskPairConfirm,
  kioskLoginWithPin,
  getKioskJwtSync,
} from "@/components/Kiosk/token";
import {
  kioskCheckPairedStatus,
  kioskLogoutOperator,
  kioskUnpairDevice,
} from "@/components/Kiosk/session";
import apiOrder from "@/components/apis/apiOrder";

/** Normaliza exp a ms si hiciera falta (seguridad) */
function normalizeExpToMs(exp: number | string | null): number | null {
  if (exp == null) return null;
  const n = Number(exp);
  if (Number.isNaN(n)) return null;
  return n < 1e12 ? n * 1000 : n; // segundos → ms
}
function isExpValidMs(expMs: number | null, thresholdMs = 15_000): boolean {
  if (!expMs) return false;
  return expMs - Date.now() > thresholdMs;
}

/** sessionStorage keys (como en tu app) */
const K = {
  jwt: "kiosk_jwt",
  exp: "kiosk_jwt_exp",
  kioskToken: "kiosk_token",
  deviceLabel: "kiosk_device_name",
  restaurantId: "kiosk_restaurant_id",
  stationId: "kiosk_station_id",
  deviceType: "kiosk_device_type",
  shiftId: "kiosk_shift_id",
  user: "kiosk_user_json",
  pairState: "kiosk_pair_state", // "none" | "paired" | "revoked"
};

type PairState = "none" | "paired" | "revoked";
type DeviceType = "cashier" | "commander" | "monitor";
type KioskUser = { id: number; fullName: string; role: string };

type PairParams = {
  code: string;
  deviceType: "commander" | "cashier" | "monitor";
  deviceName?: string;
  deviceId?: number;
  fingerprint?: string;
};

type Ctx = {
  // estado base
  jwt: string | null;
  expMs: number | null;
  restaurantId: number | null;
  stationId: number | null;
  deviceType: DeviceType | null;
  shiftId: number | null;
  user: KioskUser | null;

  // pairing
  pairState: PairState;
  deviceLabel: string | null;
  hasPair: boolean;

  // validación
  isJwtValid: () => boolean;

  // acciones
  pair: (params: PairParams) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  refreshShift: () => Promise<boolean>;
  unpair: () => Promise<void>;
  logout: () => void;
};

const KioskAuthContext = createContext<Ctx | null>(null);

export function KioskAuthProvider({ children }: { children: React.ReactNode }) {
  // ---------- inicialización SIN efectos (lee sessionStorage en el primer render) ----------
  const [jwt, setJwt] = useState<string | null>(() => getKioskJwtSync());
  const [expMs, setExpMs] = useState<number | null>(() =>
    normalizeExpToMs(sessionStorage.getItem(K.exp))
  );
  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const rid = Number(sessionStorage.getItem(K.restaurantId) || "0");
    return rid || null;
  });
  const [stationId, setStationId] = useState<number | null>(() => {
    const sid = Number(sessionStorage.getItem(K.stationId) || "0");
    return sid || null;
  });
  const [deviceType, setDeviceType] = useState<DeviceType | null>(() => {
    return (sessionStorage.getItem(K.deviceType) as DeviceType) || null;
  });
  const [shiftId, setShiftId] = useState<number | null>(() => {
    const sh = Number(sessionStorage.getItem(K.shiftId) || "0");
    return sh || null;
  });
  const [user, setUser] = useState<KioskUser | null>(() => {
    const uj = sessionStorage.getItem(K.user);
    return uj ? JSON.parse(uj) : null;
  });

  const [pairState, setPairState] = useState<PairState>(() => {
    const stored = sessionStorage.getItem(K.pairState) as PairState | null;
    if (stored) return stored;
    return sessionStorage.getItem(K.kioskToken) ? "paired" : "none";
  });
  const [deviceLabel, setDeviceLabel] = useState<string | null>(() => {
    return sessionStorage.getItem(K.deviceLabel) || null;
  });

  // ---------- derivados ----------
  const hasPair = useMemo(
    () => !!sessionStorage.getItem(K.kioskToken) && pairState === "paired",
    [pairState]
  );
  const isJwtValid = useCallback(() => isExpValidMs(expMs), [expMs]);

  // ---------- helpers persistentes ----------
  const persistUserMetaFromLogin = (meta: {
    restaurantId: number;
    stationId: number | null;
    deviceType: DeviceType;
  }) => {
    setRestaurantId(meta.restaurantId);
    setStationId(meta.stationId ?? null);
    setDeviceType(meta.deviceType);

    sessionStorage.setItem(K.restaurantId, String(meta.restaurantId));
    if (meta.stationId != null)
      sessionStorage.setItem(K.stationId, String(meta.stationId));
    else sessionStorage.removeItem(K.stationId);
    sessionStorage.setItem(K.deviceType, meta.deviceType);
  };

  const persistShift = (sid: number | null) => {
    setShiftId(sid);
    if (sid) sessionStorage.setItem(K.shiftId, String(sid));
    else sessionStorage.removeItem(K.shiftId);
  };

  const persistUser = (u: KioskUser | null) => {
    setUser(u);
    if (u) sessionStorage.setItem(K.user, JSON.stringify(u));
    else sessionStorage.removeItem(K.user);
  };

  // ---------- acciones ----------
  const pair = useCallback(
    async ({
      code,
      deviceType,
      deviceName,
      deviceId,
      fingerprint,
    }: PairParams) => {
      const start = await kioskPairStart(code.trim(), deviceType);
      if (deviceType === "commander" && start?.requireStation) {
        throw new Error("Commander no requiere estación; revisa deviceType");
      }
      await kioskPairConfirm({
        code: code.trim(),
        deviceType,
        deviceName: (deviceName || "").trim() || "Comandero",
        deviceId,
        fingerprint,
      });

      const label = (deviceName || "").trim() || "Comandero";
      setDeviceLabel(label);
      sessionStorage.setItem(K.deviceLabel, label);
      setPairState("paired");
      sessionStorage.setItem(K.pairState, "paired");
    },
    []
  );

  const loginWithPin = useCallback(async (pin: string) => {
    const resp = await kioskLoginWithPin(pin);
    // kioskLoginWithPin ya setea kiosk_jwt y kiosk_jwt_exp (ms)
    setJwt(sessionStorage.getItem(K.jwt));
    setExpMs(normalizeExpToMs(sessionStorage.getItem(K.exp)));

    persistUserMetaFromLogin({
      restaurantId: resp.device.restaurantId,
      stationId: resp.device.stationId,
      deviceType: resp.device.deviceType,
    });
    persistUser(resp.user);
    persistShift(resp.shift?.id ?? null);
  }, []);

  const refreshShift = useCallback(async () => {
    try {
      if (!restaurantId) return false;
      const url = `/shifts/current?restaurantId=${restaurantId}`;
      const res = await apiOrder.get(url);
      console.log(res.data);

      const id = res.data?.id;
      if (id) {
        persistShift(id);
        return true;
      }
      persistShift(null);
      return false;
    } catch {
      return false;
    }
  }, [restaurantId]);

  const unpair = useCallback(async () => {
    await kioskUnpairDevice().catch(() => {});
    setPairState("none");
    sessionStorage.setItem(K.pairState, "none");
    setDeviceLabel(null);
  }, []);

  const logout = useCallback(() => {
    kioskLogoutOperator();
    setJwt(null);
    setExpMs(null);
    persistUser(null);
    persistShift(null);
  }, []);

  // (opcional) verificar “revoked” en background sin afectar el primer render
  useEffect(() => {
    (async () => {
      const status = await kioskCheckPairedStatus();
      if (status === "paired") {
        setPairState("paired");
        sessionStorage.setItem(K.pairState, "paired");
      } else if (status === "revoked") {
        sessionStorage.removeItem(K.kioskToken);
        sessionStorage.setItem(K.pairState, "revoked");
        setPairState("revoked");
      }
    })();
  }, []);

  const value: Ctx = {
    jwt,
    expMs,
    restaurantId,
    stationId,
    deviceType,
    shiftId,
    user,

    pairState,
    deviceLabel,
    hasPair,

    isJwtValid: () => isExpValidMs(expMs),

    pair,
    loginWithPin,
    refreshShift,
    unpair,
    logout,
  };

  return (
    <KioskAuthContext.Provider value={value}>
      {children}
    </KioskAuthContext.Provider>
  );
}

export function useKioskAuth() {
  const ctx = useContext(KioskAuthContext);
  if (!ctx)
    throw new Error("useKioskAuth must be used within KioskAuthProvider");
  return ctx;
}
