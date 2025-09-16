import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCenter from "@/apis/apiCenter";

type Plan = {
  id: number;
  code: string;
  name: string;
  amountCents: number;
  currency: string;
  interval: "month" | "semiannual" | "year";
  isActive: boolean;
};

export default function Plans() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form] = Form.useForm<Plan>();

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

  const columns: ColumnsType<Plan> = [
    { title: "Code", dataIndex: "code", key: "code" },
    { title: "Nombre", dataIndex: "name", key: "name" },
    {
      title: "Intervalo",
      dataIndex: "interval",
      key: "interval",
      render: (v) => <Tag>{v}</Tag>,
      width: 130,
    },
    {
      title: "Precio",
      dataIndex: "amountCents",
      key: "amountCents",
      render: (v: number, r) => `$${(v / 100).toFixed(2)} ${r.currency}`,
      width: 150,
    },
    {
      title: "Activo",
      dataIndex: "isActive",
      key: "isActive",
      render: (v: boolean) =>
        v ? <Tag color="green">activo</Tag> : <Tag color="red">inactivo</Tag>,
      width: 120,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 180,
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(row);
              form.setFieldsValue(row);
              setOpen(true);
            }}
          >
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ currency: "MXN", interval: "month", isActive: true });
    setOpen(true);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await apiCenter.put(`/plans/${editing.id}`, values);
        message.success("Plan actualizado");
      } else {
        await apiCenter.post("/plans", values);
        message.success("Plan creado");
      }
      setOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      message.error("No se pudo guardar");
    }
  };

  return (
    <Card
      title="Planes"
      extra={
        <Space>
          <Button onClick={fetchData}>Refrescar</Button>
          <Button type="primary" onClick={openCreate}>
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
      <Modal
        title={editing ? `Editar: ${editing.name}` : "Nuevo plan"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        okText={editing ? "Guardar" : "Crear"}
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input placeholder="BASIC_M" />
            </Form.Item>
          )}
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Básico Mensual" />
          </Form.Item>
          <Form.Item
            name="interval"
            label="Intervalo"
            rules={[{ required: true }]}
            initialValue="month"
          >
            <Select
              options={[
                { value: "month", label: "Mensual" },
                { value: "semiannual", label: "Semestral" },
                { value: "year", label: "Anual" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="amountCents"
            label="Precio (centavos)"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: "100%" }} min={0} step={100} />
          </Form.Item>
          <Form.Item name="currency" label="Moneda" initialValue="MXN">
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="Activo" initialValue={true}>
            <Select
              options={[
                { value: true, label: "Sí" },
                { value: false, label: "No" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
