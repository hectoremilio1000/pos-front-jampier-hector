// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/pages/LoginScreen.tsx

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
import PairingForm from "@/components/Kiosk/PairingForm";
import PinForm from "@/components/Kiosk/PinForm";
import HeaderStatus from "@/components/Kiosk/HeaderStatus";

const { Title } = Typography;

const SAFE_ALLOW_UNPAIR = false;

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

  const [hasPair, setHasPair] = useState<boolean>(
    !!sessionStorage.getItem("kiosk_token")
  );
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("Comandero");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(
    new Date().toLocaleString("es-MX", { hour12: false })
  );
  const [deviceLabel, setDeviceLabel] = useState<string>(
    sessionStorage.getItem("kiosk_device_name") || ""
  );

  type PairState = "none" | "paired" | "revoked";
  const [pairState, setPairState] = useState<PairState>(
    sessionStorage.getItem("kiosk_token") ? "paired" : "none"
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
  useEffect(() => {
    setTarget(hasPair ? "pin" : "pair");
  }, [hasPair]);

  useEffect(() => {
    if (target === "pair") codeRef.current?.focus();
    else pinRef.current?.focus();
  }, [target]);

  // si hay kiosk_jwt válido → directo a /control
  useEffect(() => {
    const expStr = sessionStorage.getItem("kiosk_jwt_exp");
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const valid = expStr ? Number(expStr) - Date.now() > 15_000 : false;
    if (jwt && valid) navigate("/control", { replace: true });
  }, [navigate]);

  // verifica estado del dispositivo al montar
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
      } else if (status === "invalid") {
        setHasPair(false);
        setPairState("none");
      }
    })();
  }, []);

  async function doPair() {
    try {
      if (sessionStorage.getItem("kiosk_token")) {
        setHasPair(true);
        setPairState("paired");
        return message.info("Este dispositivo ya está emparejado");
      }
      if (!code.trim()) return message.warning("Ingresa el pairing code");
      setLoading(true);
      const start = await kioskPairStart(code.trim(), "commander");
      if (start.requireStation) {
        message.error("Commander no requiere estación; revisa deviceType");
        return;
      }
      await kioskPairConfirm({
        code: code.trim(),
        deviceType: "commander",
        deviceName: deviceName.trim() || "Comandero",
        fingerprint: getFingerprint(),
        deviceId: selectedDeviceId ?? undefined,
      });
      const label = deviceName.trim() || "Comandero";
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

  async function doLogin() {
    try {
      if (!/^\d{6}$/.test(pin))
        return message.warning("PIN inválido (6 dígitos)");
      setLoading(true);
      await kioskLoginWithPin(pin);
      navigate("/control", { replace: true });
    } catch (e: any) {
      const msg =
        e?.message || e?.response?.data?.error || "No se pudo iniciar sesión";
      if (/revocado/i.test(msg)) {
        sessionStorage.removeItem("kiosk_token");
        sessionStorage.removeItem("kiosk_device_name");
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

  function unpair() {
    if (!SAFE_ALLOW_UNPAIR) return;
    sessionStorage.removeItem("kiosk_token");
    sessionStorage.removeItem("kiosk_jwt");
    sessionStorage.removeItem("kiosk_jwt_exp");
    sessionStorage.removeItem("kiosk_device_name");
    setDeviceLabel("");
    setHasPair(false);
    setPairState("none");
    setPin("");
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

        {/* Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-3">
            {!hasPair ? (
              <PairingForm
                code={code}
                deviceName={deviceName}
                loading={loading}
                selectedDeviceId={selectedDeviceId}
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
              <button className="text-red-600 underline" onClick={unpair}>
                Desemparejar dispositivo
              </button>
            )}
          </div>

          {/* Keypad a la derecha */}
          <div className="flex md:justify-end">
            <div className="w-full md:w-[360px] lg:w-[420px]">
              <Numpad
                onDigit={onDigit}
                onBack={onBack}
                onClear={onClearPin}
                disabled={false}
                big
              />
            </div>
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
