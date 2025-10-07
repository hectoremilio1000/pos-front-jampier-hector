import { useEffect, useState } from "react";
import { Table, Input, Button, message, Tag, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import SubgroupModal, { type SubgroupValues } from "./SubgroupModal";

interface Subgrupo {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
  groupId: number;
  group?: { id: number; name: string };
}

interface Grupo {
  id: number;
  name: string;
}

export default function Subgrupos() {
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<SubgroupValues | undefined>(
    undefined
  );

  const fetchSubgrupos = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/subgroups");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setSubgrupos(data);
    } catch {
      message.error("Error al cargar subgrupos");
    } finally {
      setLoading(false);
    }
  };

  const fetchGrupos = async () => {
    try {
      const res = await apiOrder.get("/groups");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setGrupos(data.map((g: any) => ({ id: g.id, name: g.name })));
    } catch {
      message.error("Error al cargar grupos");
    }
  };

  useEffect(() => {
    fetchSubgrupos();
    fetchGrupos();
  }, []);

  const filtered = subgrupos.filter((s) =>
    `${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase())
  );

  // Duplicados (nombre o código) – excluye el que se edita
  const onDuplicateCheck = (v: SubgroupValues) => {
    const dup = subgrupos.some(
      (s) =>
        s.id !== editId &&
        (s.name.trim().toLowerCase() === v.name.trim().toLowerCase() ||
          s.code.trim().toLowerCase() === v.code.trim().toLowerCase())
    );
    return dup ? "Nombre o código ya existe" : null;
  };

  // Crear
  const handleCreate = async (vals: SubgroupValues) => {
    setSaving(true);
    try {
      await apiOrder.post("/subgroups", vals);
      message.success("Subgrupo creado");
      setCreateOpen(false);
      fetchSubgrupos();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "";
      if (msg.toLowerCase().includes("duplicate")) {
        message.error("El código o nombre ya existe.");
      } else {
        message.error("Error al crear subgrupo");
      }
    } finally {
      setSaving(false);
    }
  };

  // Abrir edición
  const openEdit = (sub: Subgrupo) => {
    setEditId(sub.id);
    setEditInitial({
      groupId: sub.groupId,
      code: sub.code,
      name: sub.name,
      sortOrder: sub.sortOrder,
      isEnabled: sub.isEnabled,
    });
    setEditOpen(true);
  };

  // Editar
  const handleEdit = async (vals: SubgroupValues) => {
    if (!editId) return;
    setSaving(true);
    try {
      await apiOrder.put(`/subgroups/${editId}`, vals);
      message.success("Subgrupo actualizado");
      setEditOpen(false);
      setEditId(null);
      fetchSubgrupos();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "";
      if (msg.toLowerCase().includes("duplicate")) {
        message.error("El código o nombre ya existe.");
      } else {
        message.error("Error al actualizar subgrupo");
      }
    } finally {
      setSaving(false);
    }
  };

  // Eliminar
  const deleteSubgrupo = async (id: number) => {
    try {
      await apiOrder.delete(`/subgroups/${id}`);
      message.success("Subgrupo eliminado");
      fetchSubgrupos();
    } catch {
      message.error("Error al eliminar subgrupo");
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Código", dataIndex: "code", key: "code" },
    {
      title: "Grupo",
      dataIndex: ["group", "name"],
      key: "group",
      render: (_: any, record: Subgrupo) => record.group?.name || "-",
    },
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
      render: (_: any, record: Subgrupo) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteSubgrupo(record.id)}>
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
          Agregar subgrupo
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
      <SubgroupModal
        open={createOpen}
        mode="create"
        initial={{}}
        grupos={grupos}
        subgroupsCount={subgrupos.length}
        confirmLoading={saving}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        onDuplicateCheck={onDuplicateCheck}
      />

      {/* Editar */}
      <SubgroupModal
        open={editOpen}
        mode="edit"
        initial={editInitial}
        grupos={grupos}
        subgroupsCount={subgrupos.length}
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
