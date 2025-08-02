import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  Space,
  message,
  InputNumber,
  Select,
  Switch,
  Divider,
} from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";

import apiOrder from "@/components/apis/apiOrder";
import ModifierGroupCard, {
  type ModifierGroupConfig,
} from "../components/Producto/ModifierGroupCard";
import SelectorModal from "../components/Producto/ModifierGroupSelectorModal";
import { nextCodeForGroup } from "@/utils/nextCode";

export interface ModifierItem {
  modifierId: number | null; // id de producto existente (o null si es nuevo)
  isNew: boolean;

  /* datos mínimos del producto-modificador */
  code: string;
  name: string;
  basePrice: number;
  taxRate: number;

  /* datos de la relación */
  priceDelta: number;
  isEnabled: boolean;
}

/* ─── estructura del formulario ─── */
interface ProductFormState {
  name: string;
  code: string;
  groupId: number;
  subgroupId: number | null;
  price: number;
  taxRate: number;
  enabled: boolean;
  modifierGroups: ModifierGroupConfig[];
}

/* ─── formulario vacío ─── */
const blankForm: ProductFormState = {
  name: "",
  code: "",
  groupId: 0,
  subgroupId: null,
  price: 0,
  taxRate: 0,
  enabled: true,
  modifierGroups: [],
};

export default function ProductosPage() {
  /* tabla */
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* modal crear */
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormState>(blankForm);

  /* combos del formulario */
  const [catalogGroups, setCatalogGroups] = useState<any[]>([]);
  const [selOpen, setSelOpen] = useState(false);

  function groupCodeById(id: number) {
    return catalogGroups.find((g) => g.id === id)?.code ?? "";
  }

  /* carga inicial de productos + catálogos */
  const load = async () => {
    setLoading(true);
    try {
      const [prods, groups] = await Promise.all([
        apiOrder.get("/products"),
        apiOrder.get("/groups"),
      ]);
      setRows(prods.data);
      setCatalogGroups(groups.data);
    } catch {
      message.error("Error al cargar datos");
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.groupId) return;

    const groupCode = groupCodeById(form.groupId);
    if (!groupCode) return;

    const newCode = nextCodeForGroup(groupCode, rows, form.groupId, 1);
    setForm((f) => ({ ...f, code: newCode }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.groupId, rows]);

  /* ---------- guardar ---------- */
  const save = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.groupId) {
      return message.warning("Completa Nombre, Código y Grupo");
    }

    console.log(form);

    setSaving(true);
    message.loading({ key: "saveProd", content: "Guardando…" });

    try {
      /* 1️⃣  producto base */
      const { data: prod } = await apiOrder.post("/products", {
        name: form.name,
        code: form.code,
        groupId: form.groupId,
        subgroupId: form.subgroupId,
        price: form.price,
        taxRate: form.taxRate,
        enabled: form.enabled,
      });
      for (const g of form.modifierGroups) {
        /* grupo nuevo => crear y obtener id real */
        let realGroupId = g.id;
        if (g.isNew) {
          const { data } = await apiOrder.post("/modifier-groups", {
            code: g.code,
            name: g.name,
          });
          realGroupId = data.id;
        }

        /* config grupo/producto padre */
        await apiOrder.post(`/product-modifier-groups/${prod.id}`, {
          modifierGroupId: realGroupId,
          includedQty: g.includedQty,
          maxQty: g.maxQty,
          isForced: g.isForced,
          captureIncluded: g.captureIncluded,
          priority: g.priority,
        });

        /* ---------- modificadores ---------- */
        for (const line of g.modifiers) {
          let modifierId = line.modifierId; // puede venir null
          const p = line.product; // ProductMod completo

          if (p.isNew) {
            /* crear el producto‑modificador mínimo */
            const { data: newProd } = await apiOrder.post("/products", {
              groupId: p.groupId,
              subgroupId: p.subgroupId,
              code: p.code,
              name: p.name,
              price: p.basePrice,
              taxRate: p.taxRate,
              isEnabled: p.isEnabled,
            });
            modifierId = newProd.id;
          }

          await apiOrder.post("/modifiers", {
            productId: prod.id, // padre
            modifierGroupId: realGroupId, // grupo
            modifierId, // id final
            priceDelta: line.priceDelta,
            isEnabled: line.isEnabled,
          });
        }
      }

      message.success({ key: "saveProd", content: "Producto creado 🎉" });
      setOpen(false);
      setForm(blankForm);
      load();
    } catch (e) {
      console.error(e);
      message.error({ key: "saveProd", content: "Error al guardar" });
    }
    setSaving(false);
  };

  /* ---------- tabla ---------- */
  const columns = [
    { title: "Código", dataIndex: "code" },
    { title: "Nombre", dataIndex: "name" },
    { title: "Precio", dataIndex: "basePrice", render: (v: number) => `$${v}` },
    {
      title: "Acciones",
      render: () => (
        <Space>
          <Button size="small" icon={<EditOutlined />} disabled>
            Editar
          </Button>
        </Space>
      ),
    },
  ];

  const filtered = rows.filter((r) =>
    [r.name, r.code].some((t: string) =>
      t.toLowerCase().includes(search.toLowerCase())
    )
  );

  /* ---------- helpers de formulario ---------- */
  const subgroups =
    catalogGroups.find((g) => g.id === form.groupId)?.subgroups || [];

  const patch = (p: Partial<ProductFormState>) => setForm({ ...form, ...p });

  /* ---------- UI ---------- */
  return (
    <div className="space-y-4">
      {/* buscador + botón */}
      <div className="flex justify-between">
        <Input
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => {
            setForm(blankForm);
            setOpen(true);
          }}
        >
          Nuevo producto
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={filtered}
        columns={columns}
      />

      {/* -------- modal -------- */}
      <Modal
        open={open}
        title="Nuevo producto"
        width={820}
        onCancel={() => {
          setOpen(false);
          setForm(blankForm);
        }}
        footer={[
          <Button key="canc" onClick={() => setOpen(false)}>
            Cancelar
          </Button>,
          <Button key="ok" type="primary" loading={saving} onClick={save}>
            Crear
          </Button>,
        ]}
      >
        {/* formulario in‑line */}
        <div className="space-y-4">
          <Input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <Input
            placeholder="Código"
            value={form.code}
            onChange={(e) => patch({ code: e.target.value })}
          />
          <Select
            className="w-full"
            placeholder="Grupo"
            value={form.groupId || undefined}
            onChange={(v) => patch({ groupId: v })}
            options={catalogGroups.map((g) => ({
              value: g.id,
              label: g.name,
            }))}
          />
          <Select
            className="w-full"
            placeholder="Subgrupo (opcional)"
            allowClear
            value={form.subgroupId ?? undefined}
            onChange={(v) => patch({ subgroupId: v ?? null })}
            options={subgroups.map((s: any) => ({
              value: s.id,
              label: s.name,
            }))}
          />
          <InputNumber
            className="w-full"
            addonBefore="$"
            placeholder="Precio"
            value={form.price}
            onChange={(v) => patch({ price: v ?? 0 })}
          />
          <InputNumber
            className="w-full"
            addonAfter="%"
            placeholder="IVA"
            value={form.taxRate}
            onChange={(v) => patch({ taxRate: v ?? 0 })}
          />
          <Switch
            checked={form.enabled}
            onChange={(v) => patch({ enabled: v })}
            checkedChildren="Activo"
            unCheckedChildren="Off"
          />

          <Divider>Modificadores</Divider>

          {form.modifierGroups.map((g, i) => (
            <ModifierGroupCard
              modifiersGroups={form.modifierGroups}
              parentProductGroupId={form.groupId}
              key={g.id}
              group={g}
              onRemove={() => {
                const copy = [...form.modifierGroups];
                copy.splice(i, 1);
                patch({ modifierGroups: copy });
              }}
              onUpdate={(upd) => {
                const copy = [...form.modifierGroups];
                copy[i] = upd;
                patch({ modifierGroups: copy });
              }}
            />
          ))}

          <Button onClick={() => setSelOpen(true)}>Agregar grupos</Button>

          <SelectorModal
            open={selOpen}
            onClose={() => setSelOpen(false)}
            selectedIds={form.modifierGroups.map((g) => g.id)}
            onSave={(newGs) =>
              patch({ modifierGroups: [...form.modifierGroups, ...newGs] })
            }
          />
        </div>
      </Modal>
    </div>
  );
}
