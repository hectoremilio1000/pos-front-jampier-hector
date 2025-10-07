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
import SelectorModal from "./Productos/ModifierGroupSelectorModal";
import { nextCodeForGroup } from "@/utils/nextCode";
import { BiTrash } from "react-icons/bi";

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

interface AreaImpresion {
  id: number;
  name: string;
  restaurantId: number;
}

/* ─── estructura del formulario ─── */
interface ProductFormState {
  name: string;
  code: string;
  groupId: number;
  printArea: number | null;
  areaImpresion: AreaImpresion | null;
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
  printArea: null,
  subgroupId: null,
  price: 0,
  taxRate: 0,
  enabled: true,
  modifierGroups: [],
  areaImpresion: null,
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
  const [areasImpresions, setAreasImpresions] = useState<AreaImpresion[]>([]);
  const fetchAreasImpresions = async () => {
    try {
      const res = await apiOrder.get("/areasImpresions");
      console.log(res);
      setAreasImpresions(res.data);
    } catch (error) {
      console.log(error);
      message.error("Ocurrio un error al traer las areas de impresion");
    }
  };
  useEffect(() => {
    fetchAreasImpresions();
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

    setSaving(true);
    message.loading({
      key: "saveProd",
      content: editingId ? "Actualizando…" : "Creando…",
    });

    try {
      if (editingId === null) {
        /* ------------------------ CREAR (tu flujo original) ------------------------ */
        /* 1️⃣ Producto base */
        const { data: prod } = await apiOrder.post("/products", {
          name: form.name,
          code: form.code,
          groupId: form.groupId,
          subgroupId: form.subgroupId,
          printArea: form.printArea,
          price: form.price,
          taxRate: form.taxRate,
          enabled: form.enabled,
        });

        /* 2️⃣ Recorrer grupos exactamente como lo hacías */
        for (const g of form.modifierGroups) {
          let realGroupId = g.id;
          if (g.isNew) {
            const { data } = await apiOrder.post("/modifier-groups", {
              code: g.code,
              name: g.name,
            });
            realGroupId = data.id;
          }

          await apiOrder.post(`/product-modifier-groups/${prod.id}`, {
            modifierGroupId: realGroupId,
            includedQty: g.includedQty,
            maxQty: g.maxQty,
            isForced: g.isForced,
            captureIncluded: g.captureIncluded,
            priority: g.priority,
          });

          for (const line of g.modifiers) {
            let modifierId = line.modifierId;
            if (line.product.isNew) {
              const { data: newProd } = await apiOrder.post("/products", {
                groupId: line.product.groupId,
                subgroupId: line.product.subgroupId,
                code: line.product.code,
                name: line.product.name,
                price: line.product.basePrice,
                taxRate: line.product.taxRate,
                enabled: line.product.isEnabled,
              });
              modifierId = newProd.id;
            }

            await apiOrder.post("/modifiers", {
              modifierGroupId: realGroupId,
              modifierId,
              priceDelta: line.priceDelta,
              isEnabled: line.isEnabled,
            });
          }
        }

        message.success({ key: "saveProd", content: "Producto creado 🎉" });
      } else {
        /* ------------------------ EDITAR (PUT /full) ------------------------ */
        await apiOrder.put(`/products/${editingId}/full`, {
          groupId: form.groupId,
          subgroupId: form.subgroupId,
          printArea: form.printArea,
          name: form.name,
          price: form.price,
          taxRate: form.taxRate,
          enabled: form.enabled,
          code: form.code, // si lo permites editable
          modifierGroups: form.modifierGroups, // árbol completo
        });

        message.success({ key: "saveProd", content: "Producto actualizado" });
      }

      /* reset UI */
      setOpen(false);
      setForm(blankForm);
      setEditingId(null);
      load();
    } catch (err) {
      console.error(err);
      message.error({ key: "saveProd", content: "Error al guardar" });
    }
    setSaving(false);
  };

  // null = modo "crear", number = id en edición
  const [editingId, setEditingId] = useState<number | null>(null);
  const editProduct = async (id: number) => {
    try {
      const { data } = await apiOrder.get(`/products/${id}`);
      /* mapeo a tu ProductFormState */
      setForm({
        name: data.name,
        code: data.code,
        groupId: data.groupId,
        areaImpresion: null,
        printArea: data.printArea,
        subgroupId: data.subgroupId,
        price: data.basePrice,
        taxRate: data.taxRate,
        enabled: data.isEnabled,
        modifierGroups: data.modifierGroups, // ← árbol completo
      });
      setEditingId(id); // <<<<<<
      setOpen(true);
    } catch {
      message.error("Error al cargar producto");
    }
  };
  const deleteProduct = async (id: number) => {
    try {
      message.loading("Eliminando producto");
      await apiOrder.delete(`/products/${id}`);
      message.success("Producto eliminando correctamente");
      await load();
    } catch (error) {
      console.log(error);
      message.error("Error al eliminar el producto");
    }
  };

  /* ---------- tabla ---------- */
  const columns = [
    { title: "Código", dataIndex: "code" },
    { title: "Nombre", dataIndex: "name" },
    { title: "A. Impresion", dataIndex: ["areaImpresion", "name"] },
    { title: "Precio", dataIndex: "basePrice", render: (v: number) => `$${v}` },
    {
      title: "Acciones",
      render: (_: any, record: any) => (
        <>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => editProduct(record.id)}
          >
            Editar
          </Button>
          <Button
            size="small"
            icon={<BiTrash />}
            onClick={() => deleteProduct(record.id)}
          >
            Eliminar
          </Button>
        </>
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
        title={editingId ? "Editar producto" : "Nuevo producto"}
        width={820}
        onCancel={() => {
          setOpen(false);
          setForm(blankForm);
        }}
        footer={[
          <Button
            key="canc"
            onClick={() => {
              setOpen(false);
              setEditingId(null);
            }}
          >
            Cancelar
          </Button>,
          <Button key="ok" type="primary" loading={saving} onClick={save}>
            {editingId ? "Guardar cambios" : "Crear"}
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
          <Select
            className="w-full"
            placeholder="Area de impresion"
            allowClear
            value={form.printArea ?? undefined}
            onChange={(v) => patch({ printArea: v ?? null })}
            options={areasImpresions.map((s: AreaImpresion) => ({
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
