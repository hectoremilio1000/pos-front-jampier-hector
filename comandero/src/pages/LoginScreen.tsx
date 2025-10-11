// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/pages/LoginScreen.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import {
  kioskPairStart,
  kioskPairConfirm,
  kioskLoginWithPin,
} from "@/components/Kiosk/token";

const { Title } = Typography;

const SAFE_ALLOW_UNPAIR = false; // ⬅️ dejar en false en producción

export default function LoginScreen() {
  const navigate = useNavigate();

  const [hasPair, setHasPair] = useState<boolean>(
    !!sessionStorage.getItem("kiosk_token")
  );
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("Comandero");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // layout responsive: ancho de la tarjeta y tamaño de keypad
  const isMobile = useMemo(() => window.innerWidth < 640, []);
  const cardWidth = isMobile ? 360 : 760;

  // si ya hay kiosk_jwt válido → directo a /control
  useEffect(() => {
    const expStr = sessionStorage.getItem("kiosk_jwt_exp");
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const valid = expStr ? Number(expStr) - Date.now() > 15_000 : false;
    if (jwt && valid) navigate("/control", { replace: true });
  }, [navigate]);

  async function doPair() {
    try {
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
      });
      setHasPair(true);
      message.success("Dispositivo emparejado");
    } catch (e: any) {
      console.error(e);
      message.error("No se pudo emparejar");
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
      console.error(e);
      message.error("PIN incorrecto o servidor no disponible");
    } finally {
      setLoading(false);
    }
  }

  // keypad
  const press = (d: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + d);
  };
  const back = () => setPin((p) => p.slice(0, -1));
  const clear = () => setPin("");

  // “oculto”: desemparejar (para soporte)
  function unpair() {
    if (!SAFE_ALLOW_UNPAIR) return;
    sessionStorage.removeItem("kiosk_token");
    sessionStorage.removeItem("kiosk_jwt");
    sessionStorage.removeItem("kiosk_jwt_exp");
    setHasPair(false);
    setPin("");
    message.info("Dispositivo desemparejado");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-700">
      <Card
        style={{ width: cardWidth }}
        bodyStyle={{ padding: isMobile ? 20 : 28 }}
      >
        {/* Header estilo “SoftRestaurant” */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title level={2} style={{ margin: 0, color: "#ff6b00" }}>
              GrowthSuite
            </Title>
            <Title level={3} style={{ margin: 0, color: "#0b63ff" }}>
              Comandero
            </Title>
          </div>
          <div className="text-right text-xs text-gray-500">
            {new Date().toLocaleString("es-MX", { hour12: false })}
          </div>
        </div>

        {/* Layout: input a la izquierda, keypad a la derecha (desktop) */}
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
                  placeholder="iPad Barra"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
                <Button
                  type="primary"
                  block
                  loading={loading}
                  onClick={doPair}
                  className="mt-2"
                >
                  Emparejar
                </Button>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">PIN de operador</div>
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
                  <Button block onClick={clear}>
                    Borrar
                  </Button>
                  <Button
                    type="primary"
                    block
                    loading={loading}
                    onClick={doLogin}
                  >
                    Entrar
                  </Button>
                </div>
              </>
            )}
            {/* Botón oculto de soporte para desemparejar */}
            {SAFE_ALLOW_UNPAIR && (
              <Button danger block onClick={unpair}>
                Desemparejar dispositivo
              </Button>
            )}
          </div>

          {/* Keypad a la derecha (o debajo en móvil) */}
          <div className={isMobile ? "mt-6" : ""}>
            {hasPair && (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <Button
                    key={n}
                    onClick={() => press(String(n))}
                    style={{
                      height: isMobile ? 44 : 64,
                      fontSize: isMobile ? 18 : 22,
                    }}
                  >
                    {n}
                  </Button>
                ))}
                <Button disabled style={{ height: isMobile ? 44 : 64 }} />
                <Button
                  onClick={() => press("0")}
                  style={{
                    height: isMobile ? 44 : 64,
                    fontSize: isMobile ? 18 : 22,
                  }}
                >
                  0
                </Button>
                <Button
                  danger
                  onClick={back}
                  style={{
                    height: isMobile ? 44 : 64,
                    fontSize: isMobile ? 18 : 22,
                  }}
                >
                  ←
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer tipo tablero (solo visual, como la app de referencia) */}
        <div className="grid grid-cols-6 gap-2 mt-6 text-center text-xs">
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
