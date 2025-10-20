// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/Kiosk/token.ts

import apiKiosk from "@/components/apis/apiKiosk";

type DeviceType = "cash" | "commander" | "monitor";

export function getKioskJwtSync(): string | null {
  return sessionStorage.getItem("kiosk_jwt");
}
export function isKioskJwtValid(): boolean {
  const expStr = sessionStorage.getItem("kiosk_jwt_exp");
  if (!expStr) return false;
  return Number(expStr) - Date.now() > 15_000; // 15s colchón
}

/** Login de operador con PIN usando el kiosk_token actual */
export async function kioskLoginWithPin(pin: string): Promise<string> {
  const kt = sessionStorage.getItem("kiosk_token");
  if (!kt) throw new Error("Dispositivo no emparejado");

  const res = await apiKiosk.post(
    "/kiosk/login",
    { password: pin },
    {
      headers: { "X-Kiosk-Token": kt }, // 👈 header consistente
      validateStatus: () => true, // no lances aquí, manejamos abajo
    }
  );

  const data = res.data || {};
  if (res.status !== 200 || !data.jwt) {
    throw new Error(data.error || "PIN incorrecto o servidor no disponible");
  }

  const jwt = data.jwt as string;
  const ttl = 20 * 60 * 1000; // 20m (si luego mandas expiresInMs, úsalo aquí)
  sessionStorage.setItem("kiosk_jwt", jwt);
  sessionStorage.setItem("kiosk_jwt_exp", String(Date.now() + ttl));
  return jwt;
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
  return kioskLoginWithPin(pin);
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
