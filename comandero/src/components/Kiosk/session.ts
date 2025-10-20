// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Kiosk/session.ts
// Borra solo la sesión del operador (mantiene el dispositivo emparejado)
import apiKiosk from "@/components/apis/apiKiosk";

export function kioskLogoutOperator() {
  try {
    sessionStorage.removeItem("kiosk_jwt");
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
      await fetch(`${import.meta.env.VITE_AUTH_API}/kiosk/unpair`, {
        method: "POST",
        headers: { "X-Kiosk-Token": token },
      }).catch(() => {});
    }
  } finally {
    sessionStorage.removeItem("kiosk_token");
    sessionStorage.removeItem("kiosk_jwt");
    sessionStorage.removeItem("kiosk_jwt_exp");
  }
}
