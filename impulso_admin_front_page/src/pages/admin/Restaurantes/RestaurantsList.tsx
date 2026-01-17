// src/pages/admin/Restaurantes/RestaurantsList.tsx
import { useEffect, useState } from "react";
import { Card, Table, Space, Button, Tag, Modal, Form, Input, Switch, App } from "antd";
import { useNavigate } from "react-router-dom";
import { listRestaurants, updateRestaurant, type RestaurantRow } from "@/lib/api_restaurants";

type RestaurantFormVals = {
  name: string;
  slug: string;
  websiteUrl?: string;
  isActive: boolean;
};

export default function RestaurantsList() {
  const nav = useNavigate();
  const { message } = App.useApp();

  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<RestaurantFormVals>();

  async function load() {
    setLoading(true);
    try {
      const res = await listRestaurants();
      setRows(res.restaurants || []);
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Error al cargar restaurantes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(row: RestaurantRow) {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      slug: row.slug,
      websiteUrl: row.websiteUrl || "",
      isActive: row.isActive,
    });
  }

  async function handleSave(vals: RestaurantFormVals) {
    if (!editing) return;
    try {
      setSaving(true);
      await updateRestaurant(editing.id, {
        name: vals.name,
        slug: vals.slug,
        websiteUrl: vals.websiteUrl || null,
        isActive: vals.isActive,
      });
      message.success("Restaurante actualizado");
      setEditing(null);
      load();
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Nombre", dataIndex: "name" },
    {
      title: "Slug",
      dataIndex: "slug",
      width: 180,
      render: (v: string) => <code>{v}</code>,
    },
    {
      title: "Sitio",
      dataIndex: "websiteUrl",
      render: (url: string | null | undefined) =>
        url ? (
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        ) : (
          <Tag color="default">Sin URL</Tag>
        ),
    },
    {
      title: "Activo",
      dataIndex: "isActive",
      width: 100,
      render: (v: boolean) =>
        v ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: "Acciones",
      width: 280,
      render: (_: any, r: RestaurantRow) => (
        <Space>
          <Button onClick={() => openEdit(r)}>Editar</Button>
          <Button type="primary" onClick={() => nav(`/admin/restaurantes/${r.slug}/menus`)}>
            Administrar menús
          </Button>
          <Button size="small" onClick={() => nav(`/admin/restaurantes/${r.slug}/inventario`)}>
            Inventario
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Restaurantes">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
        />
      </Card>

      <Modal
        open={!!editing}
        title={editing ? `Editar restaurante: ${editing.name}` : "Editar restaurante"}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form<RestaurantFormVals> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: "Nombre requerido" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="slug"
            label="Slug"
            rules={[{ required: true, message: "Slug requerido" }]}
            extra="Usado en el microservicio y como identificador en Next.js"
          >
            <Input />
          </Form.Item>

          <Form.Item name="websiteUrl" label="Sitio (URL)">
            <Input placeholder="https://lalloronacantina.com" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Activo"
            valuePropName="checked"
            tooltip="Si lo desactivas, deja de aparecer en el listado del admin."
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
