/* ========================= 2) KDS: Pair + Vista ========================= */

import { Transmit } from "@adonisjs/transmit-client";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  LockOutlined,
  LinkOutlined,
  ReloadOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";

import { useEffect, useRef, useState } from "react";

// Helpers para token kiosko
const TOK_KEY = "kiosk.accessToken";
const TOK_EXP = "kiosk.accessTokenExp";
const MON_ID = "kiosk.monitorId";
const RES_ID = "kiosk.restaurantId";
const REF_KEY = "kiosk.refreshToken";

function saveKioskSession(p: {
  accessToken: string;
  accessTokenExp?: number | null;
  monitorId: number;
  restaurantId: number;
  refreshToken?: string | null;
}) {
  localStorage.setItem(TOK_KEY, p.accessToken);
  if (p.accessTokenExp) localStorage.setItem(TOK_EXP, String(p.accessTokenExp));
  localStorage.setItem(MON_ID, String(p.monitorId));
  localStorage.setItem(RES_ID, String(p.restaurantId));
  if (p.refreshToken) localStorage.setItem(REF_KEY, p.refreshToken);
}
function clearKioskSession() {
  [TOK_KEY, TOK_EXP, MON_ID, RES_ID, REF_KEY].forEach((k) =>
    localStorage.removeItem(k)
  );
}
function getAccessToken(): string | null {
  return localStorage.getItem(TOK_KEY);
}
function getMonitorId(): number | null {
  const v = localStorage.getItem(MON_ID);
  return v ? Number(v) : null;
}

// Tipos KDS
interface KdsItem {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string | null;
  qty: number;
  status: "pending" | "in_progress" | "ready" | string;
  notes?: string | null;
  createdAt: string;
  routeAreaId: number | null;
}

export function KdsApp() {
  const [paired, setPaired] = useState<boolean>(!!getAccessToken());
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<KdsItem[]>([]);
  const [view, setView] = useState<"pending" | "active" | "all">("active");

  // Transmit client
  const txRef = useRef<Transmit | null>(null);
  useEffect(() => {
    txRef.current = new Transmit({
      baseUrl: import.meta.env.VITE_ORDER_API_URL as string,
      beforeSubscribe: (init?: RequestInit) => {
        const headers = new Headers(init?.headers || {});
        const tok = getAccessToken();
        if (tok) headers.set("Authorization", `Bearer ${tok}`);
        return { ...(init || {}), headers };
      },
      beforeUnsubscribe: (init?: RequestInit) => {
        const headers = new Headers(init?.headers || {});
        const tok = getAccessToken();
        if (tok) headers.set("Authorization", `Bearer ${tok}`);
        return { ...(init || {}), headers };
      },
    });
  }, []);

  async function pairNow() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL_AUTH}/auth/monitors/pair`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.trim(),
            deviceName: navigator.userAgent.slice(0, 64),
          }),
        }
      );
      if (!res.ok) throw new Error("Código inválido");
      const data = await res.json();
      saveKioskSession({
        accessToken: data.accessToken,
        accessTokenExp: data.accessTokenExp,
        monitorId: data.monitorId,
        restaurantId: data.restaurantId,
        refreshToken: data.refreshToken,
      });
      setPaired(true);
      message.success("Emparejado");
      setTimeout(loadItems, 0);
      subscribeRealtime();
    } catch (e: any) {
      message.error(e?.message || "No se pudo emparejar");
    } finally {
      setLoading(false);
    }
  }

  function unpair() {
    Modal.confirm({
      title: "Desemparejar monitor",
      content: "¿Seguro que deseas cerrar sesión en este dispositivo?",
      okType: "danger",
      onOk: () => {
        clearKioskSession();
        setPaired(false);
        setItems([]);
      },
    });
  }

  async function loadItems() {
    const tok = getAccessToken();
    if (!tok) return;
    const qs =
      view === "pending"
        ? "pending"
        : view === "active"
          ? "pending,in_progress"
          : "pending,in_progress,ready";
    const res = await fetch(
      `${import.meta.env.VITE_ORDER_API_URL}/kds/items?status=${encodeURIComponent(qs)}`,
      {
        headers: { Authorization: `Bearer ${tok}` },
      }
    );
    if (!res.ok) return message.error("No se pudieron cargar ítems");
    const data = await res.json();
    setItems(data);
  }

  function subscribeRealtime() {
    const tx = txRef.current;
    const monitorId = getMonitorId();
    if (!tx || !monitorId) return;

    const sub = tx.subscription(`monitors:${monitorId}`);

    // 1) crear la suscripción en el servidor
    sub.create().catch(() => {
      // opcional: notificar o reintentar
    });

    // 2) registrar handler local y obtener 'off'
    const off = sub.onMessage(() => {
      // cada mensaje → refrescamos lista
      loadItems();
    });

    // 3) devolver cleanup: quita handler local y borra suscripción remota
    return async () => {
      try {
        off();
      } catch {}
      try {
        await sub.delete();
      } catch {}
    };
  }

  useEffect(() => {
    if (paired) {
      loadItems();
      const cleanup = subscribeRealtime();
      return () => {
        if (cleanup) (cleanup as any)();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paired, view]);

  async function bump(id: number, next: "in_progress" | "ready") {
    const tok = getAccessToken();
    if (!tok) return;
    const res = await fetch(
      `${import.meta.env.VITE_ORDER_API_URL}/kds/items/${id}/status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({ status: next }),
      }
    );
    if (!res.ok) return message.error("No se pudo actualizar");
    // Optimista
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: next } : it))
    );
  }
  console.log(paired);
  if (!paired) {
    return (
      <Row justify="center" align="middle" style={{ minHeight: "80vh" }}>
        <Col xs={22} sm={16} md={10} lg={8}>
          <Card
            title={
              <span>
                <LockOutlined /> Emparejar monitor
              </span>
            }
          >
            <Space direction="vertical" className="w-full">
              <Input
                placeholder="Código de emparejamiento"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button
                type="primary"
                loading={loading}
                onClick={pairNow}
                icon={<LinkOutlined />}
              >
                Emparejar
              </Button>
              <Typography.Paragraph type="secondary" className="mt-2">
                Pídele al admin que genere un código en el panel de Monitores.
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <div className="p-3">
      <Flex justify="space-between" align="center" className="mb-3">
        <Space>
          <Tag color="gold">Monitor #{getMonitorId()}</Tag>
          <Select
            value={view}
            onChange={(v) => setView(v)}
            options={[
              { label: "Pendientes", value: "pending" },
              { label: "Activos", value: "active" },
              { label: "Todos", value: "all" },
            ]}
            style={{ minWidth: 160 }}
          />
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadItems}>
            Actualizar
          </Button>
          <Button danger icon={<PoweroffOutlined />} onClick={unpair}>
            Desemparejar
          </Button>
        </Space>
      </Flex>

      <Row gutter={[12, 12]}>
        {items.map((it) => (
          <Col key={it.id} xs={24} sm={12} md={8} lg={6} xxl={4}>
            <Card size="small" hoverable>
              <Space direction="vertical" className="w-full">
                <Flex justify="space-between">
                  <span className="opacity-70">Orden #{it.orderId}</span>
                  <Tag
                    color={
                      it.status === "ready"
                        ? "green"
                        : it.status === "in_progress"
                          ? "gold"
                          : "default"
                    }
                  >
                    {it.status === "pending"
                      ? "Pendiente"
                      : it.status === "in_progress"
                        ? "Preparando"
                        : "Listo"}
                  </Tag>
                </Flex>
                <Typography.Text strong>
                  {it.productName || `Producto ${it.productId}`}
                </Typography.Text>
                <div>
                  Cant: <b>{it.qty}</b>
                </div>
                {it.notes ? (
                  <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                    {it.notes}
                  </Typography.Paragraph>
                ) : null}
                <Space>
                  {it.status === "pending" && (
                    <Button
                      type="primary"
                      onClick={() => bump(it.id, "in_progress")}
                    >
                      Comenzar
                    </Button>
                  )}
                  {it.status !== "ready" && (
                    <Button onClick={() => bump(it.id, "ready")}>Listo</Button>
                  )}
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
