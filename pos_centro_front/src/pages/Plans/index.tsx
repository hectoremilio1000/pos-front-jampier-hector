import { useEffect, useState } from "react";
import { Button, Card, Modal, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCenter from "@/components/apis/apiCenter";
import PlanFormModal, {
  type PlanFormValues,
} from "@/pages/Plans/PlanFormModal";

type Plan = {
  id: number;
  code: string;
  name: string;
  amount: number; // 👈 ahora en pesos (antes amountCents)
  currency: string;
  interval: "month" | "semiannual" | "year";
  isActive: boolean;
};

export default function Plans() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState<Partial<PlanFormValues>>(
    {}
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await apiCenter.get("/plans");
      setRows(data);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar planes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setInitialValues({
      code: "",
      name: "",
      interval: "month",
      amountPesos: undefined,
      currency: "MXN",
      isActive: true,
    });
    setOpen(true);
  };

  const handleEdit = (row: Plan) => {
    setEditing(row);
    setInitialValues({
      code: row.code,
      name: row.name,
      interval: row.interval,
      amountPesos: row.amount, // 👈 ya viene en pesos
      currency: row.currency,
      isActive: row.isActive,
    });
    setOpen(true);
  };

  const handleDelete = async (row: Plan) => {
    Modal.confirm({
      title: `Eliminar plan "${row.name}"`,
      content: "Esta acción no se puede deshacer.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await apiCenter.delete(`/plans/${row.id}`);
          message.success("Plan eliminado");
          await fetchData();
        } catch (e) {
          console.error(e);
          message.error("No se pudo eliminar");
        }
      },
    });
  };

  const handleSubmit = async (values: PlanFormValues) => {
    try {
      setSaving(true);
      const payload = {
        code: values.code,
        name: values.name,
        interval: values.interval,
        amount: Number(values.amountPesos), // 👈 pesos → se envía tal cual
        currency: (values.currency || "").toUpperCase(),
        isActive: values.isActive,
      };

      if (editing) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { code, ...rest } = payload; // normalmente no cambiamos code en update
        await apiCenter.put(`/plans/${editing.id}`, rest);
        message.success("Plan actualizado");
      } else {
        await apiCenter.post("/plans", payload);
        message.success("Plan creado");
      }
      setOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      message.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Plan> = [
    { title: "Code", dataIndex: "code", key: "code" },
    { title: "Nombre", dataIndex: "name", key: "name" },
    {
      title: "Intervalo",
      dataIndex: "interval",
      key: "interval",
      width: 130,
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Precio",
      dataIndex: "amount",
      key: "amount",
      width: 150,
      render: (v: number, r) => `$${Number(v).toFixed(2)} ${r.currency}`, // 👈 sin /100
    },
    {
      title: "Activo",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (v: boolean) =>
        v ? <Tag color="green">activo</Tag> : <Tag color="red">inactivo</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(row)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => handleDelete(row)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Planes"
      extra={
        <Space>
          <Button onClick={fetchData}>Refrescar</Button>
          <Button type="primary" onClick={handleCreate}>
            Nuevo plan
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
      />

      <PlanFormModal
        open={open}
        loading={saving}
        initialValues={initialValues}
        title={editing ? `Editar: ${editing.name}` : "Nuevo plan"}
        okText={editing ? "Guardar" : "Crear"}
        disableCode={!!editing}
        onCancel={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
