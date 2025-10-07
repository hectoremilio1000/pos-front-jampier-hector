// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Modificadores/index.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Input,
  Button,
  message,
  Space,
  Tag,
  Popconfirm,
  Empty,
  Card,
  Typography,
  Divider,
  Tooltip,
} from "antd";
import { PlusOutlined, InfoCircleOutlined } from "@ant-design/icons";

import apiOrder from "@/components/apis/apiOrder";
import type { ModifierValues } from "./ModifierWizardModal";
import ModifierWizardModal from "./ModifierWizardModal";

type Producto = { id: number; code: string; name: string };
type ModifierItem = {
  id: number;
  modifierGroupId: number;
  modifierId: number;
  priceDelta: number;
  isEnabled: boolean;
  modifier: Producto;
};
type ModifierGroup = {
  id: number;
  name: string;
  code: string;
  modifiers: ModifierItem[];
};

export default function ModificadoresPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitial, setModalInitial] = useState<ModifierValues | undefined>(
    undefined
  );
  const [editId, setEditId] = useState<number | null>(null);
  const [excludeIds, setExcludeIds] = useState<number[]>([]); // productos ya usados en el conjunto seleccionado

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/modifier-groups");
      const data = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setGroups(data);
    } catch {
      message.error("Error al cargar conjuntos de modificadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filtered = useMemo(
    () =>
      groups.filter((g) =>
        `${g.name} ${g.code}`.toLowerCase().includes(search.toLowerCase())
      ),
    [groups, search]
  );

  // abrir crear
  const openCreate = (groupId?: number) => {
    const gid = groupId ?? groups[0]?.id ?? 0;
    const used =
      groups.find((g) => g.id === gid)?.modifiers?.map((m) => m.modifierId) ??
      [];
    setExcludeIds(used);

    setEditId(null);
    setModalMode("create");
    setModalInitial({
      modifierGroupId: gid,
      modifierId: null,
      priceDelta: 0,
      isEnabled: true,
    });
    setModalOpen(true);
  };

  // abrir editar
  const openEdit = (row: ModifierItem) => {
    const used =
      groups
        .find((g) => g.id === row.modifierGroupId)
        ?.modifiers?.map((m) => m.modifierId) ?? [];
    // permite elegir el mismo producto que ya tiene esta línea
    setExcludeIds(used.filter((id) => id !== row.modifierId));

    setEditId(row.id);
    setModalMode("edit");
    setModalInitial({
      modifierGroupId: row.modifierGroupId,
      modifierId: row.modifierId,
      priceDelta: row.priceDelta,
      isEnabled: row.isEnabled,
    });
    setModalOpen(true);
  };

  // guardar
  const handleSave = async (vals: ModifierValues) => {
    // Guardas defensivas para no mandar undefined
    if (!vals?.modifierGroupId) {
      message.warning("Elige un conjunto.");
      return;
    }
    if (vals?.modifierId == null) {
      message.warning("Elige o crea el producto del modificador.");
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await apiOrder.put(`/modifiers/${editId}`, vals);
        message.success("Modificador actualizado");
      } else {
        await apiOrder.post(`/modifiers`, vals);
        message.success("Modificador creado");
      }
      setModalOpen(false);
      setEditId(null);
      await fetchGroups();
    } catch (e: any) {
      const msg = e?.response?.data?.message || "";
      if (msg.toLowerCase().includes("duplicate")) {
        message.error("Ese producto ya es modificador en este conjunto.");
      } else {
        message.error("Error al guardar modificador");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiOrder.delete(`/modifiers/${id}`);
      message.success("Modificador eliminado");
      await fetchGroups();
    } catch {
      message.error("Error al eliminar modificador");
    }
  };

  const colsGroups = [
    { title: "Nombre", dataIndex: "name" },
    { title: "Código", dataIndex: "code" },
    {
      title: "Acciones",
      render: (_: any, record: ModifierGroup) => (
        <Space>
          <Button size="small" onClick={() => openCreate(record.id)}>
            + Modificador
          </Button>
        </Space>
      ),
    },
  ];

  const colsModifiers = [
    {
      title: "Conjunto",
      dataIndex: "modifierGroupId",
      render: (_: any, row: ModifierItem) =>
        groups.find((gg) => gg.id === row.modifierGroupId)?.name ??
        row.modifierGroupId,
    },
    {
      title: "Producto",
      render: (_: any, row: ModifierItem) =>
        `${row.modifier?.code ?? ""} ${row.modifier?.name ?? ""}`,
    },
    {
      title: "Extra",
      dataIndex: "priceDelta",
      render: (v: number) => `$${Number(v).toFixed(2)}`,
    },
    {
      title: "Estado",
      dataIndex: "isEnabled",
      render: (v: boolean) =>
        v ? <Tag color="green">Activo</Tag> : <Tag color="red">Off</Tag>,
    },
    {
      title: "Acciones",
      render: (_: any, row: ModifierItem) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar modificador?"
            okText="Sí"
            cancelText="No"
            onConfirm={() => handleDelete(row.id)}
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const allModifiers: ModifierItem[] = groups.flatMap((g) => g.modifiers ?? []);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Encabezado de página */}
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar conjunto o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            Crear modificador
          </Button>
        </div>
      </div>

      {/* SECCIÓN 1: Conjuntos (familias) */}
      <Card
        size="default"
        title={
          <Space>
            <Typography.Text strong>Conjuntos de modificadores</Typography.Text>
            <Tooltip title="Conjunto de modificadores donde agruparás los extras. Ej.: Toppings, Salsas, Aderezos.">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            Crear modificador
          </Button>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          <span style={{ fontWeight: 500 }}>Arriba:</span> gestiona los{" "}
          <em>conjuntos</em> de extras (modificadores). Desde cada fila puedes
          agregar un modificador con{" "}
          <span style={{ fontWeight: 500 }}>+ Modificador</span>.
        </Typography.Paragraph>

        <Table
          locale={{ emptyText: <Empty description="Sin conjuntos todavía" /> }}
          rowKey={(r: ModifierGroup) => `g-${r.id}`}
          columns={colsGroups as any}
          dataSource={filtered}
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Separador visual claro entre secciones */}
      <Divider orientation="left" plain></Divider>

      {/* SECCIÓN 2: Modificadores (líneas) */}
      <Card
        size="default"
        title={
          <Space>
            <Typography.Text strong>Modificadores</Typography.Text>
            <Tooltip title="Cada línea conecta un producto (ingrediente) con un conjunto, con su precio extra.">
              <InfoCircleOutlined />
            </Tooltip>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          <span style={{ fontWeight: 500 }}>Abajo:</span> ves las{" "}
          <em>líneas</em> ya creadas: Conjunto → Producto (modificador) → Extra
          → Estado.
        </Typography.Paragraph>

        <Table
          locale={{
            emptyText: <Empty description="Sin modificadores todavía" />,
          }}
          rowKey={(r: ModifierItem) => `m-${r.id}`}
          columns={colsModifiers as any}
          dataSource={allModifiers}
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Wizard */}
      <ModifierWizardModal
        open={modalOpen}
        mode={modalMode}
        initial={modalInitial}
        confirmLoading={saving}
        excludeProductIds={excludeIds}
        onCancel={() => {
          setModalOpen(false);
          setEditId(null);
          setExcludeIds([]);
        }}
        onOk={handleSave}
        onDuplicateCheck={(v) => {
          const g = groups.find((gg) => gg.id === v.modifierGroupId);
          const exists = g?.modifiers?.some(
            (m) => m.modifierId === v.modifierId && (!editId || m.id !== editId)
          );
          return exists
            ? "Ese producto ya es modificador en esta familia."
            : null;
        }}
      />
    </div>
  );
}
