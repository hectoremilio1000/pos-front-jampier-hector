import { useEffect, useMemo, useState } from "react";
import { Table, Input, Button, message, Tag, Space, Tooltip } from "antd";
import { PlusOutlined, HolderOutlined } from "@ant-design/icons";
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

type GroupPayload = {
  categoryId: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

function sortGroups(list: ProductGroup[]) {
  return [...list].sort((a, b) => {
    const byOrder = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (byOrder !== 0) return byOrder;
    return a.id - b.id;
  });
}

function getNextSortOrder(groups: ProductGroup[]) {
  const max = groups.reduce((acc, group) => Math.max(acc, Number(group.sortOrder) || 0), 0);
  return max + 1;
}

export default function Grupos() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<GroupValues | undefined>(undefined);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const { data } = await apiOrder.get("/groups");
      setGroups(sortGroups(data));
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

  const orderedGroups = useMemo(() => sortGroups(groups), [groups]);

  const filtered = useMemo(
    () =>
      orderedGroups.filter((g) => `${g.name}`.toLowerCase().includes(search.toLowerCase())),
    [orderedGroups, search]
  );

  const dragEnabled = search.trim().length === 0;

  const onDuplicateCheck = (v: GroupValues) => {
    const dup = groups.some(
      (g) => g.id !== editId && g.name.trim().toLowerCase() === v.name.trim().toLowerCase()
    );
    return dup ? "Ya existe un grupo con ese nombre" : null;
  };

  const handleCreate = async (vals: GroupValues) => {
    setSaving(true);
    try {
      const payload: GroupPayload = {
        categoryId: vals.categoryId,
        name: vals.name,
        isEnabled: vals.isEnabled,
        code: vals.code,
        sortOrder: getNextSortOrder(groups),
      };
      await apiOrder.post("/groups", payload);
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
      const current = groups.find((g) => g.id === editId);
      if (!current) {
        message.error("No se encontró el grupo a editar");
        return;
      }

      const payload: GroupPayload = {
        categoryId: vals.categoryId,
        name: vals.name,
        isEnabled: vals.isEnabled,
        code: current.code,
        sortOrder: current.sortOrder,
      };

      await apiOrder.put(`/groups/${editId}`, payload);
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

  const persistReorder = async (nextList: ProductGroup[]) => {
    const normalized = nextList.map((item, index) => ({ ...item, sortOrder: index + 1 }));

    const prev = groups;
    setGroups(normalized);
    setReordering(true);

    try {
      await apiOrder.put("/groups/reorder", {
        items: normalized.map((item) => ({ id: item.id, position: item.sortOrder })),
      });
    } catch {
      setGroups(prev);
      message.error("No se pudo guardar el nuevo orden");
    } finally {
      setReordering(false);
    }
  };

  const moveByDrag = async (dragId: number, dropId: number) => {
    if (dragId === dropId || reordering) return;

    const list = [...orderedGroups];
    const from = list.findIndex((item) => item.id === dragId);
    const to = list.findIndex((item) => item.id === dropId);
    if (from < 0 || to < 0) return;

    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);

    await persistReorder(list);
  };

  const columns = [
    {
      title: "",
      key: "drag",
      width: 44,
      render: () =>
        dragEnabled ? (
          <Tooltip title="Arrastra para reordenar">
            <HolderOutlined style={{ color: "#999", cursor: "grab" }} />
          </Tooltip>
        ) : (
          <Tooltip title="Limpia la búsqueda para reordenar">
            <HolderOutlined style={{ color: "#ddd" }} />
          </Tooltip>
        ),
    },
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Categoría", dataIndex: ["category", "name"], key: "category" },
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
      <div className="flex justify-between items-center gap-3">
        <Input
          placeholder="Buscar por nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Space>
          <Tag color={dragEnabled ? "blue" : "default"}>
            {dragEnabled
              ? "Reordenamiento activo: arrastra filas"
              : "Limpia búsqueda para reordenar"}
          </Tag>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setCreateOpen(true)}
          >
            Agregar grupo
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filtered}
        loading={loading || reordering}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          draggable: dragEnabled && !reordering,
          onDragStart: () => setDraggingId(record.id),
          onDragOver: (e) => {
            if (!dragEnabled) return;
            e.preventDefault();
          },
          onDrop: async () => {
            if (!dragEnabled || draggingId === null) return;
            await moveByDrag(draggingId, record.id);
            setDraggingId(null);
          },
          onDragEnd: () => setDraggingId(null),
          style: dragEnabled ? { cursor: "move" } : {},
        })}
      />

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
