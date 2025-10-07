// src/pages/Grupos/index.tsx
import { useEffect, useState } from "react";
import { Table, Input, Button, message, Tag, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import GroupModal, { type GroupValues } from "./GroupModal";

interface ProductGroup {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
  category: { id: number; name: string };
  categoryId: number;
}
interface Category {
  id: number;
  name: string;
}

export default function Grupos() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<GroupValues | undefined>(
    undefined
  );

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data } = await apiOrder.get("/groups");
      setGroups(data);
    } catch {
      message.error("Error al cargar grupos");
    } finally {
      setLoading(false);
    }
  };
  const fetchCategories = async () => {
    try {
      const { data } = await apiOrder.get("/categories");
      setCategories(data);
    } catch {
      message.error("Error al cargar categorías");
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchCategories();
  }, []);

  const filtered = groups.filter((g) =>
    `${g.name} ${g.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const onDuplicateCheck = (v: GroupValues) => {
    const dup = groups.some(
      (g) =>
        g.id !== editId &&
        (g.name.trim().toLowerCase() === v.name.trim().toLowerCase() ||
          g.code.trim().toLowerCase() === v.code.trim().toLowerCase())
    );
    return dup ? "Ya existe un grupo con ese nombre o código" : null;
  };

  const handleCreate = async (vals: GroupValues) => {
    setSaving(true);
    try {
      await apiOrder.post("/groups", vals);
      message.success("Grupo creado");
      setCreateOpen(false);
      fetchGroups();
    } catch {
      message.error("Error al crear grupo");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (group: ProductGroup) => {
    setEditId(group.id);
    setEditInitial({
      name: group.name,
      code: group.code,
      sortOrder: group.sortOrder,
      isEnabled: group.isEnabled,
      categoryId: group.categoryId,
    });
    setEditOpen(true);
  };

  const handleEdit = async (vals: GroupValues) => {
    if (!editId) return;
    setSaving(true);
    try {
      await apiOrder.put(`/groups/${editId}`, vals);
      message.success("Grupo actualizado");
      setEditOpen(false);
      setEditId(null);
      fetchGroups();
    } catch {
      message.error("Error al actualizar grupo");
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (id: number) => {
    try {
      await apiOrder.delete(`/groups/${id}`);
      message.success("Grupo eliminado");
      fetchGroups();
    } catch {
      message.error("Error al eliminar grupo");
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Código", dataIndex: "code", key: "code" },
    { title: "Categoría", dataIndex: ["category", "name"], key: "category" },
    { title: "Orden", dataIndex: "sortOrder", key: "sortOrder" },
    {
      title: "Activo",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: ProductGroup) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteGroup(record.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
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
          Agregar grupo
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
      <GroupModal
        open={createOpen}
        mode="create"
        initial={{}}
        categories={categories}
        groupsCount={groups.length}
        confirmLoading={saving}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        onDuplicateCheck={onDuplicateCheck}
      />

      {/* Editar */}
      <GroupModal
        open={editOpen}
        mode="edit"
        initial={editInitial}
        categories={categories}
        groupsCount={groups.length}
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
