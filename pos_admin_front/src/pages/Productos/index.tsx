import { useEffect, useState } from "react";
import { Table, Input, Button, message } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { BiTrash } from "react-icons/bi";

import ProductModal, { type ProductValues } from "./ProductModal";

import SelectorModal from "./ModifierGroupSelectorModal";

import type { ModifierGroupConfig } from "./ModifierGroupCard";
import apiOrder from "@/components/apis/apiOrder";

interface AreaImpresion {
  id: number;
  name: string;
  restaurantId: number;
}

export default function ProductosPage() {
  /* tabla */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* modal producto */
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductValues>({
    name: "",
    code: "",
    groupId: null,
    subgroupId: null,
    printArea: null,
    price: 0,
    taxRate: 16,
    enabled: true,
    modifierGroups: [],
  });

  /* catálogos */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [catalogGroups, setCatalogGroups] = useState<any[]>([]);
  const [areasImpresions, setAreasImpresions] = useState<AreaImpresion[]>([]);

  /* selector de grupos de modificadores */
  const [selOpen, setSelOpen] = useState(false);

  /* carga inicial de productos + catálogos */
  const load = async () => {
    setLoading(true);
    try {
      const [prods, groups] = await Promise.all([
        apiOrder.get("/products"),
        apiOrder.get("/groups"),
      ]);
      setRows(
        Array.isArray(prods.data) ? prods.data : (prods.data?.data ?? [])
      );
      setCatalogGroups(
        Array.isArray(groups.data) ? groups.data : (groups.data?.data ?? [])
      );
    } catch {
      message.error("Error al cargar datos");
    }
    setLoading(false);
  };

  const fetchAreasImpresions = async () => {
    try {
      const res = await apiOrder.get("/areasImpresion");
      setAreasImpresions(
        Array.isArray(res.data) ? res.data : (res.data?.data ?? [])
      );
    } catch {
      message.error("Ocurrió un error al traer las áreas de impresión");
    }
  };

  useEffect(() => {
    load();
    fetchAreasImpresions();
  }, []);

  /* ---------- guardar ---------- */

  /* ---------- guardar ---------- */
  const save = async (override?: ProductValues) => {
    const f = override ?? form;

    const hasName = (f.name ?? "").trim().length > 0;
    const hasGroup = typeof f.groupId === "number" && f.groupId > 0;
    if (!hasName || !hasGroup) {
      return message.warning("Completa Nombre y Grupo");
    }

    setSaving(true);
    message.loading({
      key: "saveProd",
      content: editingId ? "Actualizando…" : "Creando…",
    });

    try {
      if (editingId === null) {
        // CREAR
        const { data: prod } = await apiOrder.post("/products", {
          name: f.name,
          groupId: f.groupId,
          subgroupId: f.subgroupId,
          printArea: f.printArea,
          price: f.price, // neto
          priceGross:
            f.priceGross ??
            Math.round(f.price * (1 + f.taxRate / 100) * 100) / 100,
          taxRate: f.taxRate,
          enabled: f.enabled,
        });

        // grupos de modificadores
        const mods = Array.isArray(f.modifierGroups) ? f.modifierGroups : [];
        for (const g of mods) {
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
        }

        message.success({ key: "saveProd", content: "Producto creado 🎉" });
      } else {
        // EDITAR
        await apiOrder.put(`/products/${editingId}/full`, {
          groupId: f.groupId,
          subgroupId: f.subgroupId,
          printArea: f.printArea,
          name: f.name,
          price: f.price, // neto
          priceGross:
            f.priceGross ??
            Math.round(f.price * (1 + f.taxRate / 100) * 100) / 100,
          taxRate: f.taxRate ?? 16,
          enabled: f.enabled,
          modifierGroups: Array.isArray(f.modifierGroups)
            ? f.modifierGroups
            : [],
        });

        message.success({ key: "saveProd", content: "Producto actualizado" });
      }

      // reset UI
      setOpen(false);
      setForm({
        name: "",
        code: "",
        groupId: null,
        subgroupId: null,
        printArea: null,
        price: 0,
        taxRate: 16,
        enabled: true,
        modifierGroups: [],
      });
      setEditingId(null);
      await load();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || "";
      if (
        msg.includes("products_code_unique") ||
        msg.toLowerCase().includes("duplicate key")
      ) {
        message.error(
          "El código ya existe. Cambia el código o elige el grupo para autogenerar."
        );
      } else {
        message.error({ key: "saveProd", content: "Error al guardar" });
      }
    } finally {
      setSaving(false);
    }
  };

  /* editar */
  const r2 = (n: number) => Math.round(Number(n) * 100) / 100;
  const editProduct = async (id: number) => {
    try {
      const { data } = await apiOrder.get(`/products/${id}`);

      // Asegura IVA (default 16 si viene vacío)
      const taxRate: number = data.taxRate ?? 16;

      // Net (basePrice) robusto: si no viene, lo derivamos desde priceGross
      const basePrice: number =
        data.basePrice != null
          ? Number(data.basePrice)
          : data.priceGross != null
            ? r2(Number(data.priceGross) / (1 + taxRate / 100))
            : 0;

      // Mapeo seguro de grupos de modificadores (por índice o por id)
      const groupsArr = Array.isArray(data.modifierGroups)
        ? data.modifierGroups
        : [];
      const pmgArr = Array.isArray(data.productModifierGroups)
        ? data.productModifierGroups
        : [];

      const newModifierGroups: ModifierGroupConfig[] = pmgArr.map(
        (pmg: any, i: number) => {
          // intenta por índice; si hay mismatch, busca por id
          const mg =
            groupsArr[i] ??
            groupsArr.find((g: any) => g?.id === pmg?.modifierGroupId) ??
            {};
          return {
            id: mg.id,
            name: mg.name,
            code: mg.code,
            includedQty: pmg.includedQty,
            maxQty: pmg.maxQty,
            isForced: pmg.isForced,
            captureIncluded: pmg.captureIncluded,
            priority: pmg.priority,
            // en tu show ya viene pmg.modifierGroup.modifiers
            modifiers: pmg.modifierGroup?.modifiers ?? [],
            isNew: false,
          };
        }
      );

      setForm({
        name: data.name,
        code: data.code,
        groupId: data.groupId,
        subgroupId: data.subgroupId,
        printArea: data.printArea,
        price: basePrice, // NETO (sin IVA) para el modal
        taxRate, // IVA %
        enabled: data.isEnabled,
        modifierGroups: newModifierGroups,
      });

      setEditingId(id);
      setOpen(true);
    } catch (error) {
      console.error(error);
      message.error("Error al cargar producto");
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      message.loading("Eliminando producto…");
      await apiOrder.delete(`/products/${id}`);
      message.success("Producto eliminado correctamente");
      await load();
    } catch (error) {
      console.error(error);
      message.error("Error al eliminar el producto");
    }
  };

  /* tabla */
  const columns = [
    { title: "Nombre", dataIndex: "name" },
    { title: "A. Impresión", dataIndex: ["areaImpresion", "name"] },
    {
      title: "Precio",
      render: (_: any, r: any) => {
        const toNum = (v: any) =>
          v === null || v === undefined ? 0 : Number(v);
        const gross =
          r.priceGross != null
            ? toNum(r.priceGross)
            : toNum(r.basePrice) * (1 + toNum(r.taxRate ?? 0) / 100);
        return `$${isFinite(gross) ? gross.toFixed(2) : "0.00"}`;
      },
    },

    {
      title: "Acciones",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    [r.name].some((t: string) => t?.toLowerCase().includes(search.toLowerCase()))
  );

  /* helpers modificadores para pasar al modal */
  const openSelector = () => setSelOpen(true);
  const updateModifierAt = (index: number, updated: ModifierGroupConfig) => {
    const copy = [...form.modifierGroups];
    copy[index] = updated;
    setForm({ ...form, modifierGroups: copy });
  };
  const removeModifierAt = (index: number) => {
    const copy = [...form.modifierGroups];
    copy.splice(index, 1);
    setForm({ ...form, modifierGroups: copy });
  };
  const addModifierGroup = (group: ModifierGroupConfig) => {
    const next = [...(form.modifierGroups ?? []), group];
    setForm({ ...form, modifierGroups: next });
  };

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
            setForm({
              name: "",
              code: "",
              groupId: null,
              subgroupId: null,
              printArea: null,
              price: 0,
              taxRate: 16,
              enabled: true,
              modifierGroups: [],
            });
            setEditingId(null);
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

      {/* Modal de Producto (modular) */}
      <ProductModal
        open={open}
        mode={editingId ? "edit" : "create"}
        initial={form}
        catalogGroups={catalogGroups}
        areasImpresions={areasImpresions}
        confirmLoading={saving}
        onCancel={() => {
          setOpen(false);
          setEditingId(null);
        }}
        onOk={async (vals) => {
          await save({ ...vals }); // ✅ ya tipado
          setForm(vals); // opcional, para mantener el estado local
        }}
        onOpenSelector={openSelector}
        onAddModifierGroup={addModifierGroup}
        onUpdateModifier={updateModifierAt}
        onRemoveModifier={removeModifierAt}
      />

      {/* Selector de grupos de modificadores */}
      <SelectorModal
        open={selOpen}
        onClose={() => setSelOpen(false)}
        selectedIds={(form.modifierGroups ?? []).map((g) => g.id)}
        onSave={(newGs) =>
          setForm({
            ...form,
            modifierGroups: [...(form.modifierGroups ?? []), ...(newGs ?? [])],
          })
        }
      />
    </div>
  );
}
