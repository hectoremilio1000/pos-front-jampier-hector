// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Kiosk/token.ts

import apiKiosk from "@/components/apis/apiKiosk";

type DeviceType = "cashier" | "commander" | "monitor";

export function getKioskJwtSync(): string | null {
  return sessionStorage.getItem("kiosk_jwt");
}
export function isKioskJwtValid(): boolean {
  const expStr = sessionStorage.getItem("kiosk_jwt_exp");
  if (!expStr) return false;
  return Number(expStr) - Date.now() > 15_000; // 15s colchón
}

/** Login de operador con PIN usando el kiosk_token actual */
type KioskLoginResponse = {
  jwt: string;
  user: { id: number; fullName: string; role: string };
  device: {
    restaurantId: number;
    stationId: number | null;
    deviceType: "cashier" | "commander" | "monitor";
  };
  shift: { id: number; business_date?: string; opened_at?: string } | null;
  expiresIn?: string; // "20m" (opcional)
};

export async function kioskLoginWithPin(
  pin: string
): Promise<KioskLoginResponse> {
  const kt = sessionStorage.getItem("kiosk_token");
  if (!kt) throw new Error("Dispositivo no emparejado");

  const res = await apiKiosk.post(
    "/kiosk/login",
    { password: pin },
    {
      headers: { "X-Kiosk-Token": kt },
      validateStatus: () => true,
    }
  );

  const data = (res.data || {}) as Partial<KioskLoginResponse>;
  if (res.status !== 200 || !data.jwt || !data.user || !data.device) {
    throw new Error(
      (res.data && res.data.error) || "PIN incorrecto o servidor no disponible"
    );
  }

  // Guarda JWT y expiración como antes
  const jwt = data.jwt;
  const ttl = 20 * 60 * 1000; // 20 min (si luego envías expiresInMs, usa eso)
  sessionStorage.setItem("kiosk_jwt", jwt);
  sessionStorage.setItem("kiosk_jwt_exp", String(Date.now() + ttl));

  // Devuelve TODO para que el provider guarde metadatos
  return data as KioskLoginResponse;
}

/** Devuelve jwt válido o pide pinProvider() para relogin rápido */

export async function getFreshKioskJwt(
  pinProvider?: () => Promise<string>
): Promise<string> {
  const ok = isKioskJwtValid();
  const t = getKioskJwtSync();
  if (ok && t) return t;

  if (!pinProvider) throw new Error("kiosk_jwt_needed");
  const pin = await pinProvider();
  const resp = await kioskLoginWithPin(pin); // <- ahora devuelve objeto
  return resp.jwt; // <- entregamos solo el string
}

/** Primer paso de pairing (commander/monitor/cash) */
export async function kioskPairStart(code: string, deviceType: DeviceType) {
  const res = await apiKiosk.post(
    "/kiosk/pair/start",
    { code, deviceType },
    { validateStatus: () => true }
  );
  const data = res.data || {};
  if (res.status !== 200) {
    throw new Error(data.error || "No se pudo iniciar el emparejamiento");
  }
  return data; // { restaurantId, deviceType, requireStation, stations? }
}

/** Confirmar pairing → guarda kiosk_token (permite reusar deviceId) */
export type PairConfirmBody = {
  code: string;
  deviceType: DeviceType;
  deviceName: string;
  stationId?: number;
  fingerprint?: string;
  deviceId?: number; // 👈 NUEVO
};

export async function kioskPairConfirm(payload: PairConfirmBody) {
  const res = await apiKiosk.post("/kiosk/pair/confirm", payload, {
    validateStatus: () => true,
  });
  const data = res.data || {};
  if (res.status !== 200 || !data.kioskToken) {
    throw new Error(data.error || "No se pudo confirmar el emparejamiento");
  }
  const kt = data.kioskToken as string;
  sessionStorage.setItem("kiosk_token", kt);
  return kt;
}
