import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CopyOutlined,
  LinkOutlined,
  LockOutlined,
  PoweroffOutlined,
  PlusOutlined,
  QrcodeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import apiAuth from "@/components/apis/apiAuth";
import { Transmit } from "@adonisjs/transmit-client";

/**
 * AdminPairing+KDS.tsx
 * - AdminMonitorPairing: Panel para generar pairing code y administrar devices (usa apiAuth + apiOrder)
 * - KdsApp: App de KDS (kiosko) con pairing + vista de producción (usa fetch directo con Bearer + Transmit)
 *
 * Requiere:
 *  VITE_ORDER_API_URL, VITE_TRANSMIT_URL, VITE_AUTH_API_URL (ya manejado por apiOrder/apiAuth)
 */

/* ========================= Tipos compartidos ========================= */
interface ProductionMonitor {
  id: number;
  restaurantId?: number;
  code: string;
  name: string;
  mode: "kitchen" | "bar" | "expo";
  isEnabled: boolean;
}
interface AreaImpresion {
  id: number;
  name: string;
}
interface DeviceRow {
  id: number;
  device_name: string;
  device_fingerprint?: string | null;
  last_seen_at?: string | null;
  revoked_at?: string | null;
  refresh_token_expires_at?: string | null;
  created_at?: string;
}

/* ========================= 1) Admin: Pairing ========================= */
export function AdminMonitorPairing() {
  const [monitors, setMonitors] = useState<ProductionMonitor[]>([]);
  const [areas, setAreas] = useState<AreaImpresion[]>([]);
  const [loading, setLoading] = useState(false);
  const [monitorId, setMonitorId] = useState<number | null>(null);
  const [ttl, setTtl] = useState<number>(10);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);

  async function loadBasics() {
    setLoading(true);
    try {
      const [mRes, aRes] = await Promise.all([
        apiOrder.get("/productionMonitors"),
        apiOrder.get("/areasImpresion"),
      ]);
      setMonitors(mRes.data || []);
      setAreas(aRes.data || []);
    } catch (e) {
      message.error("No se pudieron cargar monitores/áreas");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadBasics();
  }, []);

  async function generateCode() {
    if (!monitorId) return message.warning("Elige un monitor");
    try {
      const res = await apiAuth.post(`/monitors/${monitorId}/pairing-code`, {
        ttlMinutes: ttl,
      });
      setPairCode(res.data.code);
      setExpiresAt(res.data.expiresAt);
      message.success("Código generado");
      loadDevices(monitorId);
    } catch (e: any) {
      const err = e?.response?.data?.error || "No se pudo generar el código";
      message.error(err);
    }
  }

  async function loadDevices(id?: number) {
    const mid = id ?? monitorId;
    if (!mid) return;
    try {
      const r = await apiAuth.get(`/monitors/${mid}/devices`);
      setDevices(r.data || []);
    } catch {
      setDevices([]);
    }
  }

  useEffect(() => {
    loadDevices();
  }, [monitorId]);

  const monitor = useMemo(
    () => monitors.find((m) => m.id === monitorId) || null,
    [monitorId, monitors]
  );

  const areaCols = [
    { title: "ID", dataIndex: "id" },
    { title: "Nombre", dataIndex: "name" },
  ];

  return (
    <div className="space-y-4">
      <Flex gap={12} wrap>
        <Select
          placeholder="Elige un monitor"
          className="min-w-[260px]"
          value={monitorId as any}
          onChange={(v) => setMonitorId(v)}
          options={monitors.map((m) => ({
            label: `${m.code} — ${m.name}`,
            value: m.id,
          }))}
          showSearch
          optionFilterProp="label"
        />
        <InputNumber
          min={1}
          max={60}
          value={ttl}
          onChange={(v) => setTtl(v || 10)}
          addonBefore="TTL"
          addonAfter="min"
        />
        <Button type="primary" icon={<QrcodeOutlined />} onClick={generateCode}>
          Generar código
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            loadBasics();
            loadDevices();
          }}
        >
          Recargar
        </Button>
      </Flex>
      {monitor && (
        <Descriptions
          bordered
          size="small"
          column={1}
          title="Monitor seleccionado"
        >
          <Descriptions.Item label="Código">{monitor.code}</Descriptions.Item>
          <Descriptions.Item label="Nombre">{monitor.name}</Descriptions.Item>
          <Descriptions.Item label="Modo">{monitor.mode}</Descriptions.Item>
          <Descriptions.Item label="Estatus">
            {monitor.isEnabled ? (
              <Tag color="green">Activo</Tag>
            ) : (
              <Tag color="red">Inactivo</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      )}
      {pairCode && (
        <Card
          title="Código de emparejamiento"
          extra={
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(pairCode!);
                message.success("Copiado");
              }}
            >
              Copiar
            </Button>
          }
        >
          <Flex gap={8} align="center">
            <Typography.Title level={2} style={{ margin: 0 }}>
              {pairCode}
            </Typography.Title>
            {expiresAt && (
              <span className="opacity-70">
                expira: {new Date(expiresAt).toLocaleString()}
              </span>
            )}
          </Flex>
          <Typography.Paragraph className="mt-2 opacity-80">
            En la app de monitor, introduce este código en la pantalla de
            emparejamiento.
          </Typography.Paragraph>
        </Card>
      )}
      <Card title="Dispositivos emparejados">
        <List
          dataSource={devices}
          renderItem={(d) => (
            <List.Item
              actions={[
                d.revoked_at ? (
                  <Tag color="red">Revocado</Tag>
                ) : (
                  <Button
                    danger
                    size="small"
                    onClick={async () => {
                      await apiAuth.post(`/api/devices/${d.id}/revoke`);
                      message.success("Dispositivo revocado");
                      loadDevices();
                    }}
                  >
                    Revocar
                  </Button>
                ),
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {d.device_name}{" "}
                    {d.device_fingerprint ? (
                      <Tag>{d.device_fingerprint}</Tag>
                    ) : null}
                  </span>
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
                    <span>
                      Refresh expira:{" "}
                      {d.refresh_token_expires_at
                        ? new Date(d.refresh_token_expires_at).toLocaleString()
                        : "—"}
                    </span>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
      <Divider />\
      <Typography.Paragraph className="opacity-70">
        Tip: si quieres mostrar también qué áreas tiene asignadas el monitor,
        usa la vista de Monitores o añade una tabla con{" "}
        <code>/productionMonitors/:id/areas</code>.
      </Typography.Paragraph>
    </div>
  );
}
