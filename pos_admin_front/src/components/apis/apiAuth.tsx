import axios from "axios";

const resolveAuthBaseUrl = (): string => {
  const rawUrl = (import.meta.env.VITE_API_URL_AUTH as string | undefined)
    ?.trim()
    .replace(/\/$/, "");

  if (rawUrl && rawUrl !== "undefined" && rawUrl !== "null") {
    return rawUrl;
  }

  // Local dev fallback to avoid requests like /undefined/login when env is missing.
  return "http://localhost:3340/api";
};

const apiAuth = axios.create({
  baseURL: resolveAuthBaseUrl(),
});

if (
  import.meta.env.DEV &&
  !(import.meta.env.VITE_API_URL_AUTH as string | undefined)?.trim()
) {
  console.warn(
    "[apiAuth] VITE_API_URL_AUTH no está definida. Usando fallback http://localhost:3340/api"
  );
}

apiAuth.interceptors.request.use((config) => {
  const t = sessionStorage.getItem("token"); // ← admin_session_token
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export default apiAuth;
