// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/pages/Kiosk/CashHome.tsx

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  InputNumber,
  Space,
  Typography,
  message,
  Spin,
  Empty,
} from "antd";
import apiCashKiosk from "@/components/apis/apiCashKiosk";

type CashOrderItem = {
  id: number;
  name?: string;
  qty: number;
  unitPrice: number;
  total?: number;
};

type CashOrder = {
  id: number;
  tableName?: string | null;
  areaName?: string | null;
  persons?: number;
  items: CashOrderItem[];
};

const { Title, Text } = Typography;

function parseJwt<T = any>(token: string | null): T | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export default function CashHome() {
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [shiftId, setShiftId] = useState<string | null>(
    sessionStorage.getItem("cash_shift_id")
  );
  const [orders, setOrders] = useState<CashOrder[]>([]);

  async function checkCurrentShift() {
    try {
      setLoading(true);
      const jwt = sessionStorage.getItem("kiosk_jwt");
      const payload = parseJwt<{ restaurantId?: number }>(jwt);
      const stationCode = sessionStorage.getItem("cash_station_code") || "";
      const restaurantId = payload?.restaurantId;

      if (!restaurantId || !stationCode) {
        // sin contexto suficiente → forzamos abrir turno (o reemparejar)
        sessionStorage.removeItem("cash_shift_id");
        setShiftId(null);
        setLoading(false);
        return;
      }

      const { data } = await apiCashKiosk.get("/shifts/current", {
        params: { restaurantId, stationCode },
        validateStatus: () => true,
      });

      if (data?.id) {
        const id = String(data.id);
        sessionStorage.setItem("cash_shift_id", id);
        setShiftId(id);
      } else {
        sessionStorage.removeItem("cash_shift_id");
        setShiftId(null);
      }
    } catch {
      sessionStorage.removeItem("cash_shift_id");
      setShiftId(null);
    } finally {
      setLoading(false);
    }
  }

  async function openShift() {
    const jwt = sessionStorage.getItem("kiosk_jwt");
    const payload = parseJwt<{ restaurantId?: number }>(jwt);
    const restaurantId = payload?.restaurantId;
    const stationCode = sessionStorage.getItem("cash_station_code") || "";

    if (!restaurantId || !stationCode) {
      return message.error(
        "Falta restaurantId/stationCode. Reempareja el dispositivo."
      );
    }

    try {
      setLoading(true);
      const { data } = await apiCashKiosk.post("/shifts/open", {
        restaurantId,
        stationCode,
        openingCash: Number(openingCash || 0),
      });
      const id = String(data?.id);
      sessionStorage.setItem("cash_shift_id", id);
      setShiftId(id);
      message.success("Turno abierto");
      await fetchOrders();
    } catch (e: any) {
      message.error(
        String(e?.response?.data?.error || "No se pudo abrir el turno")
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    try {
      setLoading(true);
      // expón en CASH un endpoint para listar órdenes a cobrar con kiosk_jwt (o proxéalas)
      // por ahora asumo GET /orders/open
      const { data } = await apiCashKiosk.get<CashOrder[]>("/orders/open", {
        validateStatus: () => true,
      });
      setOrders((data || []).map((o) => ({ ...o, items: o.items || [] })));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function pay(orderId: number) {
    try {
      // ejemplo mínimo: marcar pagada
      await apiCashKiosk.post(`/orders/${orderId}/pay`, {}); // ajusta al endpoint real
      message.success(`Orden #${orderId} pagada`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e: any) {
      message.error(String(e?.response?.data?.error || "No se pudo cobrar"));
    }
  }

  useEffect(() => {
    (async () => {
      await checkCurrentShift();
      if (sessionStorage.getItem("cash_shift_id")) {
        await fetchOrders();
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "80vh" }}>
        <Spin />
      </div>
    );
  }

  // Paso 1: abrir turno si no hay
  if (!shiftId) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <Card style={{ width: 420 }}>
          <Title level={3} style={{ marginTop: 0 }}>
            Abrir turno
          </Title>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Text>Efectivo inicial</Text>
              <InputNumber
                prefix="$"
                min={0}
                style={{ width: "100%" }}
                value={openingCash}
                onChange={(v) => setOpeningCash(Number(v || 0))}
              />
            </div>
            <Button type="primary" block onClick={openShift}>
              Abrir turno
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Paso 2: mostrar órdenes para cobrar
  return (
    <div style={{ padding: 16 }}>
      <Space
        style={{
          width: "100%",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Caja · Turno #{shiftId}
        </Title>
        <Space>
          <Button onClick={fetchOrders}>Refrescar</Button>
        </Space>
      </Space>

      {orders.length === 0 ? (
        <Empty description="Sin órdenes pendientes de cobro" />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {orders.map((o) => (
            <Card
              key={o.id}
              size="small"
              title={`Orden #${o.id} · ${o.tableName ?? "-"}`}
            >
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                Área: {o.areaName ?? "-"} · Personas: {o.persons ?? "-"}
              </div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                Ítems:
                <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                  {o.items.map((it) => {
                    const total =
                      it.total ?? (it.qty ?? 0) * (it.unitPrice ?? 0);
                    return (
                      <li key={it.id}>
                        {it.qty} × {it.name ?? `#${it.id}`} — $
                        {Number(total).toFixed(2)}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Button type="primary" block onClick={() => pay(o.id)}>
                Cobrar
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
