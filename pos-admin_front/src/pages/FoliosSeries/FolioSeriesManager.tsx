import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Switch,
  Table,
  message,
  Space,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCash from "@/components/apis/apiCash";
import apiOrder from "@/components/apis/apiOrder";
import { useAuth } from "@/components/Auth/AuthContext";

type FolioSeries = {
  id: number;
  code: string;
  name: string;
  nextNumber: number;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type CashStation = {
  id: number;
  code?: string;
  name?: string;
};

type Assignment = {
  id: number;
  stationId: number;
  folioSeriesId: number;
  isDefault: boolean;
  priority: number;
};

export default function FolioSeriesManager({
  embedded = false,
  onRowsChange,
}: {
  embedded?: boolean;
  onRowsChange?: (rows: FolioSeries[]) => void;
}) {
  const { user } = useAuth();
  const [rows, setRows] = useState<FolioSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<FolioSeries | null>(null);
  const [form] = Form.useForm();

  const [openAssign, setOpenAssign] = useState(false);
  const [assignTarget, setAssignTarget] = useState<FolioSeries | null>(null);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, nextNumber: 1 });
    setOpenForm(true);
  }

  async function createDefaultSeries() {
    try {
      message.loading({ content: "Creando folio automático...", key: "auto" });
      await apiOrder.post("/folio-series/ensure-default");
      message.success({ content: "Folio creado", key: "auto" });
      fetchRows();
    } catch (e: any) {
      message.error({
        content: e?.response?.data?.error ?? "No se pudo crear el folio",
        key: "auto",
      });
    }
  }

  async function fetchRows() {
    setLoading(true);
    try {
      const { data } = await apiOrder.get("/folio-series", { params: { q } });
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      onRowsChange?.(list);
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? "Error cargando folios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: ColumnsType<FolioSeries> = useMemo(
    () => [
      { title: "Código", dataIndex: "code" },
      { title: "Nombre", dataIndex: "name" },
      { title: "Siguiente #", dataIndex: "nextNumber" },
      {
        title: "Activo",
        dataIndex: "isActive",
        render: (v) => (v ? "Sí" : "No"),
      },
      {
        title: "Acciones",
        render: (_, r) => (
          <Space>
            <Button
              onClick={() => {
                setEditing(r);
                form.setFieldsValue({
                  code: r.code,
                  name: r.name,
                  nextNumber: r.nextNumber,
                  isActive: r.isActive,
                });
                setOpenForm(true);
              }}
            >
              Editar
            </Button>

            <Button
              onClick={() => {
                setAssignTarget(r);
                setOpenAssign(true);
              }}
            >
              Asignar a cajas
            </Button>

            <Button
              danger
              onClick={() => {
                Modal.confirm({
                  title: "Eliminar folio de cuenta",
                  content:
                    "Si está asignado a alguna caja, el backend lo bloqueará. ¿Deseas continuar?",
                  okText: "Eliminar",
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    try {
                      await apiOrder.delete(`/folio-series/${r.id}`);
                      message.success("Eliminado");
                      fetchRows();
                    } catch (e: any) {
                      message.error(
                        e?.response?.data?.error ?? "No se pudo eliminar"
                      );
                    }
                  },
                });
              }}
            >
              Eliminar
            </Button>
          </Space>
        ),
      },
    ],
    [form]
  );

  async function onSubmit() {
    const values = await form.validateFields();
    try {
      message.loading({ content: "Guardando...", key: "save" });

      if (editing) {
        await apiOrder.put(`/folio-series/${editing.id}`, {
          code: values.code,
          name: values.name,
          nextNumber: Number(values.nextNumber),
          isActive: Boolean(values.isActive),
        });
      } else {
        await apiOrder.post("/folio-series", {
          code: values.code,
          name: values.name,
          nextNumber: Number(values.nextNumber),
          isActive: Boolean(values.isActive),
        });
      }

      message.success({ content: "Guardado", key: "save" });
      setOpenForm(false);
      setEditing(null);
      form.resetFields();
      fetchRows();
    } catch (e: any) {
      message.error({
        content: e?.response?.data?.error ?? "Error guardando",
        key: "save",
      });
    }
  }

  return (
    <div style={{ padding: embedded ? 0 : 16 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <Input
          placeholder="Buscar por código o nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onPressEnter={fetchRows}
          style={{ maxWidth: 360 }}
        />
        <Button onClick={fetchRows}>Buscar</Button>
        <Button type="primary" onClick={openCreate}>
          Nuevo folio de cuenta
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
        locale={{
          emptyText: (
            <Empty
              description={
                <div style={{ maxWidth: 360, margin: "0 auto" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Aún no tienes folios de cuentas
                  </div>
                  <div style={{ color: "#666", marginBottom: 12 }}>
                    Crea una serie (por ejemplo A, siguiente 1) para numerar
                    tus cuentas e impresiones.
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <Button type="primary" onClick={createDefaultSeries}>
                      Crear folio automático
                    </Button>
                    <Button onClick={openCreate}>Crear folio manual</Button>
                  </div>
                </div>
              }
            />
          ),
        }}
      />

      <Modal
        title={editing ? "Editar folio de cuenta" : "Nuevo folio de cuenta"}
        open={openForm}
        onCancel={() => {
          setOpenForm(false);
          setEditing(null);
        }}
        onOk={onSubmit}
        okText="Guardar"
      >
        <Form layout="vertical" form={form}>
          <Form.Item name="code" label="Código" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="nextNumber"
            label="Siguiente número"
            rules={[{ required: true }]}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item name="isActive" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <AssignStationsModal
        open={openAssign}
        onClose={() => {
          setOpenAssign(false);
          setAssignTarget(null);
        }}
        restaurantId={user?.restaurant?.id || 0}
        folio={assignTarget}
      />
    </div>
  );
}

function AssignStationsModal({
  open,
  onClose,
  restaurantId,
  folio,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: number;
  folio: FolioSeries | null;
}) {
  const [stations, setStations] = useState<CashStation[]>([]);
  // const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!folio) return;
    setLoading(true);
    try {
      const [stRes, asRes] = await Promise.all([
        apiCash.get(`/cash_stations?restaurantId=${restaurantId}`),
        apiOrder.get(`/folio-series/${folio.id}/stations`),
      ]);

      setStations(stRes.data);
      // setAssignments(asRes.data);

      const map: Record<number, boolean> = {};
      for (const a of asRes.data as Assignment[]) map[a.stationId] = true;
      setSelected(map);
    } catch (e: any) {
      message.error(
        e?.response?.data?.error ?? "Error cargando cajas/asignaciones"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, folio?.id]);

  async function save() {
    if (!folio) return;
    const stationIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));

    try {
      message.loading({ content: "Guardando asignaciones...", key: "assign" });
      await apiOrder.put(`/folio-series/${folio.id}/stations`, {
        stationIds,
      });
      message.success({ content: "Asignaciones guardadas", key: "assign" });
      onClose();
    } catch (e: any) {
      message.error({
        content: e?.response?.data?.error ?? "No se pudo guardar",
        key: "assign",
      });
    }
  }

  return (
    <Modal
      title={folio ? `Asignar "${folio.code}" a cajas` : "Asignar a cajas"}
      open={open}
      onCancel={onClose}
      onOk={save}
      okText="Guardar"
      confirmLoading={loading}
      width={720}
    >
      <div style={{ marginBottom: 8, opacity: 0.8 }}>
        Nota: una caja solo puede tener 1 folio. Si seleccionas una caja que
        tenía otro folio, se reasignará a este.
      </div>

      <Table
        rowKey="id"
        dataSource={stations}
        pagination={false}
        columns={[
          {
            title: "Asignado",
            render: (_, s) => (
              <input
                type="checkbox"
                checked={Boolean(selected[s.id])}
                onChange={(e) =>
                  setSelected((p) => ({ ...p, [s.id]: e.target.checked }))
                }
              />
            ),
          },
          { title: "Código", dataIndex: "code" },
          { title: "Nombre", dataIndex: "name" },
        ]}
      />
    </Modal>
  );
}
