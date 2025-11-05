// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Stations/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  message,
  Space,
  Select,
  Switch,
  Form,
  Tag,
} from "antd";
import { PlusOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import apiAuth from "@/components/apis/apiAuth";
import apiCash from "@/components/apis/apiCash";
import { useAuth } from "@/components/Auth/AuthContext"; // 👈 nuevo
import { Drawer } from "antd";

type Mode = "MASTER" | "DEPENDENT";
type Station = {
  id: number;
  restaurantId: number;
  code: string;
  name: string;
  mode: Mode;
  isEnabled: boolean;
  openingRequired: boolean;
  // ↓ campos originales pueden venir vacíos si no hay JOIN en backend
  users?: { id: number; full_name: string }[];

  // ↓ resueltos en el front cruzando pivote + pos-auth
  _cashierIds?: number[]; // varios IDs
  _cashierNames?: string[];
};

type Cashier = { id: number; full_name: string };

const MODE_OPTS = [
  { label: "Maestra", value: "MASTER" },
  { label: "Dependiente", value: "DEPENDENT" },
];

export default function CashStations() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?.id || null;
  const [rows, setRows] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form] = Form.useForm<Partial<Station>>();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashierIds, setSelectedCashierIds] = useState<number[]>([]);

  const [devOpen, setDevOpen] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [devRows, setDevRows] = useState<any[]>([]);
  const [devStation, setDevStation] = useState<Station | null>(null);

  async function openDevices(st: Station) {
    setDevStation(st);
    setDevOpen(true);
    setDevLoading(true);
    try {
      const { data } = await apiCash.get(`/cash_stations/${st.id}/devices`);
      setDevRows(data || []);
    } catch {
      message.error("No se pudieron cargar los dispositivos");
    } finally {
      setDevLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? rows.filter((r) =>
          [r.code, r.name, r.mode].some((x) =>
            String(x).toLowerCase().includes(s)
          )
        )
      : rows;
  }, [q, rows]);

  async function load() {
    setLoading(true);
    try {
      // 1) estaciones en pos-cash-api
      if (!restaurantId) {
        setRows([]);
        setLoading(false);
        return message.warning(
          "Selecciona un restaurante para ver estaciones."
        );
      }
      const { data: stations } = await apiCash.get("/cash_stations", {
        params: { restaurantId },
      });

      // 2) cajeros en pos-auth (del restaurante actual)
      const { data: cashierList } = await apiAuth.get("/users/cashiers");

      // 3) por estación, obtener pivote y resolver nombre de cajero
      const rowsWithCashier: Station[] = await Promise.all(
        (stations || []).map(async (st: Station) => {
          const { data: links } = await apiCash.get(
            `/cash_stations/${st.id}/users`
          );
          // links = [{ userId }, ...]
          const ids = Array.isArray(links)
            ? links.map((l: any) => Number(l.userId)).filter(Boolean)
            : [];
          const names = ids
            .map((id) => (cashierList || []).find((c: any) => c.id === id))
            .map((c) => c?.fullName || c?.full_name)
            .filter(Boolean) as string[];
          return { ...st, _cashierIds: ids, _cashierNames: names };
        })
      );

      setRows(rowsWithCashier);
    } catch {
      message.error("No se pudieron cargar estaciones");
    } finally {
      setLoading(false);
    }
  }

  async function loadCashiers() {
    try {
      const r = await apiAuth.get("/users/cashiers"); // o /api/users?role=cashier
      setCashiers(r.data || []);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    loadCashiers();
  }, [restaurantId]);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      mode: "MASTER",
      isEnabled: true,
      openingRequired: true,
    });
    setSelectedCashierIds([]); // 👈 vacío (multi-selección)
    setIsModalOpen(true);
  }

  function openEdit(st: Station) {
    setEditing(st);
    form.setFieldsValue({
      code: st.code,
      name: st.name,
      mode: st.mode,
      isEnabled: st.isEnabled,
      openingRequired: st.openingRequired,
    });
    // usar la pivote resuelta
    setSelectedCashierIds(
      st._cashierIds ?? (st.users?.[0]?.id ? [st.users[0].id] : [])
    );

    setIsModalOpen(true);
  }

  async function save() {
    const values = await form.validateFields();
    try {
      let stationId: number;

      if (!restaurantId) {
        return message.error("Falta restaurantId");
      }

      if (editing) {
        await apiCash.put(`/cash_stations/${editing.id}`, { ...values });
        stationId = editing.id;
      } else {
        const { data } = await apiCash.post(`/stations`, {
          restaurantId,
          ...values,
        }); // 👈 envía restaurantId
        stationId = data.id;
      }

      // sincroniza pivote station_users con el cajero seleccionado
      await apiCash.post(`/cash_stations/${stationId}/users`, {
        userIds: selectedCashierIds,
      });

      message.success(editing ? "Estación actualizada" : "Estación creada");
      setIsModalOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "No se pudo guardar");
    }
  }

  function del(id: number) {
    Modal.confirm({
      title: "Eliminar estación",
      content: "¿Seguro que deseas eliminar esta estación?",
      okType: "danger",
      onOk: async () => {
        try {
          await apiCash.delete(`/cash_stations/${id}`);
          message.success("Eliminada");
          load();
        } catch {
          message.error("No se pudo eliminar");
        }
      },
    });
  }

  const cols = [
    { title: "Código", dataIndex: "code" },
    { title: "Nombre", dataIndex: "name" },
    {
      title: "Modo",
      dataIndex: "mode",
      render: (v: Mode) => (v === "MASTER" ? "Maestra" : "Dependiente"),
    },
    {
      title: "Activa",
      dataIndex: "isEnabled",
      render: (v: boolean) =>
        v ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>,
    },
    {
      title: "Requiere apertura",
      dataIndex: "openingRequired",
      render: (v: boolean) => (v ? "Sí" : "No"),
    },
    {
      title: "Dispositivos",
      key: "devices",
      render: (_: any, st: Station & { devices_count?: number }) => (
        <Button size="small" onClick={() => openDevices(st)}>
          Ver {st.devices_count != null ? `(${st.devices_count})` : ""}
        </Button>
      ),
    },
    {
      title: "Cajeros asignados",
      key: "user",
      render: (_: any, st: Station) => {
        const names = st._cashierNames?.length
          ? st._cashierNames
          : st.users
            ? [st.users[0]?.full_name].filter(Boolean)
            : [];
        return names?.length ? (
          names.join(", ")
        ) : (
          <span className="opacity-60">—</span>
        );
      },
    },

    {
      title: "Acciones",
      key: "actions",
      render: (_: any, st: Station) => (
        <Space>
          <Button size="small" onClick={() => openEdit(st)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => del(st.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Buscar por código/nombre/modo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
          allowClear
        />
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={load}
            disabled={!restaurantId}
          >
            Recargar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nueva estación
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={cols as any}
        dataSource={filtered}
        loading={loading}
      />
      <Drawer
        title={`Dispositivos · ${devStation?.code || ""}`}
        open={devOpen}
        onClose={() => setDevOpen(false)}
        width={720}
      >
        <Table
          rowKey="id"
          loading={devLoading}
          dataSource={devRows}
          pagination={false}
          columns={[
            { title: "Nombre", dataIndex: "device_name" },
            { title: "Tipo", dataIndex: "device_type" },
            { title: "Fingerprint", dataIndex: "fingerprint" },
            {
              title: "Última vez",
              dataIndex: "last_seen_at",
              render: (v: string | null) =>
                v
                  ? new Date(v).toLocaleString("es-MX", { hour12: false })
                  : "—",
            },
            {
              title: "Estado",
              render: (_: any, r: any) =>
                r.revoked_at ? (
                  <Tag color="red">Revocado</Tag>
                ) : r.in_use ? (
                  <Tag color="green">Activo</Tag>
                ) : (
                  <Tag>Inactivo</Tag>
                ),
            },
            {
              title: "Acciones",
              render: (_: any, r: any) => (
                <Space>
                  <Button
                    size="small"
                    onClick={async () => {
                      const name =
                        prompt("Nuevo nombre", r.device_name || "") || "";
                      if (!name.trim()) return;
                      await apiCash.post(`/kiosk/devices/${r.id}/rename`, {
                        name,
                      });
                      openDevices(devStation!); // recarga
                    }}
                  >
                    Renombrar
                  </Button>
                  {r.revoked_at ? (
                    <Button
                      size="small"
                      type="primary"
                      onClick={async () => {
                        await apiCash.post(`/kiosk/devices/${r.id}/unrevoke`);
                        openDevices(devStation!);
                      }}
                    >
                      Restaurar
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      danger
                      onClick={async () => {
                        await apiCash.post(`/kiosk/devices/${r.id}/revoke`);
                        openDevices(devStation!);
                      }}
                    >
                      Revocar
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Drawer>

      <Modal
        title={editing ? "Editar estación" : "Nueva estación"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={save}
        okText={editing ? "Actualizar" : "Crear"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Código" rules={[{ required: true }]}>
            <Input placeholder="CAJA-1" />
          </Form.Item>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Caja principal" />
          </Form.Item>
          <Form.Item name="mode" label="Modo" rules={[{ required: true }]}>
            <Select options={MODE_OPTS} />
          </Form.Item>
          <Form.Item name="isEnabled" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="openingRequired"
            label="Requiere apertura"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <div className="mt-2">
            <label className="ant-form-item-required">
              Cajero inicial (opcional)
            </label>
            <Select
              mode="multiple"
              allowClear
              placeholder="Asignar cajeros"
              suffixIcon={<UserOutlined />}
              value={selectedCashierIds}
              onChange={(v) => setSelectedCashierIds(v)}
              options={cashiers.map((c: any) => ({
                label: c.full_name ?? c.fullName ?? c.email, // 👈 normalizado
                value: c.id,
              }))}
              className="w-full"
              showSearch
              optionFilterProp="label"
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
