import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  message,
  Switch,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAuth } from "@/components/Auth/AuthContext";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/components/apis/apiCustomers";

type Customer = {
  id: string;
  legal_name: string;
  tax_id: string;
  tax_system?: string;
  address?: { zip?: string };
  email?: string;
};

export default function CustomersPage() {
  const { user } = useAuth();
  const rid = user?.restaurant?.id;
  const [mode, setMode] = useState<"test" | "live">("test");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");

  const fetchList = async () => {
    if (!rid) return;
    setLoading(true);
    try {
      const res = await listCustomers(rid, { search, mode, limit: 50 });
      setData(res.data?.data ?? res.data ?? []);
    } catch (e: any) {
      message.error(
        e?.response?.data?.error || "No se pudieron cargar clientes"
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchList();
  }, [mode]); // eslint-disable-line

  const columns: ColumnsType<Customer> = [
    { title: "Razón social", dataIndex: "legal_name", key: "legal_name" },
    { title: "RFC", dataIndex: "tax_id", key: "tax_id", width: 180 },
    {
      title: "CP",
      key: "zip",
      width: 100,
      render: (_, r) => r.address?.zip || "—",
    },
    { title: "Email", dataIndex: "email", key: "email" },
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
              form.setFieldsValue({
                legal_name: row.legal_name,
                tax_id: row.tax_id,
                tax_system: row.tax_system,
                zip: row.address?.zip,
                email: row.email,
              });
              setOpen(true);
            }}
          >
            Editar
          </Button>
          <Button
            size="small"
            danger
            onClick={async () => {
              await deleteCustomer(rid!, row.id, { mode });
              message.success("Eliminado");
              fetchList();
            }}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Clientes (Facturapi)"
      extra={
        <Space>
          <Switch
            checked={mode === "live"}
            onChange={(v) => setMode(v ? "live" : "test")}
            checkedChildren="Prod"
            unCheckedChildren="Test"
          />
          <Input.Search
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={fetchList}
            allowClear
          />
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            Nuevo
          </Button>
        </Space>
      }
    >
      <Table<Customer>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
      />
      <Modal
        open={open}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
        onCancel={() => setOpen(false)}
        onOk={async () => {
          const v = await form.validateFields();
          const customer = {
            legal_name: v.legal_name,
            tax_id: v.tax_id,
            tax_system: v.tax_system,
            address: { zip: v.zip },
            email: v.email || undefined,
          };
          if (editing) await updateCustomer(rid!, editing.id, customer, mode);
          else await createCustomer(rid!, customer, mode);
          message.success("Guardado");
          setOpen(false);
          fetchList();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="legal_name"
            label="Razón social"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="tax_id" label="RFC" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="tax_system"
            label="Régimen (SAT)"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="zip" label="CP (SAT)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email (opcional)">
            <Input type="email" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
