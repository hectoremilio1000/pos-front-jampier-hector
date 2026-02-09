import { useEffect, useRef, useState } from "react";
import type { InputRef } from "antd";
import { Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import Numpad from "@/components/Kiosk/Numpad";
import PairingForm from "@/components/Kiosk/PairingForm";
import PinForm from "@/components/Kiosk/PinForm";
import HeaderStatus from "@/components/Kiosk/HeaderStatus";
import { useKioskAuth } from "@/context/KioskAuthProvider";

const { Title } = Typography;
const SAFE_ALLOW_UNPAIR = false;
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const KEYPAD_VISIBILITY_STORAGE_KEY_DESKTOP =
  "pos_comandero_login_keypad_visible_desktop";
const KEYPAD_VISIBILITY_STORAGE_KEY_MOBILE =
  "pos_comandero_login_keypad_visible_mobile";

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

export default function LoginScreen() {
  const navigate = useNavigate();

  const { pairState, deviceLabel, pair, loginWithPin, unpair } = useKioskAuth();

  const hasPair = pairState === "paired";

  // UI-local
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("Comandero");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(
    new Date().toLocaleString("es-MX", { hour12: false })
  );

  // campo activo para keypad
  const [target, setTarget] = useState<"pair" | "pin">(
    hasPair ? "pin" : "pair"
  );
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    getIsMobileViewport()
  );
  const [isKeypadVisible, setIsKeypadVisible] = useState<boolean>(() =>
    getKeypadVisibilityPreference(getIsMobileViewport())
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
  useEffect(() => {
    setTarget(hasPair ? "pin" : "pair");
  }, [hasPair]);

  useEffect(() => {
    if (target === "pair") codeRef.current?.focus();
    else pinRef.current?.focus();
  }, [target]);

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

  async function doPair() {
    try {
      if (sessionStorage.getItem("kiosk_token")) {
        message.info("Este dispositivo ya está emparejado");
        return;
      }
      if (!code.trim()) return message.warning("Ingresa el pairing code");
      setLoading(true);

      await pair({
        code: code.trim(),
        deviceType: "commander",
        deviceName: deviceName.trim() || "Comandero",
        deviceId: selectedDeviceId ?? undefined,
        fingerprint: getFingerprint(),
      });

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

  async function doLogin() {
    try {
      if (!/^\d{6}$/.test(pin))
        return message.warning("PIN inválido (6 dígitos)");
      setLoading(true);
      await loginWithPin(pin);
      navigate("/control", { replace: true });
    } catch (e: any) {
      const msg =
        e?.message || e?.response?.data?.error || "No se pudo iniciar sesión";
      if (/revocad/i.test(msg)) {
        // si el backend “revoca”, el provider ya puso pairState="revoked"
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

  function handleUnpair() {
    if (!SAFE_ALLOW_UNPAIR) return;
    unpair();
    message.info("Dispositivo desemparejado");
  }

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
              Comandero
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
                  disabled={loading}
                  big
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
                deviceType="commander"
                onCodeChange={(v) => setCode(v)}
                onDeviceNameChange={(v) => setDeviceName(v)}
                onSelectDeviceId={(id, name) => {
                  setSelectedDeviceId(id);
                  if (name) setDeviceName(name);
                }}
                onPair={doPair}
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

            {SAFE_ALLOW_UNPAIR && (
              <button className="text-red-600 underline" onClick={handleUnpair}>
                Desemparejar dispositivo
              </button>
            )}
          </div>
        </div>

        {/* Footer tipo tablero */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-6 text-center text-xs">
          {[
            "Clientes",
            "Meseros",
            "Asistencias",
            "Promociones",
            "Consultar precios",
            "Suspender productos",
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
