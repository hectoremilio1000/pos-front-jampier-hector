import apiKiosk from "@/components/apis/apiKiosk";

export function getKioskJwtSync(): string | null {
  return sessionStorage.getItem("kiosk_jwt");
}
export function isKioskJwtValid(): boolean {
  const expStr = sessionStorage.getItem("kiosk_jwt_exp");
  if (!expStr) return false;
  return Number(expStr) - Date.now() > 15_000; // 15s colchón
}

// Login de operador con PIN usando el kiosk_token actual
export async function kioskLoginWithPin(pin: string): Promise<string> {
  const kt = sessionStorage.getItem("kiosk_token");
  if (!kt) throw new Error("no_kiosk_token");
  const { data } = await apiKiosk.post(
    "/kiosk/login",
    { password: pin },
    { headers: { "x-kiosk-token": kt } }
  );
  const jwt = data.jwt as string;
  const ttl = 20 * 60 * 1000; // 20m
  sessionStorage.setItem("kiosk_jwt", jwt);
  sessionStorage.setItem("kiosk_jwt_exp", String(Date.now() + ttl));
  return jwt;
}

// Devuelve jwt válido o pide pinProvider() para relogin rápido
export async function getFreshKioskJwt(
  pinProvider?: () => Promise<string>
): Promise<string> {
  const ok = isKioskJwtValid();
  const t = getKioskJwtSync();
  if (ok && t) return t;

  if (!pinProvider) throw new Error("kiosk_jwt_needed");
  const pin = await pinProvider(); // abre un modal o input para PIN (6 dígitos)
  return kioskLoginWithPin(pin);
}

// Primer paso de pairing (commander/monitor/cash)
export async function kioskPairStart(
  code: string,
  deviceType: "commander" | "cash" | "monitor"
) {
  const { data } = await apiKiosk.post("/kiosk/pair/start", {
    code,
    deviceType,
  });
  return data; // { restaurantId, deviceType, requireStation, stations? }
}

// Confirmar pairing → guarda kiosk_token
export async function kioskPairConfirm(payload: {
  code: string;
  deviceType: "commander" | "cash" | "monitor";
  deviceName: string;
  stationId?: number;
  fingerprint?: string;
}) {
  const { data } = await apiKiosk.post("/kiosk/pair/confirm", payload);
  const kt = data.kioskToken as string;
  sessionStorage.setItem("kiosk_token", kt);
  return kt;
}
