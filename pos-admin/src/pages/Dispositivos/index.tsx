// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Dispositivos/index.tsx

import { useEffect, useState } from "react";
import { Button, Card, List, Select, Space, Tag, message } from "antd";
import apiAuth from "@/components/apis/apiAuth";

type Device = {
  id: number;
  device_name: string;
  device_fingerprint?: string | null;
  device_type?: "cash" | "commander" | "monitor";
  last_seen_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
};

export default function Dispositivos() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [type, setType] = useState<
    "cash" | "commander" | "monitor" | undefined
  >(undefined);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  // Carga restaurante actual del admin
  async function loadMe() {
    try {
      const r = await apiAuth.get("/me");
      const rid = r.data?.restaurant?.id ?? r.data?.restaurantId ?? null;
      setRestaurantId(rid);
      if (rid) await loadDevices(rid, type);
    } catch {
      message.error("No se pudo cargar el restaurante actual");
    }
  }

  async function loadDevices(rid: number, t?: Device["device_type"]) {
    setLoading(true);
    try {
      const res = await apiAuth.get(`/restaurants/${rid}/kiosk/devices`, {
        params: t ? { type: t } : undefined,
      });
      const list: Device[] = res.data || [];

      // Si no hay filtro activo, oculta "cash"
      const filtered = t
        ? list
        : list.filter(
            (d) => d.device_type !== "cash" && d.device_type !== "monitor"
          );

      setDevices(filtered);
    } catch {
      setDevices([]);
      message.error("No se pudieron cargar los dispositivos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restaurantId) loadDevices(restaurantId, type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function revoke(id: number) {
    await apiAuth.post(`/kiosk/devices/${id}/revoke`);
    message.success("Dispositivo revocado");
    if (restaurantId) loadDevices(restaurantId, type);
  }

  async function restore(id: number) {
    await apiAuth.post(`/kiosk/devices/${id}/unrevoke`);
    message.success("Dispositivo restaurado");
    if (restaurantId) loadDevices(restaurantId, type);
  }

  return (
    <Card
      title="Dispositivos emparejados"
      loading={loading}
      extra={
        <Space>
          <Select
            allowClear
            placeholder="Filtrar por tipo"
            style={{ width: 180 }}
            value={type}
            onChange={(v) => setType(v as any)}
            options={[
              { label: "Comandero", value: "commander" },
              // { label: "Caja", value: "cash" },
              { label: "Monitor", value: "monitor" },
            ]}
          />
          <Button
            onClick={() => restaurantId && loadDevices(restaurantId, type)}
          >
            Recargar
          </Button>
        </Space>
      }
    >
      <List
        dataSource={devices}
        locale={{ emptyText: "No hay dispositivos emparejados" }}
        renderItem={(d) => (
          <List.Item
            actions={[
              d.revoked_at ? (
                <Tag color="red">Revocado</Tag>
              ) : (
                <Button danger size="small" onClick={() => revoke(d.id)}>
                  Revocar
                </Button>
              ),
              d.revoked_at ? (
                <Button size="small" onClick={() => restore(d.id)}>
                  Restaurar
                </Button>
              ) : null,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <strong>{d.device_name || "Sin nombre"}</strong>
                  {d.device_type && <Tag>{d.device_type}</Tag>}
                  {d.device_fingerprint && <Tag>{d.device_fingerprint}</Tag>}
                </Space>
              }
              description={
                <Space direction="vertical" size={2}>
                  <span>
                    Creado:{" "}
                    {d.created_at
                      ? new Date(d.created_at).toLocaleString()
                      : "—"}
                  </span>
                  <span>
                    Última vez:{" "}
                    {d.last_seen_at
                      ? new Date(d.last_seen_at).toLocaleString()
                      : "—"}
                  </span>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
