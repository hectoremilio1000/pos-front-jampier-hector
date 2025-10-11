import apiKiosk from "@/components/apis/apiAuth"; // baseURL = VITE_API_URL_AUTH

export async function kioskPairStart(code: string) {
  const { data } = await apiKiosk.post("/kiosk/pair/start", {
    code,
    deviceType: "cash",
  });
  return data as {
    restaurantId: number;
    deviceType: "cash";
    requireStation: boolean;
    stations?: { id: number; code: string; name: string; mode: string }[];
  };
}

export async function kioskPairConfirm(payload: {
  code: string;
  deviceType: "cash";
  deviceName: string;
  stationId: number;
  fingerprint?: string;
}) {
  const { data } = await apiKiosk.post("/kiosk/pair/confirm", payload);
  sessionStorage.setItem("kiosk_token", data.kioskToken as string);
  return data.kioskToken as string;
}

export async function kioskLoginWithPin(pin: string): Promise<string> {
  const kt = sessionStorage.getItem("kiosk_token");
  if (!kt) throw new Error("no_kiosk_token");
  const { data } = await apiKiosk.post(
    "/kiosk/login",
    { password: pin },
    { headers: { "x-kiosk-token": kt } }
  );
  const jwt = data.jwt as string;
  const ttl = 20 * 60 * 1000;
  sessionStorage.setItem("kiosk_jwt", jwt);
  sessionStorage.setItem("kiosk_jwt_exp", String(Date.now() + ttl));
  return jwt;
}
