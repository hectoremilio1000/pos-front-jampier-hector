import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  message,
  Space,
  InputNumber,
  Select,
  Switch,
  Popconfirm,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useAuth } from "@/components/Auth/AuthContext";
import apiCash from "@/components/apis/apiCash";
import apiAuth from "@/components/apis/apiAuth";

/* ── DTO ─────────────────────────────────────────────── */
export interface CashierDTO {
  id: number;
  fullName: string;
  email: string;
}

interface StationDTO {
  id: number;
  restaurantId: number;
  code: string;
  name: string;
  mode: "MASTER" | "DEPENDENT";
  isEnabled: boolean;
  openingRequired: boolean;
  users: CashierDTO[];
}
export const getCashiers = async (restaurantId?: number) => {
  const { data } = await apiAuth.get<CashierDTO[]>("/users/cashiers", {
    params: restaurantId ? { restaurantId } : {},
  });
  return data;
};

/* ── Page ────────────────────────────────────────────── */
export default function Stations() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant.id;

  // dentro del componente:
  const [cashiers, setCashiers] = useState<CashierDTO[]>([]);
  const [cashierId, setCashierId] = useState<number | null>(null);

  const [stations, setStations] = useState<StationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* modal / form state */
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<StationDTO | null>(null);
  const [form, setForm] = useState<Partial<StationDTO>>({
    code: "",
    name: "",
    mode: "MASTER",
    isEnabled: true,
    openingRequired: true,
  });

  /* cargar cajeros cuando se abre el modal */
  const openModalForCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      mode: "MASTER",
      isEnabled: true,
      openingRequired: true,
    });
    setCashierId(null);
    fetchCashiers();
    setOpenModal(true);
  };
  const openModalForEdit = async (rec: StationDTO) => {
    setEditing(rec);
    setForm(rec);
    await fetchCashiers();
    /* trae cajero asignado */
    await apiCash.get(`/stations/${rec.id}/users`).then(({ data }) => {
      data.length !== 0 ? setCashierId(data[0].id) : setCashierId(null);
    });
    setOpenModal(true);
  };

  const fetchCashiers = async () => {
    if (!restaurantId) return;
    const list = await getCashiers(restaurantId);
    setCashiers(list);
  };

  /* ── CRUD helpers ──────────────────────────────────── */
  const fetchStations = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const { data } = await apiCash.get<StationDTO[]>("/stations", {
        params: { restaurantId },
      });
      setStations(data);
    } catch {
      message.error("Error al cargar las estaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    const payload = { ...form, restaurantId, cashierId } as Partial<StationDTO>;

    try {
      if (editing) {
        await apiCash.put(`/stations/${editing.id}`, payload);
        message.success("Estación actualizada");
      } else {
        await apiCash.post("/stations", payload);
        message.success("Estación creada");
      }
      setOpenModal(false);
      setEditing(null);
      fetchStations();
    } catch {
      message.error("Error al guardar");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiCash.delete(`/stations/${id}`);
      message.success("Estación eliminada");
      fetchStations();
    } catch {
      message.error("Error al eliminar");
    }
  };

  /* ── Effects ───────────────────────────────────────── */
  useEffect(() => {
    fetchStations();
  }, [restaurantId]);

  /* ── Table columns ─────────────────────────────────── */
  const columns = [
    { title: "Código", dataIndex: "code" },
    { title: "Nombre", dataIndex: "name" },
    {
      title: "Modo",
      dataIndex: "mode",
      render: (m: string) => (m === "MASTER" ? "MASTER" : "DEPENDENT"),
    },
    {
      title: "Cajero",
      render: (_: any, rec: StationDTO) =>
        rec.users.length ? rec.users[0].fullName : "—",
    },

    {
      title: "Activa",
      dataIndex: "isEnabled",
      render: (v: boolean) =>
        v ? (
          <span className="text-green-600 font-semibold">Sí</span>
        ) : (
          <span className="text-red-500">No</span>
        ),
    },
    {
      title: "Req. fondo",
      dataIndex: "openingRequired",
      render: (v: boolean) => (v ? "Sí" : "No"),
    },
    {
      title: "Acciones",
      render: (_: any, rec: StationDTO) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              openModalForEdit(rec);
            }}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar estación?"
            onConfirm={() => handleDelete(rec.id)}
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filtered = stations.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="space-y-4 p-6">
      {/* header */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar estación"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => {
            openModalForCreate();
          }}
        >
          Nueva estación
        </Button>
      </div>

      {/* table */}
      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filtered}
        loading={loading}
        pagination={false}
        className="bg-white rounded-xl shadow"
      />

      {/* modal */}
      <Modal
        title={editing ? "Editar estación" : "Nueva estación"}
        open={openModal}
        onCancel={() => setOpenModal(false)}
        onOk={handleSave}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <div className="space-y-3">
          <Input
            placeholder="Código"
            value={form.code}
            maxLength={12}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Select
            className="w-full"
            value={form.mode}
            onChange={(val) =>
              setForm({ ...form, mode: val as "MASTER" | "DEPENDENT" })
            }
          >
            <Select.Option value="MASTER">MASTER</Select.Option>
            <Select.Option value="DEPENDENT">DEPENDENT</Select.Option>
          </Select>
          <Select
            className="w-full"
            placeholder="Selecciona cajero"
            value={cashierId ?? undefined}
            onChange={(val) => setCashierId(val)}
            options={cashiers.map((c) => ({
              value: c.id,
              label: `${c.fullName} (${c.email})`,
            }))}
            allowClear
          />
          <div className="flex items-center justify-between">
            <span>Habilitada</span>
            <Switch
              checked={!!form.isEnabled}
              onChange={(v) => setForm({ ...form, isEnabled: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Requiere fondo inicial</span>
            <Switch
              checked={!!form.openingRequired}
              onChange={(v) => setForm({ ...form, openingRequired: v })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
