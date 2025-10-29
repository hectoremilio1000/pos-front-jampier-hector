// pos-admin/src/pages/Modificadores/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import GroupModal from "./partials/GroupModal";
import ModifierModal from "./partials/ModifierModal";

type Producto = { id: number; code: string; name: string };
export type ModifierItem = {
  id: number;
  modifierGroupId: number;
  modifierId: number;
  priceDelta: number;
  isEnabled: boolean;
  modifier?: Producto;
};
export type ModifierGroup = {
  id: number;
  name: string;
  code: string;
  modifiers: ModifierItem[];
};

export default function ModificadoresPage() {
  // datos
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // selección
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // filtros
  const [searchGroup, setSearchGroup] = useState("");
  const [searchMod, setSearchMod] = useState("");

  // modales
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalEditing, setGroupModalEditing] =
    useState<ModifierGroup | null>(null);

  const [modModalOpen, setModModalOpen] = useState(false);
  const [modModalEditing, setModModalEditing] = useState<ModifierItem | null>(
    null
  );

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/modifier-groups");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setGroups(data);
      if (!selectedGroupId && data.length > 0) {
        setSelectedGroupId(data[0].id);
      }
    } catch (e) {
      message.error("No se pudieron cargar los grupos de modificadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const filteredGroups = useMemo(() => {
    const q = searchGroup.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      `${g.name} ${g.code}`.toLowerCase().includes(q)
    );
  }, [groups, searchGroup]);

  const allModsOfSelected = useMemo(() => {
    const mods = selectedGroup?.modifiers ?? [];
    const q = searchMod.trim().toLowerCase();
    if (!q) return mods;
    return mods.filter((m) =>
      `${m.modifier?.code ?? ""} ${m.modifier?.name ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [selectedGroup, searchMod]);

  /* ─────────── acciones grupos ─────────── */

  const openCreateGroup = () => {
    setGroupModalEditing(null);
    setGroupModalOpen(true);
  };

  const openEditGroup = (g: ModifierGroup) => {
    setGroupModalEditing(g);
    setGroupModalOpen(true);
  };

  const deleteGroup = async (id: number) => {
    try {
      await apiOrder.delete(`/modifier-groups/${id}`);
      message.success("Grupo eliminado");
      await fetchGroups();
      if (selectedGroupId === id) setSelectedGroupId(null);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Error al eliminar el grupo");
    }
  };

  /* ─────────── acciones modifiers ───────── */

  const openCreateModifier = () => {
    if (!selectedGroup) {
      message.warning("Primero elige un grupo");
      return;
    }
    setModModalEditing(null);
    setModModalOpen(true);
  };

  const openEditModifier = (m: ModifierItem) => {
    setModModalEditing(m);
    setModModalOpen(true);
  };

  const deleteModifier = async (id: number) => {
    try {
      await apiOrder.delete(`/modifiers/${id}`);
      message.success("Modificador eliminado");
      await fetchGroups();
    } catch (e: any) {
      message.error(
        e?.response?.data?.message ?? "Error al eliminar el modificador"
      );
    }
  };

  /* ─────────── tablas ─────────── */

  const colsGroups = [
    { title: "Nombre", dataIndex: "name" },
    { title: "Código", dataIndex: "code", width: 120 },
    {
      title: "Acciones",
      width: 170,
      render: (_: any, r: ModifierGroup) => (
        <Space>
          <Button size="small" onClick={() => openEditGroup(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar grupo?"
            okText="Sí"
            cancelText="No"
            onConfirm={() => deleteGroup(r.id)}
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const colsMods = [
    {
      title: "Producto",
      render: (_: any, r: ModifierItem) =>
        `${r.modifier?.code ?? ""} ${r.modifier?.name ?? ""}`,
    },
    {
      title: "Extra",
      dataIndex: "priceDelta",
      width: 120,
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: "Estado",
      dataIndex: "isEnabled",
      width: 110,
      render: (v: boolean) =>
        v ? <Tag color="green">Activo</Tag> : <Tag color="red">Off</Tag>,
    },
    {
      title: "Acciones",
      width: 180,
      render: (_: any, r: ModifierItem) => (
        <Space>
          <Button size="small" onClick={() => openEditModifier(r)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar modificador?"
            okText="Sí"
            cancelText="No"
            onConfirm={() => deleteModifier(r.id)}
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Grupos de modificadores y líneas
        </Typography.Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateGroup}
          >
            Nuevo grupo
          </Button>
          <Tooltip title="Crea una línea (producto como extra) dentro del grupo seleccionado">
            <Button onClick={openCreateModifier}>Nuevo modificador</Button>
          </Tooltip>
        </Space>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Columna izquierda: grupos */}
        <Card
          title={
            <Space>
              <Typography.Text strong>Grupos</Typography.Text>
              <Tooltip title="Grupos/familias de extras. Luego enlazas estos grupos a productos en el módulo de Productos.">
                <InfoCircleOutlined />
              </Tooltip>
            </Space>
          }
          extra={
            <Input
              placeholder="Buscar nombre o código"
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
              style={{ width: 240 }}
            />
          }
        >
          <Table
            size="small"
            rowKey={(r: ModifierGroup) => `g-${r.id}`}
            columns={colsGroups as any}
            dataSource={filteredGroups}
            loading={loading}
            pagination={{ pageSize: 8 }}
            onRow={(row) => ({
              onClick: () => setSelectedGroupId(row.id),
              className: selectedGroupId === row.id ? "bg-gray-50" : "",
            })}
          />
        </Card>

        {/* Columna derecha: modifiers del grupo seleccionado */}
        <Card
          title={
            <Space>
              <Typography.Text strong>Modificadores del grupo</Typography.Text>
              {selectedGroup ? (
                <Tag>{selectedGroup.name}</Tag>
              ) : (
                <Tag color="default">Sin grupo</Tag>
              )}
            </Space>
          }
          extra={
            <Input
              placeholder="Buscar producto..."
              value={searchMod}
              onChange={(e) => setSearchMod(e.target.value)}
              style={{ width: 240 }}
            />
          }
        >
          <Table
            size="small"
            locale={{
              emptyText: <Empty description="Elige un grupo de la izquierda" />,
            }}
            rowKey={(r: ModifierItem) => `m-${r.id}`}
            columns={colsMods as any}
            dataSource={allModsOfSelected}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>

      {/* Modales */}
      <GroupModal
        open={groupModalOpen}
        editing={groupModalEditing}
        onCancel={() => {
          setGroupModalOpen(false);
          setGroupModalEditing(null);
        }}
        onSaved={async () => {
          setGroupModalOpen(false);
          setGroupModalEditing(null);
          await fetchGroups();
        }}
      />

      <ModifierModal
        open={modModalOpen}
        editing={modModalEditing}
        groupId={selectedGroupId ?? undefined}
        existingModifierIds={
          selectedGroup?.modifiers?.map((m) => m.modifierId) ?? []
        }
        onCancel={() => {
          setModModalOpen(false);
          setModModalEditing(null);
        }}
        onSaved={async () => {
          setModModalOpen(false);
          setModModalEditing(null);
          await fetchGroups();
        }}
      />
    </div>
  );
}
