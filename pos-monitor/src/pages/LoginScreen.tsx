import { useEffect, useState } from "react";
import { Card, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";

import { kioskPairStart, kioskPairConfirm } from "@/components/Kiosk/token";
import Numpad from "@/components/Kiosk/Numpad";
import PairingForm from "@/components/Kiosk/PairingForm";
import HeaderStatus from "@/components/Kiosk/HeaderStatus";
import { verifyKioskToken } from "@/components/Kiosk/kioskVerify";

const { Title } = Typography;

function getFingerprint(): string {
  const KEY = "kiosk_fp";
  const saved = localStorage.getItem(KEY);
  if (saved) return saved;
  const fp = `web-${crypto.randomUUID()}`;
  localStorage.setItem(KEY, fp);
  return fp;
}

type PairState = "none" | "paired";

export default function LoginScreen() {
  const navigate = useNavigate();

  // estado mínimo
  const [hasPair, setHasPair] = useState<boolean>(false);
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("Monitor");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(
    new Date().toLocaleString("es-MX", { hour12: false })
  );
  const [deviceLabel, setDeviceLabel] = useState<string>(
    sessionStorage.getItem("kiosk_device_name") || ""
  );
  const pairState: PairState = hasPair ? "paired" : "none";

  // reloj
  useEffect(() => {
    const id = setInterval(
      () => setNow(new Date().toLocaleString("es-MX", { hour12: false })),
      1000
    );
    return () => clearInterval(id);
  }, []);

  // al montar → validar token con backend
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await verifyKioskToken();
      if (!alive) return;
      if (res.ok) {
        // token vigente y device no revocado
        setHasPair(true);
        navigate("/monitor", { replace: true });
      } else {
        // no hay token, expiró, o está revocado
        setHasPair(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  // Pairing MONITOR (requiere estación de producción)
  async function doPairWithStation(stationId: number, stationCode: string) {
    try {
      if (sessionStorage.getItem("kiosk_token")) {
        setHasPair(true);
        return message.info("Este dispositivo ya está emparejado");
      }
      if (!code.trim()) return message.warning("Ingresa el pairing code");

      setLoading(true);

      // **Monitor** siempre
      const start = await kioskPairStart(code.trim(), "monitor");
      if (!start.requireStation) {
        message.warning("Selecciona una estación para el monitor");
      }

      // Confirmar emparejamiento → backend firma y guarda (y el front guarda token)
      await kioskPairConfirm({
        code: code.trim(),
        deviceType: "monitor",
        deviceName: deviceName.trim() || "Monitor",
        stationId,
        fingerprint: getFingerprint(),
        deviceId: selectedDeviceId ?? undefined,
      });

      // Metadatos del monitor
      sessionStorage.setItem("monitor_station_id", String(stationId));
      sessionStorage.setItem("monitor_station_code", stationCode);

      const label = deviceName.trim() || "Monitor";
      sessionStorage.setItem("kiosk_device_name", label);
      setDeviceLabel(label);

      setHasPair(true);
      message.success("Dispositivo emparejado");

      // Verifica con backend por si acaso y entra
      const res = await verifyKioskToken();
      if (res.ok) {
        navigate("/monitor", { replace: true });
      } else {
        message.error("Token inválido tras emparejar. Intenta de nuevo.");
      }
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

  // keypad → solo pairing code
  const onDigit = (d: string) => {
    setCode((c) => (c + d).replace(/\D/g, "").slice(0, 6));
  };
  const onBack = () => setCode((c) => c.slice(0, -1));
  const onClear = () => setCode("");

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
              Monitor de Producción
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
                // selectedDeviceId={selectedDeviceId}
                onCodeChange={(v) => setCode(v)}
                onDeviceNameChange={(v) => setDeviceName(v)}
                onSelectDeviceId={(id, name) => {
                  setSelectedDeviceId(id);
                  if (name) setDeviceName(name);
                }}
                onConfirm={doPairWithStation}
                onCodeFocus={() => {}}
              />
            ) : (
              <div className="text-gray-500">Redirigiendo al monitor…</div>
            )}
          </div>

          {/* Keypad a la derecha */}
          <div className="flex md:justify-end">
            <div className="w-full md:w-[360px] lg:w-[420px]">
              <Numpad
                onDigit={onDigit}
                onBack={onBack}
                onClear={onClear}
                big
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
