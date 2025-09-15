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
import apiAuth from "@/apis/apiAuth";
import type { ValidateErrorEntity } from "rc-field-form/lib/interface";

type RestaurantStatus = "active" | "inactive" | null | undefined;

type Restaurant = {
  id: number;
  name: string;
  slug?: string | null;
  timezone?: string | null;
  currency?: string | null;
  plan?: string | null; // v0: lo tomamos simple desde la tabla restaurants
  status?: RestaurantStatus;
  created_at?: string;
  updated_at?: string;
};

type PageMeta = { total: number; page: number; perPage: number };

export default function Restaurants() {
  const [data, setData] = useState<Restaurant[]>([]);
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
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [form] = Form.useForm<Restaurant>();

  const fetchList = async () => {
    setLoading(true);
    try {
      // Ajusta si tu backend usa otros nombres de query (page/perPage/search)
      const res = await apiAuth.get("/restaurants", {
        params: { page, perPage: pageSize, search },
      });
      // Asumimos formato común: { data: Restaurant[], meta?: { total, page, perPage } }
      const list: Restaurant[] = res.data.data ?? res.data;
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
    } catch (e: unknown) {
      console.error(e);
      message.error("No se pudo cargar restaurantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
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

  const openEdit = (row: Restaurant) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      slug: row.slug ?? undefined,
      timezone: row.timezone ?? undefined,
      currency: row.currency ?? undefined,
      plan: row.plan ?? "free",
      status: row.status ?? "active",
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await apiAuth.put(`/restaurants/${editing.id}`, values);
        message.success("Restaurante actualizado");
      } else {
        await apiAuth.post("/restaurants", values);
        message.success("Restaurante creado");
      }
      setOpenModal(false);
      fetchList();
    } catch (err: unknown) {
      if ((err as ValidateErrorEntity<Restaurant>)?.errorFields) return;
      console.error(err);
      message.error("No se pudo guardar");
    }
  };

  const handleDelete = async (row: Restaurant) => {
    Modal.confirm({
      title: `Eliminar "${row.name}"`,
      content: "Esta acción no se puede deshacer.",
      okType: "danger",
      onOk: async () => {
        try {
          await apiAuth.delete(`/restaurants/${row.id}`);
          message.success("Restaurante eliminado");
          // si la página se quedó sin elementos, retrocede una página
          if (data.length === 1 && page > 1) setPage((p) => p - 1);
          else fetchList();
        } catch (e: unknown) {
          console.error(e);
          message.error("No se pudo eliminar");
        }
      },
    });
  };

  const columns: ColumnsType<Restaurant> = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "name",
        key: "name",
        render: (v: string) => <strong>{v}</strong>,
      },
      {
        title: "Plan",
        dataIndex: "plan",
        key: "plan",
        render: (v: string | null) => <Tag color="blue">{v ?? "—"}</Tag>,
        width: 120,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (v: RestaurantStatus) =>
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
        render: (_: unknown, row: Restaurant) => (
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
      title="Restaurantes"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={onSearch}
            style={{ width: 260 }}
          />
          <Button onClick={onRefresh}>Refrescar</Button>
          <Button type="primary" onClick={openCreate}>
            Nuevo restaurante
          </Button>
        </Space>
      }
    >
      <Table<Restaurant>
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
        title={editing ? `Editar: ${editing.name}` : "Nuevo restaurante"}
        open={openModal}
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText={editing ? "Guardar" : "Crear"}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input placeholder="Ej. Cantina La Llorona" />
          </Form.Item>

          <Form.Item name="slug" label="Slug">
            <Input placeholder="ej. la-llorona" />
          </Form.Item>

          <Form.Item name="timezone" label="Zona horaria">
            <Input placeholder="Ej. America/Mexico_City" />
          </Form.Item>

          <Form.Item name="currency" label="Moneda">
            <Input placeholder="Ej. MXN" />
          </Form.Item>

          <Form.Item name="plan" label="Plan" initialValue="free">
            <Select
              options={[
                { value: "free", label: "Free" },
                { value: "basic", label: "Basic" },
                { value: "pro", label: "Pro" },
              ]}
              allowClear
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
