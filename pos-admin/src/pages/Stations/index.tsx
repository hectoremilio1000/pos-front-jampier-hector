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

type Mode = "MASTER" | "DEPENDENT";
type Station = {
  id: number;
  restaurantId: number;
  code: string;
  name: string;
  mode: Mode;
  isEnabled: boolean;
  openingRequired: boolean;
  users?: { id: number; full_name: string }[];
};
type Cashier = { id: number; full_name: string };

const MODE_OPTS = [
  { label: "Maestra", value: "MASTER" },
  { label: "Dependiente", value: "DEPENDENT" },
];

export default function Stations() {
  const [rows, setRows] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form] = Form.useForm<Partial<Station>>();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState<
    number | undefined
  >(undefined);

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
      const res = await apiCash.get("/stations"); // ← tu API
      setRows(res.data || []);
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
  }, []);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      mode: "MASTER",
      isEnabled: true,
      openingRequired: true,
    });
    setSelectedCashierId(undefined);
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
    setSelectedCashierId(st.users?.[0]?.id);
    setIsModalOpen(true);
  }

  async function save() {
    const values = await form.validateFields();
    try {
      if (editing) {
        await apiCash.put(`/stations/${editing.id}`, {
          ...values,
          cashierId: selectedCashierId,
        });
        message.success("Estación actualizada");
      } else {
        await apiCash.post(`/stations`, {
          ...values,
          cashierId: selectedCashierId,
        });
        message.success("Estación creada");
      }
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
          await apiCash.delete(`/stations/${id}`);
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
      title: "Cajero asignado",
      key: "user",
      render: (_: any, st: Station) =>
        st.users?.[0]?.full_name || <span className="opacity-60">—</span>,
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
          <Button icon={<ReloadOutlined />} onClick={load}>
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
              allowClear
              placeholder="Asignar cajero"
              suffixIcon={<UserOutlined />}
              value={selectedCashierId}
              onChange={(v) => setSelectedCashierId(v)}
              options={cashiers.map((c) => ({
                label: c.full_name,
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
