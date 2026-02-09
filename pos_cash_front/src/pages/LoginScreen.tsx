// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/LoginScreen.tsx

import { useEffect, useRef, useState } from "react";
import type { InputRef } from "antd";
import { Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import {
  kioskPairStart,
  kioskPairConfirm,
  kioskLoginWithPin,
} from "@/components/Kiosk/token";
import Numpad from "@/components/Kiosk/Numpad";
import { kioskCheckPairedStatus } from "@/components/Kiosk/session";
import PairingForm from "@/components/Kiosk/PairingForm"; // tu versión de CASH con estaciones
import PinForm from "@/components/Kiosk/PinForm";
import HeaderStatus from "@/components/Kiosk/HeaderStatus";

const { Title } = Typography;

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const KEYPAD_VISIBILITY_STORAGE_KEY_DESKTOP =
  "pos_cash_login_keypad_visible_desktop";
const KEYPAD_VISIBILITY_STORAGE_KEY_MOBILE =
  "pos_cash_login_keypad_visible_mobile";

const getIsMobileViewport = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
};

const getKeypadVisibilityPreference = (isMobileViewport: boolean): boolean => {
  if (typeof window === "undefined") return !isMobileViewport;

  const storageKey = isMobileViewport
    ? KEYPAD_VISIBILITY_STORAGE_KEY_MOBILE
    : KEYPAD_VISIBILITY_STORAGE_KEY_DESKTOP;

  const savedPreference = window.localStorage.getItem(storageKey);
  if (savedPreference === null) return !isMobileViewport;

  return savedPreference !== "false";
};

function getFingerprint(): string {
  const KEY = "kiosk_fp";
  const saved = localStorage.getItem(KEY);
  if (saved) return saved;
  const fp = `web-${crypto.randomUUID()}`;
  localStorage.setItem(KEY, fp);
  return fp;
}

type PairState = "none" | "paired" | "revoked";

export default function LoginScreen() {
  const navigate = useNavigate();

  const [hasPair, setHasPair] = useState<boolean>(
    !!sessionStorage.getItem("kiosk_token")
  );
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("Caja");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(
    new Date().toLocaleString("es-MX", { hour12: false })
  );
  const [deviceLabel, setDeviceLabel] = useState<string>(
    sessionStorage.getItem("kiosk_device_name") || ""
  );

  const [pairState, setPairState] = useState<PairState>(
    sessionStorage.getItem("kiosk_token") ? "paired" : "none"
  );
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    getIsMobileViewport()
  );
  const [isKeypadVisible, setIsKeypadVisible] = useState<boolean>(() =>
    getKeypadVisibilityPreference(getIsMobileViewport())
  );

  // campo activo para keypad
  const [target, setTarget] = useState<"pair" | "pin">(
    hasPair ? "pin" : "pair"
  );
  const codeRef = useRef<InputRef>(null);
  const pinRef = useRef<InputRef>(null);

  // reloj
  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date().toLocaleString("es-MX", { hour12: false })),
      1000
    );
    return () => clearInterval(id);
  }, []);

  // focus según pairing
  useEffect(() => setTarget(hasPair ? "pin" : "pair"), [hasPair]);
  useEffect(() => {
    if (target === "pair") codeRef.current?.focus();
    else pinRef.current?.focus();
  }, [target]);

  // si hay kiosk_jwt válido → directo a /control
  useEffect(() => {
    const expStr = sessionStorage.getItem("kiosk_jwt_exp");
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const valid = expStr ? Number(expStr) - Date.now() > 15_000 : false;
    if (jwt && valid) navigate("/caja", { replace: true });
  }, [navigate]);

  // verifica estado del dispositivo al montar (paired/revoked/invalid/offline)
  useEffect(() => {
    (async () => {
      const status = await kioskCheckPairedStatus();
      if (status === "paired") {
        setHasPair(true);
        setPairState("paired");
      } else if (status === "revoked") {
        sessionStorage.removeItem("kiosk_token");
        sessionStorage.removeItem("kiosk_device_name");
        setHasPair(false);
        setPairState("revoked");
        message.warning(
          "Este dispositivo fue revocado desde Admin. Vuelve a emparejarlo."
        );
      } else if (status === "offline") {
        // tolerante: si hay token, consideramos "paired" para permitir PIN
        if (sessionStorage.getItem("kiosk_token")) {
          setHasPair(true);
          setPairState("paired");
        } else {
          setHasPair(false);
          setPairState("none");
        }
      } else {
        setHasPair(false);
        setPairState("none");
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
    const applyViewportPreference = (isMobile: boolean) => {
      setIsMobileViewport(isMobile);
      setIsKeypadVisible(getKeypadVisibilityPreference(isMobile));
    };

    applyViewportPreference(mediaQueryList.matches);

    const onMediaQueryChange = (event: MediaQueryListEvent) => {
      applyViewportPreference(event.matches);
    };

    mediaQueryList.addEventListener("change", onMediaQueryChange);

    return () => {
      mediaQueryList.removeEventListener("change", onMediaQueryChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storageKey = isMobileViewport
      ? KEYPAD_VISIBILITY_STORAGE_KEY_MOBILE
      : KEYPAD_VISIBILITY_STORAGE_KEY_DESKTOP;

    window.localStorage.setItem(storageKey, String(isKeypadVisible));
  }, [isKeypadVisible, isMobileViewport]);

  // Pairing CASH (requiere estación)
  // Pairing CASH (requiere estación)
  async function doPairWithStation(stationId: number, stationCode: string) {
    try {
      if (sessionStorage.getItem("kiosk_token")) {
        setHasPair(true);
        setPairState("paired");
        return message.info("Este dispositivo ya está emparejado");
      }
      if (!code.trim()) return message.warning("Ingresa el pairing code");

      setLoading(true);

      const start = await kioskPairStart(code.trim(), "cash");
      if (!start.requireStation) {
        message.error("Caja requiere seleccionar estación");
        return;
      }

      await kioskPairConfirm({
        code: code.trim(),
        deviceType: "cash",
        deviceName: deviceName.trim() || "Caja",
        stationId,
        fingerprint: getFingerprint(),
        deviceId: selectedDeviceId ?? undefined,
      });

      // 👇 guarda ambos
      sessionStorage.setItem("cash_station_id", String(stationId));
      sessionStorage.setItem("cash_station_code", stationCode);

      const label = deviceName.trim() || "Caja";
      sessionStorage.setItem("kiosk_device_name", label);
      setDeviceLabel(label);

      setHasPair(true);
      setPairState("paired");
      message.success("Dispositivo emparejado");
    } catch (e: any) {
      const txt = String(e?.message || "");
      if (txt.includes("DEVICE_IN_USE")) {
        message.error(
          "Ese dispositivo ya está emparejado en otro equipo. Elige otro o desemparéjalo desde Admin."
        );
      } else {
        message.error(txt || "No se pudo emparejar");
      }
    } finally {
      setLoading(false);
    }
  }

  // Login por PIN
  async function doLogin() {
    try {
      if (!/^\d{6}$/.test(pin))
        return message.warning("PIN inválido (6 dígitos)");
      setLoading(true);
      await kioskLoginWithPin(pin);
      navigate("/caja", { replace: true });
    } catch (e: any) {
      const msg =
        e?.message || e?.response?.data?.error || "No se pudo iniciar sesión";
      if (/revocado/i.test(msg)) {
        sessionStorage.removeItem("kiosk_token");
        sessionStorage.removeItem("kiosk_device_name");
        sessionStorage.removeItem("kiosk_jwt");
        sessionStorage.removeItem("kiosk_jwt_exp");
        sessionStorage.removeItem("cash_station_id");
        setHasPair(false);
        setPairState("revoked");
        message.error("Dispositivo revocado. Vuelve a emparejar.");
      } else {
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // keypad
  const onDigit = (d: string) => {
    if (target === "pair")
      setCode((c) => (c + d).replace(/\D/g, "").slice(0, 6));
    else setPin((p) => (p + d).replace(/\D/g, "").slice(0, 6));
  };
  const onBack = () => {
    if (target === "pair") setCode((c) => c.slice(0, -1));
    else setPin((p) => p.slice(0, -1));
  };
  const onClearPin = () => setPin("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-700 p-4">
      <Card className="w-full max-w-5xl" styles={{ body: { padding: 24 } }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Title level={2} style={{ margin: 0, color: "#ff6b00" }}>
              GrowthSuite
            </Title>
            <Title level={3} style={{ margin: 0, color: "#0b63ff" }}>
              Caja
            </Title>
          </div>
          <HeaderStatus
            now={now}
            pairState={pairState}
            deviceLabel={deviceLabel}
          />
        </div>

        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setIsKeypadVisible((prev) => !prev)}
            className="rounded bg-gray-700 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-gray-600"
          >
            {isKeypadVisible
              ? "Ocultar teclado touch"
              : "Mostrar teclado touch"}
          </button>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {isKeypadVisible && (
            <div className="order-1 xl:order-2 xl:col-span-5">
              <div className="w-full xl:max-w-[460px] xl:ml-auto">
                <Numpad
                  onDigit={onDigit}
                  onBack={onBack}
                  onClear={onClearPin}
                  big
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div
            className={`space-y-3 order-2 xl:order-1 ${
              isKeypadVisible ? "xl:col-span-7" : "xl:col-span-12"
            }`}
          >
            {!hasPair ? (
              <PairingForm
                code={code}
                deviceName={deviceName}
                loading={loading}
                // selectedDeviceId={selectedDeviceId}
                onCodeChange={(v) => setCode(v)}
                onDeviceNameChange={(v) => setDeviceName(v)}
                onSelectDeviceId={(id, name) => {
                  setSelectedDeviceId(id);
                  if (name) setDeviceName(name);
                }}
                // Confirmar requiere stationId (lo obtiene el propio PairingForm CASH)
                onConfirm={doPairWithStation}
                onCodeFocus={() => setTarget("pair")}
              />
            ) : (
              <PinForm
                pin={pin}
                loading={loading}
                disabled={pairState !== "paired" || loading}
                onPinChange={(v) => setPin(v)}
                onEnter={doLogin}
                onClear={onClearPin}
                onFocusPin={() => setTarget("pin")}
              />
            )}
          </div>
        </div>

        {/* Footer tipo tablero */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-6 text-center text-xs">
          {[
            "Abrir turno",
            "Corte X",
            "Corte Z",
            "Reembolsos",
            "Cobros en línea",
            "Historial de pagos",
          ].map((t, i) => (
            <div key={i} className="py-2 bg-orange-100 rounded">
              {t}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
