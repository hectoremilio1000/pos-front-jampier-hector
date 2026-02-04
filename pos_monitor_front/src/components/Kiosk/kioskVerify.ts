const AUTH_API = import.meta.env.VITE_API_URL_AUTH; // p. ej. http://localhost:3333/api

export type VerifyResult =
  | { ok: true; payload: any }
  | { ok: false; error: string };

export async function verifyKioskToken(): Promise<VerifyResult> {
  const token = sessionStorage.getItem("kiosk_token") || "";
  if (!token) return { ok: false, error: "missing_token" };

  try {
    const r = await fetch(`${AUTH_API}/kiosk/verify`, {
      method: "GET",
      headers: {
        "x-kiosk-token": token, // o Authorization: Kiosk <token>
      },
    });

    if (r.ok) {
      const data = await r.json(); // { kiosk: {...} }
      return { ok: true, payload: data?.kiosk ?? null };
    }

    // intenta leer causa
    let msg = "unauthorized";
    try {
      const err = await r.json();
      msg = err?.error || msg;
    } catch {}
    return { ok: false, error: msg };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network_error" };
  }
}
