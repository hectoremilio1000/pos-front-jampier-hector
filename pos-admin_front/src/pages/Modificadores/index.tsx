// pos-admin/src/pages/Modificadores/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
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

type TabKey = "groups" | "modifiers";

export default function ModificadoresPage() {
  // datos
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("groups");
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<"modifier" | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardGroup, setWizardGroup] = useState<{ id: number; name: string } | null>(
    null
  );

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

  const fetchGroups = async (nextSelectedId?: number | null) => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/modifier-groups");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setGroups(data);
      if (!data.length) {
        setSelectedGroupId(null);
        return [];
      }
      const nextId =
        typeof nextSelectedId === "number"
          ? nextSelectedId
          : selectedGroupId && data.some((g) => g.id === selectedGroupId)
            ? selectedGroupId
            : data[0].id;
      setSelectedGroupId(nextId);
      return data;
    } catch (e) {
      message.error("No se pudieron cargar los grupos de modificadores");
      return [];
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
  const hasGroups = groups.length > 0;
  const groupOptions = useMemo(
    () =>
      groups.map((g) => ({
        label: `${g.name} (${g.code})`,
        value: g.id,
      })),
    [groups]
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

  const wizardSteps = useMemo(
    () => [{ title: "Grupo" }, { title: "Modificador" }],
    []
  );

  /* ─────────── acciones grupos ─────────── */

  const openCreateGroup = () => {
    setWizardMode(null);
    setWizardStep(0);
    setWizardGroup(null);
    setActiveTab("groups");
    setGroupModalEditing(null);
    setGroupModalOpen(true);
  };

  const openEditGroup = (g: ModifierGroup) => {
    setWizardMode(null);
    setWizardStep(0);
    setWizardGroup(null);
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
    setWizardMode("modifier");
    setActiveTab("modifiers");
    setModModalEditing(null);
    if (!hasGroups) {
      setWizardStep(0);
      setWizardGroup(null);
      setGroupModalEditing(null);
      setGroupModalOpen(true);
      return;
    }
    const fallbackGroup = selectedGroup ?? groups[0] ?? null;
    if (fallbackGroup) {
      setWizardGroup({ id: fallbackGroup.id, name: fallbackGroup.name });
    }
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
    setWizardStep(1);
    setModModalOpen(true);
  };

  const openEditModifier = (m: ModifierItem) => {
    setWizardMode(null);
    setWizardStep(0);
    setWizardGroup(null);
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
      title: "Opción",
      render: (_: any, r: ModifierItem) =>
        `${r.modifier?.code ?? ""} ${r.modifier?.name ?? ""}`,
    },
    {
      title: "Extra ($)",
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
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between py-3">
          <Typography.Title level={4} style={{ margin: 0 }}>
            Grupos de opciones y extras
          </Typography.Title>
          <Space>
            <Button onClick={() => setHelpOpen(true)}>Guía rápida</Button>
          </Space>
        </div>
      </div>

      <div className="rounded-md border border-dashed p-3 text-sm text-gray-600">
        <span className="font-medium text-gray-800">Flujo rápido:</span> 1) Crea
        un grupo (la pregunta). 2) Agrega opciones. 3) Asigna el grupo en
        Productos.
      </div>

      <div className="flex items-center justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Crear modificadores
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={[
          {
            key: "groups",
            label: "Grupos",
            children: (
              <Card
                title={
                  <Space>
                    <Typography.Text strong>Grupos</Typography.Text>
                    <Tooltip title="Un grupo es la pregunta que verá el mesero (ej: “Sabores”). Luego lo asignas a un producto.">
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
                  locale={{
                    emptyText: hasGroups ? (
                      <Empty description="Sin resultados" />
                    ) : (
                      <div className="py-6">
                        <Empty description="Aún no tienes grupos de opciones" />
                      </div>
                    ),
                  }}
                  pagination={{ pageSize: 8 }}
                  onRow={(row) => ({
                    onClick: () => setSelectedGroupId(row.id),
                    className: selectedGroupId === row.id ? "bg-gray-50" : "",
                  })}
                />
              </Card>
            ),
          },
          {
            key: "modifiers",
            label: "Modificadores",
            children: (
              <Card
                title={
                  <Space>
                    <Typography.Text strong>Opciones del grupo</Typography.Text>
                    {selectedGroup ? (
                      <Tag color="blue">{selectedGroup.name}</Tag>
                    ) : (
                      <Tag color="default">Selecciona un grupo</Tag>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    <Select
                      allowClear
                      placeholder={
                        hasGroups ? "Selecciona un grupo" : "Sin grupos"
                      }
                      value={selectedGroupId ?? undefined}
                      onChange={(value) =>
                        setSelectedGroupId(
                          typeof value === "number" ? value : null
                        )
                      }
                      options={groupOptions}
                      style={{ width: 220 }}
                      disabled={!hasGroups}
                    />
                    <Input
                      placeholder="Buscar opción..."
                      value={searchMod}
                      onChange={(e) => setSearchMod(e.target.value)}
                      style={{ width: 220 }}
                    />
                  </Space>
                }
              >
                <Table
                  size="small"
                  locale={{
                    emptyText: selectedGroup ? (
                      <Empty description="Aún no hay opciones en este grupo" />
                    ) : (
                      <Empty description="Selecciona un grupo para ver opciones" />
                    ),
                  }}
                  rowKey={(r: ModifierItem) => `m-${r.id}`}
                  columns={colsMods as any}
                  dataSource={allModsOfSelected}
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
                {selectedGroup && allModsOfSelected.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-800">
                      Vista previa (como lo ve el mesero)
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allModsOfSelected.slice(0, 6).map((m) => (
                        <label
                          key={`preview-${m.id}`}
                          className="flex items-center gap-2"
                        >
                          <input type="checkbox" disabled />
                          <span>{m.modifier?.name ?? "Opción"}</span>
                          {Number(m.priceDelta ?? 0) > 0 && (
                            <span className="text-xs text-gray-500">
                              (+${Number(m.priceDelta ?? 0).toFixed(2)})
                            </span>
                          )}
                        </label>
                      ))}
                      {allModsOfSelected.length > 6 && (
                        <span className="text-xs text-gray-500">
                          +{allModsOfSelected.length - 6} más...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title="¿Qué quieres crear?"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              Crear grupo
            </Typography.Title>
            <Typography.Paragraph style={{ margin: "6px 0 12px 0" }}>
              Define la pregunta que verá el mesero (ej: “Sabores”, “Toppings”).
            </Typography.Paragraph>
            <Button
              block
              onClick={() => {
                setCreateOpen(false);
                openCreateGroup();
              }}
            >
              Crear grupo
            </Button>
          </div>

          <div
            style={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Typography.Title level={5} style={{ margin: 0 }}>
              Crear modificador
            </Typography.Title>
            <Typography.Paragraph style={{ margin: "6px 0 12px 0" }}>
              Crea opciones dentro de un grupo y asigna precio extra si aplica.
            </Typography.Paragraph>
            <Button
              type="primary"
              block
              onClick={() => {
                setCreateOpen(false);
                openCreateModifier();
              }}
            >
              Crear modificador
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modales */}
      <GroupModal
        open={groupModalOpen}
        editing={groupModalEditing}
        wizard={
          wizardMode === "modifier" && wizardStep === 0
            ? { steps: wizardSteps, current: 0 }
            : undefined
        }
        onCancel={() => {
          setGroupModalOpen(false);
          setGroupModalEditing(null);
          if (wizardMode === "modifier") {
            setWizardMode(null);
            setWizardStep(0);
            setWizardGroup(null);
          }
        }}
        onSaved={async (created) => {
          setGroupModalOpen(false);
          setGroupModalEditing(null);
          const nextId = created?.id;
          const updated = await fetchGroups(nextId);
          if (wizardMode === "modifier") {
            const picked =
              created?.id
                ? { id: created.id, name: created.name }
                : updated.find((g) => g.id === nextId) ||
                  updated[0] ||
                  null;
            if (picked) setWizardGroup({ id: picked.id, name: picked.name });
            setWizardStep(1);
            setModModalEditing(null);
            setModModalOpen(true);
          }
        }}
      />

      <ModifierModal
        open={modModalOpen}
        editing={modModalEditing}
        groupId={wizardGroup?.id ?? selectedGroupId ?? undefined}
        groupName={wizardGroup?.name ?? selectedGroup?.name}
        modifierGroups={groups}
        wizard={
          wizardMode === "modifier" && wizardStep === 1
            ? { steps: wizardSteps, current: 1 }
            : undefined
        }
        onCancel={() => {
          setModModalOpen(false);
          setModModalEditing(null);
          if (wizardMode === "modifier") {
            setWizardMode(null);
            setWizardStep(0);
            setWizardGroup(null);
          }
        }}
        onSaved={async () => {
          setModModalOpen(false);
          setModModalEditing(null);
          await fetchGroups();
          if (wizardMode === "modifier") {
            setWizardMode(null);
            setWizardStep(0);
            setWizardGroup(null);
          }
        }}
      />
      <Drawer
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Guía de modificadores (en 3 pasos)"
        width={520}
      >
        <Steps
          direction="vertical"
          current={0}
          items={[
            {
              title: "Crea el grupo",
              description:
                "Ej: Grupo = “Sabores”. Este grupo es la pregunta que verá el mesero.",
            },
            {
              title: "Agrega opciones",
              description:
                "Ej: “Hawaiana”, “Americana”. Cada opción se guarda como producto.",
            },
            {
              title: "Asigna el grupo a un producto",
              description:
                "En /Productos edita “Pizza especial” y agrega el grupo. Configura máximo, obligatorio y prioridad.",
            },
          ]}
        />

        <div className="mt-4">
          <Typography.Text strong>
            Ejemplo rápido (Pizza mitad y mitad)
          </Typography.Text>
          <div className="text-sm text-gray-600 mt-1">
            Grupo: “Sabores” → Opciones: Hawaiana / Americana → En Pizza
            especial: máximo 2, obligatorio, prioridad 1.
          </div>
        </div>
      </Drawer>
    </div>
  );
}
