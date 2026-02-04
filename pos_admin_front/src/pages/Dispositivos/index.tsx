// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Dispositivos/index.tsx

import { useEffect, useMemo, useState } from "react";
import { Button, Card, List, Select, Space, Tag, message } from "antd";
import apiAuth from "@/components/apis/apiAuth";
import apiCash from "@/components/apis/apiCash";

type Device = {
  id: number;
  device_name: string;
  device_fingerprint?: string | null;
  device_type?: "cash" | "commander" | "monitor";
  cashStationId?: number | null; // 👈 nuevo
  last_seen_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
};
type Station = {
  id: number;
  code?: string;
  name?: string;
  isEnabled?: boolean;
};

export default function Dispositivos() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [type, setType] = useState<
    "cash" | "commander" | "monitor" | undefined
  >(undefined);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  const [stations, setStations] = useState<Station[]>([]);
  const [cashDevices, setCashDevices] = useState<Device[]>([]);

  async function loadStations(rid: number) {
    const { data } = await apiCash.get("/cash_stations", {
      params: { restaurantId: rid }, // si tu endpoint no usa params, quítalo
    });
    setStations(Array.isArray(data) ? data : (data?.data ?? []));
  }
  async function loadCashDevices(rid: number) {
    const { data } = await apiAuth.get(`/restaurants/${rid}/kiosk/devices`, {
      params: { type: "cash" }, // si tu backend lo soporta; si no, luego filtramos
    });

    const rows: Device[] = Array.isArray(data) ? data : (data?.data ?? []);
    // por si no soporta "type=cash", filtramos aquí
    setCashDevices(rows.filter((d) => d.device_type === "cash"));
  }

  const cashDeviceByStationId = useMemo(() => {
    const map = new Map<number, Device>();
    for (const d of cashDevices) {
      if (typeof d.cashStationId === "number") {
        map.set(d.cashStationId, d);
      }
    }
    return map;
  }, [cashDevices]);

  function isOnlineByLastSeen(lastSeen?: string | null) {
    if (!lastSeen) return false;
    const ms = Date.now() - new Date(lastSeen).getTime();
    return ms <= 5 * 60 * 1000; // 5 minutos
  }

  const stationOptions = useMemo(() => {
    const opts = stations.map((st) => {
      const dev = cashDeviceByStationId.get(st.id);

      const revoked = !!dev?.revoked_at;
      const online = !revoked && isOnlineByLastSeen(dev?.last_seen_at);
      const paired = !!dev; // existe device cash emparejado apuntando a esta station

      const prefix = st.code
        ? `${st.code} — ${st.name ?? "Caja"}`
        : `${st.name ?? "Caja"} (ID ${st.id})`;

      const badge = revoked
        ? "⛔ revocada"
        : online
          ? "✅ online"
          : paired
            ? "⚠️ emparejada/offline"
            : "⚠️ no emparejada";

      return {
        label: `${prefix}  ${badge}`,
        value: st.id,
        // opcional: si está revocada, puedes deshabilitarla para evitar asignarla
        disabled: revoked,
      };
    });

    return opts;
  }, [stations, cashDeviceByStationId]);

  async function setCommanderCashStation(
    deviceId: number,
    cashStationId: number | null,
  ) {
    if (!restaurantId) return;

    try {
      await apiAuth.post(`/kiosk/devices/${deviceId}/set-cash-station`, {
        cashStationId,
        restaurantId,
      });

      message.success("Caja destino actualizada");
      await loadDevices(restaurantId, type);
    } catch (e: any) {
      message.error(e?.response?.data?.message || "No se pudo actualizar");
    }
  }

  // Carga restaurante actual del admin
  async function loadMe() {
    try {
      const r = await apiAuth.get("/me");
      const rid = r.data?.restaurant?.id ?? r.data?.restaurantId ?? null;
      setRestaurantId(rid);
      if (rid) {
        await Promise.all([
          loadDevices(rid, type), // tus kiosk devices (lista principal)
          loadStations(rid), // ✅ cajas del sistema
          loadCashDevices(rid), // ✅ estado emparejado/online
        ]);
      }
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
            (d) => d.device_type !== "cash" && d.device_type !== "monitor",
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
                <Space direction="vertical" size={6}>
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

                  {d.device_type === "commander" && (
                    <Space align="center">
                      <span style={{ opacity: 0.8 }}>Imprimir cuentas en:</span>

                      <Select
                        style={{ width: 360 }}
                        placeholder="MASTER (por defecto)"
                        allowClear
                        value={d.cashStationId ?? undefined}
                        options={stationOptions}
                        onChange={(v) =>
                          setCommanderCashStation(d.id, (v ?? null) as any)
                        }
                        disabled={!!d.revoked_at}
                      />

                      <Tag>
                        {d.cashStationId
                          ? `Caja ID ${d.cashStationId}`
                          : "MASTER"}
                      </Tag>
                    </Space>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
