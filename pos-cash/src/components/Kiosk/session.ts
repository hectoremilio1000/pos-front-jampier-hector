// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/Kiosk/session.ts
// Sesión de Kiosk para POS Cash (alineado con Comandero)
import apiKiosk from "@/components/apis/apiKiosk";

// Borra solo la sesión del operador (mantiene el dispositivo emparejado)
export async function kioskPingOnce() {
  const token = sessionStorage.getItem("kiosk_token");
  if (!token) return;
  try {
    await apiKiosk.post("/kiosk/ping", null, {
      headers: { "X-Kiosk-Token": token },
      validateStatus: () => true,
    });
  } catch {
    // silencioso: el heartbeat no bloquea la UI
  }
}

export function kioskLogoutOperator() {
  try {
    sessionStorage.removeItem("kiosk_jwt");
    sessionStorage.removeItem("cash_shift_id");
    sessionStorage.removeItem("cash_session_id");
    sessionStorage.removeItem("kiosk_jwt_exp");
  } catch {}
}

export async function kioskCheckPairedStatus(): Promise<
  "paired" | "revoked" | "invalid" | "offline"
> {
  const token = sessionStorage.getItem("kiosk_token");
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
  const token = sessionStorage.getItem("kiosk_token");
  try {
    if (token) {
      // intenta notificar al backend; si falla seguimos limpiando local
      await fetch(`${import.meta.env.VITE_API_URL_AUTH}/kiosk/unpair`, {
        method: "POST",
        headers: { "X-Kiosk-Token": token },
      }).catch(() => {});
    }
  } finally {
    kioskLogoutOperator();
    sessionStorage.removeItem("kiosk_token");
    sessionStorage.removeItem("cash_shift_id"); // específico de Cash
  }
}
