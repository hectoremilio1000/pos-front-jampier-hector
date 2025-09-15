// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/pages/sa/Users.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ValidateErrorEntity } from "rc-field-form/lib/interface";
import apiAuth from "@/apis/apiAuth";

type Restaurant = {
  id: number;
  name: string;
};

type UserRole = "owner" | "admin" | "cashier" | "superadmin";

type UserStatus = "active" | "inactive" | null | undefined;

type User = {
  id: number;
  fullName: string;
  email: string;
  roleCode: UserRole;
  status?: UserStatus;
  restaurant?: Restaurant;
  created_at?: string;
};

type PageMeta = { total: number; page: number; perPage: number };

export default function Users() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<PageMeta>({
    total: 0,
    page: 1,
    perPage: 10,
  });

  // Crear / Editar
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm<User>();

  // Restaurantes para el select
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const fetchRestaurants = async () => {
    try {
      const res = await apiAuth.get("/restaurants");
      setRestaurants(res.data.data ?? res.data);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar restaurantes");
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiAuth.get("/users", {
        params: { page, perPage: pageSize, search },
      });
      const list: User[] = res.data.data ?? res.data;
      const m = res.data.meta ?? {
        total: list.length,
        page,
        perPage: pageSize,
      };
      setData(list);
      setMeta({
        total: Number(m.total ?? list.length),
        page: Number(m.page ?? page),
        perPage: Number(m.perPage ?? pageSize),
      });
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    fetchRestaurants();
  }, [page, pageSize]);

  const onSearch = () => {
    setPage(1);
    fetchList();
  };
  const onRefresh = () => fetchList();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setOpenModal(true);
  };

  const openEdit = (row: User) => {
    setEditing(row);
    form.setFieldsValue({
      fullName: row.fullName,
      email: row.email,
      roleCode: row.roleCode,
      restaurant: { id: row.restaurant?.id },
      status: row.status ?? "active",
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await apiAuth.put(`/users/${editing.id}`, values);
        message.success("Usuario actualizado");
      } else {
        await apiAuth.post("/users", values);
        message.success("Usuario creado");
      }
      setOpenModal(false);
      fetchList();
    } catch (err: unknown) {
      if ((err as ValidateErrorEntity<User>)?.errorFields) return;
      console.error(err);
      message.error("No se pudo guardar");
    }
  };

  const handleDelete = async (row: User) => {
    Modal.confirm({
      title: `Eliminar "${row.fullName}"`,
      content: "Esta acción no se puede deshacer.",
      okType: "danger",
      onOk: async () => {
        try {
          await apiAuth.delete(`/users/${row.id}`);
          message.success("Usuario eliminado");
          if (data.length === 1 && page > 1) setPage((p) => p - 1);
          else fetchList();
        } catch (e) {
          console.error(e);
          message.error("No se pudo eliminar");
        }
      },
    });
  };

  const columns: ColumnsType<User> = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "fullName",
        key: "fullName",
        render: (v: string) => <strong>{v}</strong>,
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
      },
      {
        title: "Rol",
        dataIndex: "roleCode",
        key: "roleCode",
        render: (v: string) => <Tag color="blue">{v}</Tag>,
        width: 120,
      },
      {
        title: "Restaurante",
        dataIndex: ["restaurant", "name"],
        key: "restaurant",
        render: (v?: string) => v ?? "—",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (v: UserStatus) =>
          v === "inactive" ? (
            <Tag color="red">inactive</Tag>
          ) : (
            <Tag color="green">{v ?? "active"}</Tag>
          ),
        width: 120,
      },
      {
        title: "Creado",
        dataIndex: "created_at",
        key: "created_at",
        render: (v?: string) => (v ? new Date(v).toLocaleString("es-MX") : "—"),
        width: 200,
      },
      {
        title: "Acciones",
        key: "actions",
        width: 200,
        render: (_: unknown, row: User) => (
          <Space>
            <Button size="small" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <Button size="small" danger onClick={() => handleDelete(row)}>
              Eliminar
            </Button>
          </Space>
        ),
      },
    ],
    [data]
  );

  return (
    <Card
      title="Usuarios / Owners"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={onSearch}
            style={{ width: 260 }}
          />
          <Button onClick={onRefresh}>Refrescar</Button>
          <Button type="primary" onClick={openCreate}>
            Nuevo usuario
          </Button>
        </Space>
      }
    >
      <Table<User>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total: meta.total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <Modal
        title={editing ? `Editar: ${editing.fullName}` : "Nuevo usuario"}
        open={openModal}
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText={editing ? "Guardar" : "Crear"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fullName"
            label="Nombre completo"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>

          {!editing && (
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item name="roleCode" label="Rol" initialValue="owner">
            <Select
              options={[
                { value: "owner", label: "Owner" },
                { value: "admin", label: "Admin" },
                { value: "cashier", label: "Cashier" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="restaurant"
            label="Restaurante"
            rules={[{ required: true }]}
          >
            <Select
              options={restaurants.map((r) => ({
                value: r.id,
                label: r.name,
              }))}
            />
          </Form.Item>

          <Form.Item name="status" label="Status" initialValue="active">
            <Select
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
