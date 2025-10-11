import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import {
  kioskPairStart,
  kioskPairConfirm,
  kioskLoginWithPin,
} from "@/components/Kiosk/token";

const { Title } = Typography;

export default function CashLogin() {
  const navigate = useNavigate();
  const [hasPair, setHasPair] = useState(
    !!sessionStorage.getItem("kiosk_token")
  );
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("Caja");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<
    { id: number; code: string; name: string }[]
  >([]);
  const [stationId, setStationId] = useState<number | undefined>(undefined);

  const isMobile = useMemo(() => window.innerWidth < 640, []);
  const cardWidth = isMobile ? 360 : 760;

  useEffect(() => {
    const expStr = sessionStorage.getItem("kiosk_jwt_exp");
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const valid = expStr ? Number(expStr) - Date.now() > 15_000 : false;
    if (jwt && valid) navigate("/caja", { replace: true });
  }, [navigate]);

  async function doPairStart() {
    try {
      if (!code.trim()) return message.warning("Ingresa el pairing code");
      setLoading(true);
      const start = await kioskPairStart(code.trim());
      if (!start.requireStation) {
        message.error("Caja requiere seleccionar estación");
        return;
      }
      setStations(start.stations || []);
      message.success("Código válido. Selecciona estación y confirma.");
    } catch (e) {
      console.error(e);
      message.error("No se pudo iniciar pairing");
    } finally {
      setLoading(false);
    }
  }

  async function doConfirm() {
    try {
      if (!stationId) return message.warning("Selecciona estación");
      setLoading(true);
      await kioskPairConfirm({
        code: code.trim(),
        deviceType: "cash",
        deviceName: deviceName.trim() || "Caja",
        stationId,
      });
      setHasPair(true);
      message.success("Dispositivo emparejado");
    } catch (e) {
      console.error(e);
      message.error("No se pudo confirmar pairing");
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
      navigate("/caja", { replace: true });
    } catch (e) {
      console.error(e);
      message.error("PIN incorrecto o servidor no disponible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-900">
      <Card
        style={{ width: cardWidth }}
        bodyStyle={{ padding: isMobile ? 20 : 28 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title level={2} style={{ margin: 0, color: "#ff6b00" }}>
              GrowthSuite
            </Title>
            <Title level={3} style={{ margin: 0, color: "#ffd000" }}>
              Caja
            </Title>
          </div>
          <div className="text-right text-xs text-gray-500">
            {new Date().toLocaleString("es-MX", { hour12: false })}
          </div>
        </div>

        <div className={isMobile ? "" : "grid grid-cols-2 gap-6"}>
          <div className="space-y-3">
            {!hasPair ? (
              <>
                <div className="text-sm font-semibold">Pairing code</div>
                <Input
                  placeholder="031180"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />

                <div className="text-sm font-semibold">
                  Nombre del dispositivo
                </div>
                <Input
                  placeholder="Caja principal"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />

                <div className="text-sm font-semibold">Estación</div>
                <Select
                  value={stationId}
                  onChange={(v) => setStationId(v)}
                  className="w-full"
                  placeholder="Selecciona estación"
                  options={stations.map((s) => ({
                    value: s.id,
                    label: `${s.code} — ${s.name}`,
                  }))}
                />

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button onClick={doPairStart} loading={loading}>
                    Validar
                  </Button>
                  <Button type="primary" onClick={doConfirm} loading={loading}>
                    Confirmar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">PIN de cajero</div>
                <Input.Password
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                  style={{
                    textAlign: "center",
                    letterSpacing: 4,
                    fontSize: isMobile ? 20 : 24,
                  }}
                />
                <div className="flex gap-2 mt-2">
                  <Button onClick={() => setPin("")}>Borrar</Button>
                  <Button type="primary" onClick={doLogin} loading={loading}>
                    Entrar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
