import { useEffect, useMemo, useState } from "react";
import { Table, Input, Button, message, Space, Tag, Popconfirm } from "antd";
import {
  PlusOutlined,
  ToolOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import AreaModal, { type AreaValues } from "./AreaModal";
import MapWizardModal from "./MapWizardCanvasModal";

type Area = {
  id: number;
  name: string;
  sortOrder?: number;
};

type TableRow = {
  id: number;
  areaId: number;
  code: string;
  seats: number;
  status: "free" | "busy" | "occupied" | "held" | "closed";
};

export default function MesasIndex() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editArea, setEditArea] = useState<Area | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardArea, setWizardArea] = useState<Area | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [areasRes, tablesRes] = await Promise.all([
        apiOrder.get("/areas"),
        apiOrder.get("/tables"),
      ]);
      setAreas(areasRes.data ?? []);
      setTables(tablesRes.data ?? []);
    } catch {
      message.error("Error al cargar áreas/mesas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredAreas = useMemo(() => {
    return areas
      .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const ao = a.sortOrder ?? 9999;
        const bo = b.sortOrder ?? 9999;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });
  }, [areas, search]);

  const countTablesByArea = (areaId: number) =>
    tables.filter((t) => t.areaId === areaId).length;

  const statusHintByArea = (areaId: number) => {
    // solo decorativo: si hay ocupadas/atendidas/apartadas mostramos un tag
    const occ = tables.some(
      (t) =>
        t.areaId === areaId &&
        (t.status === "busy" || t.status === "occupied" || t.status === "held")
    );
    if (occ) return <Tag color="gold">Con actividad</Tag>;
    return <Tag color="default">Sin actividad</Tag>;
  };

  const onDuplicateCheck = (v: AreaValues) => {
    const dup = areas.some(
      (a) =>
        a.id !== (editArea?.id ?? -1) &&
        a.name.trim().toLowerCase() === v.name.trim().toLowerCase()
    );
    return dup ? "Ya existe un área con ese nombre" : null;
  };

  const handleCreate = async (vals: AreaValues) => {
    try {
      await apiOrder.post("/areas", vals);
      message.success("Área creada");
      setCreateOpen(false);
      fetchAll();
    } catch {
      message.error("Error al crear área");
    }
  };

  const openEdit = (a: Area) => {
    setEditArea(a);
    setEditOpen(true);
  };

  const handleEdit = async (vals: AreaValues) => {
    if (!editArea) return;
    try {
      await apiOrder.put(`/areas/${editArea.id}`, vals);
      message.success("Área actualizada");
      setEditOpen(false);
      setEditArea(null);
      fetchAll();
    } catch {
      message.error("Error al actualizar área");
    }
  };

  const deleteArea = async (id: number) => {
    try {
      await apiOrder.delete(`/areas/${id}`);
      message.success("Área eliminada");
      fetchAll();
    } catch (e: any) {
      const err = e?.response?.data?.error ?? "Error al eliminar área";
      message.error(err);
    }
  };

  const openWizard = (a: Area) => {
    setWizardArea(a);
    setWizardOpen(true);
  };

  const columns = [
    { title: "Área", dataIndex: "name", key: "name" },
    {
      title: "Mesas",
      key: "tables",
      render: (_: any, a: Area) => countTablesByArea(a.id),
    },
    { title: "Orden", dataIndex: "sortOrder", key: "sortOrder", width: 100 },
    {
      title: "Actividad",
      key: "activity",
      render: (_: any, a: Area) => statusHintByArea(a.id),
      width: 140,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 280,
      render: (_: any, a: Area) => (
        <Space>
          <Button
            size="small"
            icon={<ToolOutlined />}
            onClick={() => openWizard(a)}
          >
            Configurar mapa
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(a)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar área?"
            description="Se eliminará el área y (si no hay restricciones) sus mesas."
            okText="Sí, eliminar"
            cancelText="Cancelar"
            onConfirm={() => deleteArea(a.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar por nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Space>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setCreateOpen(true)}
          >
            Nueva área
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filteredAreas}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Crear área */}
      <AreaModal
        open={createOpen}
        mode="create"
        initial={{}}
        confirmLoading={false}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        onDuplicateCheck={onDuplicateCheck}
      />

      {/* Editar área */}
      <AreaModal
        open={editOpen}
        mode="edit"
        initial={
          editArea
            ? {
                name: editArea.name,
                sortOrder: editArea.sortOrder ?? areas.length + 1,
              }
            : undefined
        }
        confirmLoading={false}
        onCancel={() => {
          setEditOpen(false);
          setEditArea(null);
        }}
        onOk={handleEdit}
        onDuplicateCheck={onDuplicateCheck}
      />

      {/* Wizard de mapa */}
      <MapWizardModal
        open={wizardOpen}
        area={wizardArea}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false);
          fetchAll();
        }}
      />
    </div>
  );
}
