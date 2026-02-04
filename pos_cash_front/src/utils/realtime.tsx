// realtime.ts (Vite + TS)
import { Transmit } from "@adonisjs/transmit-client";

function applyAuthHeader(request: Request | RequestInit, token: string | null) {
  if (!token) return;

  // Caso 1: la lib pasó un Request real (headers getter, pero mutable internamente)
  if (typeof Request !== "undefined" && request instanceof Request) {
    request.headers.set("Authorization", `Bearer ${token}`);
    return;
  }

  // Caso 2: es un RequestInit (podemos reasignar headers)
  const init = request as RequestInit;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);
  init.headers = headers;
}

export const tx = new Transmit({
  baseUrl: import.meta.env.VITE_ORDER_API_URL as string,

  beforeSubscribe: (request: Request | RequestInit) => {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    applyAuthHeader(request, token);
    // Si autenticas con cookie/sesión en lugar de Bearer:
    // if (!(request instanceof Request)) request.credentials = "include"
  },

  beforeUnsubscribe: (request: Request | RequestInit) => {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    applyAuthHeader(request, token);
    // if (!(request instanceof Request)) request.credentials = "include"
  },
});
