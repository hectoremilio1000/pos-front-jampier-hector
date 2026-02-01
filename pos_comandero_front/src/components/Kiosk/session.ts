// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Kiosk/session.ts
// Borra solo la sesión del operador (mantiene el dispositivo emparejado)
import apiKiosk from "@/components/apis/apiKiosk";

const PAIR_KEY = "kiosk_token";

/** ✅ Lee token de pairing de localStorage (y migra si aún vive en sessionStorage) */
export function getKioskPairToken(): string | null {
  const ls = localStorage.getItem(PAIR_KEY);
  if (ls) return ls;

  // 🔁 migración automática (compatibilidad con devices ya emparejados)
  const ss = sessionStorage.getItem(PAIR_KEY);
  if (ss) {
    localStorage.setItem(PAIR_KEY, ss);
    sessionStorage.removeItem(PAIR_KEY);
    return ss;
  }
  return null;
}

/** ✅ Borra pairing token de TODOS lados */
export function clearKioskPairToken() {
  localStorage.removeItem(PAIR_KEY);
  sessionStorage.removeItem(PAIR_KEY);
}

export function kioskLogoutOperator() {
  try {
    sessionStorage.removeItem("kiosk_jwt");
    sessionStorage.removeItem("kiosk_jwt_exp");
  } catch {}
}

export async function kioskCheckPairedStatus(): Promise<
  "paired" | "revoked" | "invalid" | "offline"
> {
  const token = getKioskPairToken();
  if (!token) return "invalid";

  try {
    const res = await apiKiosk.post("/kiosk/ping", null, {
      headers: { "X-Kiosk-Token": token },
      validateStatus: () => true,
    });

    if (res.status >= 200 && res.status < 300) return "paired";
    if (res.status === 401) return "revoked";
    return "offline";
  } catch {
    return "offline";
  }
}

// Desempareja dispositivo (opcionalmente revoca en backend) y borra todo
export async function kioskUnpairDevice() {
  const token = getKioskPairToken();
  try {
    if (token) {
      await fetch(`${import.meta.env.VITE_AUTH_API}/kiosk/unpair`, {
        method: "POST",
        headers: { "X-Kiosk-Token": token },
      }).catch(() => {});
    }
  } finally {
    clearKioskPairToken();
    sessionStorage.removeItem("kiosk_jwt");
    sessionStorage.removeItem("kiosk_jwt_exp");
  }
}
