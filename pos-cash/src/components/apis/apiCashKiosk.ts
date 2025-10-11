import axios from "axios";

function isValid() {
  const exp = Number(sessionStorage.getItem("kiosk_jwt_exp") || 0);
  return exp - Date.now() > 15_000;
}
async function ensureJwt(): Promise<string> {
  const jwt = sessionStorage.getItem("kiosk_jwt");
  if (jwt && isValid()) return jwt;
  const pin = window.prompt("PIN de cajero (6 dígitos):") || "";
  if (!/^\d{6}$/.test(pin)) throw new Error("invalid_pin");
  const kt = sessionStorage.getItem("kiosk_token");
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_URL_AUTH}/kiosk/login`,
    { password: pin },
    { headers: { "x-kiosk-token": kt || "" } }
  );
  const newJwt = data.jwt as string;
  const ttl = 20 * 60 * 1000;
  sessionStorage.setItem("kiosk_jwt", newJwt);
  sessionStorage.setItem("kiosk_jwt_exp", String(Date.now() + ttl));
  return newJwt;
}

const apiCashKiosk = axios.create({
  baseURL: import.meta.env.VITE_API_URL_CASH,
});

apiCashKiosk.interceptors.request.use(async (config) => {
  const jwt = await ensureJwt();
  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${jwt}`;
  const shiftId = sessionStorage.getItem("cash_shift_id");
  if (shiftId) config.headers["X-Shift-Id"] = shiftId;
  return config;
});

export default apiCashKiosk;
