// src/pages/Categorias/index.tsx
import { useEffect, useState } from "react";
import { Table, Input, Button, message, Tag, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import CategoryModal, { type CategoryValues } from "./CategoryModal";

interface Category {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
}

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<CategoryValues | undefined>(
    undefined
  );

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/categories");
      setCategories(res.data);
    } catch {
      message.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = categories.filter((c) =>
    `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const onDuplicateCheck = (v: CategoryValues) => {
    const dup = categories.some(
      (c) =>
        c.id !== editId &&
        (c.name.trim().toLowerCase() === v.name.trim().toLowerCase() ||
          c.code.trim().toLowerCase() === v.code.trim().toLowerCase())
    );
    return dup ? "Nombre o código ya existe" : null;
  };

  const handleCreate = async (vals: CategoryValues) => {
    setSaving(true);
    try {
      await apiOrder.post("/categories", vals);
      message.success("Categoría creada");
      setCreateOpen(false);
      fetchCategories();
    } catch {
      message.error("Error al crear categoría");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (category: Category) => {
    setEditId(category.id);
    setEditInitial({
      name: category.name,
      code: category.code,
      sortOrder: category.sortOrder,
      isEnabled: category.isEnabled,
    });
    setEditOpen(true);
  };

  const handleEdit = async (vals: CategoryValues) => {
    if (!editId) return;
    setSaving(true);
    try {
      await apiOrder.put(`/categories/${editId}`, vals);
      message.success("Categoría actualizada");
      setEditOpen(false);
      setEditId(null);
      fetchCategories();
    } catch {
      message.error("Error al actualizar categoría");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await apiOrder.delete(`/categories/${id}`);
      message.success("Categoría eliminada");
      fetchCategories();
    } catch {
      message.error("Error al eliminar categoría");
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Código", dataIndex: "code", key: "code" },
    { title: "Orden", dataIndex: "sortOrder", key: "sortOrder" },
    {
      title: "Estado",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (val: boolean) =>
        val ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: Category) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteCategory(record.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => setCreateOpen(true)}
        >
          Agregar categoría
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Crear */}
      <CategoryModal
        open={createOpen}
        mode="create"
        initial={{}}
        categoriesCount={categories.length}
        confirmLoading={saving}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        onDuplicateCheck={onDuplicateCheck}
      />

      {/* Editar */}
      <CategoryModal
        open={editOpen}
        mode="edit"
        initial={editInitial}
        categoriesCount={categories.length}
        confirmLoading={saving}
        onCancel={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        onOk={handleEdit}
        onDuplicateCheck={onDuplicateCheck}
      />
    </div>
  );
}
