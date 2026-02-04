// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Productos/ProductModal.tsx

import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Divider,
  Button,
  Typography,
  message,
} from "antd";
import type { ModifierGroupConfig } from "./ModifierGroupCard";
import ModifierGroupCard from "./ModifierGroupCard";
import apiOrder from "@/components/apis/apiOrder"; //

const { Text } = Typography;

// helpers
const toNumber = (v: any) =>
  (typeof v === "number" ? v : parseFloat(String(v || "0"))) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;

type AreaImpresion = { id: number; name: string; restaurantId: number };
type CatalogGroup = {
  id: number;
  code: string;
  name: string;
  subgroups?: { id: number; name: string }[];
};

export type ProductValues = {
  name: string;
  code?: string;
  groupId: number | null;
  subgroupId: number | null;
  printArea: number | null;
  price: number; // NETO (sin IVA) -> se sigue guardando en DB como basePrice
  taxRate: number; // %
  enabled: boolean;
  modifierGroups: ModifierGroupConfig[];
  priceGross?: number; // 👈 NUEVO: precio con IVA (opcional)
};

export default function ProductModal({
  open,
  mode, // "create" | "edit"
  initial,
  catalogGroups,
  areasImpresions,
  confirmLoading,
  onCancel,
  onOk,
  onOpenSelector, // abre tu SelectorModal
  onAddModifierGroup, // agrega grupo creado rápido
  onUpdateModifier, // reemplaza un grupo de modificadores en la pos i
  onRemoveModifier, // elimina un grupo de modificadores en la pos i
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<ProductValues>;
  catalogGroups: CatalogGroup[];
  areasImpresions: AreaImpresion[];
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: ProductValues) => Promise<void> | void;
  onOpenSelector: () => void; // padre abre <SelectorModal/>
  onAddModifierGroup?: (group: ModifierGroupConfig) => void;
  onUpdateModifier: (index: number, updated: ModifierGroupConfig) => void;
  onRemoveModifier: (index: number) => void;
}) {
  const [form] = Form.useForm<ProductValues>();

  // ======= NUEVO: estados sincronizados para precios =======
  const [priceGross, setPriceGross] = React.useState<number>(0); // con IVA (el que captura el dueño)
  const [vat, setVat] = React.useState<number>(16); // % IVA (default 16)
  const [priceNet, setPriceNet] = React.useState<number>(0); // sin IVA (auto)
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [quickLoading, setQuickLoading] = React.useState(false);
  const [quickGroupName, setQuickGroupName] = React.useState("");
  const [quickOptionName, setQuickOptionName] = React.useState("");
  const [quickOptionGroupId, setQuickOptionGroupId] = React.useState<number | undefined>(
    undefined
  );
  const [quickOptionPrintArea, setQuickOptionPrintArea] = React.useState<number | undefined>(
    undefined
  );
  const [quickOptionTaxRate, setQuickOptionTaxRate] = React.useState<number>(16);
  const [quickOptionPriceGross, setQuickOptionPriceGross] = React.useState<number>(0);
  const [quickPriceDelta, setQuickPriceDelta] = React.useState<number>(0);

  // mapa de subgrupos según groupId
  const [subgroupOptions, setSubgroupOptions] = React.useState<
    { id: number; name: string }[]
  >([]);

  const loadSubgroups = async (gid: number) => {
    if (!gid) {
      setSubgroupOptions([]);
      return;
    }
    try {
      const res = await apiOrder.get("/subgroups", {
        params: { groupId: gid },
      });
      const arr = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setSubgroupOptions(arr.map((s: any) => ({ id: s.id, name: s.name })));
    } catch {
      setSubgroupOptions([]);
    }
  };

  useEffect(() => {
    const initVat = initial?.taxRate ?? 16;
    const initNet = initial?.price ?? 0;
    const initGross = r2(initNet * (1 + initVat / 100));

    setVat(initVat);
    setPriceNet(initNet);
    setPriceGross(initGross);

    form.setFieldsValue({
      name: initial?.name ?? "",
      code: initial?.code ?? "",
      groupId: initial?.groupId ?? undefined,
      subgroupId: initial?.subgroupId ?? null,
      printArea: initial?.printArea ?? null,
      price: initNet,
      taxRate: initVat,
      enabled: initial?.enabled ?? true,
      modifierGroups: initial?.modifierGroups ?? [],
    } as any);

    if (initial?.groupId) {
      loadSubgroups(initial.groupId);
    } else {
      setSubgroupOptions([]);
    }
    setQuickOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 👇 NUEVO: cuando el padre cambie los grupos (vía selector) y el modal siga abierto,
  // actualiza el campo del Form para que se pinten las tarjetas.
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      modifierGroups: initial?.modifierGroups ?? [],
    } as any);
  }, [open, initial?.modifierGroups, form]);

  // actualizar subgrupos al cambiar grupo
  const handleGroupChange = async (gid: number) => {
    await loadSubgroups(gid); // ← NUEVO
    form.setFieldsValue({ groupId: gid, subgroupId: null });
  };

  // ======= NUEVO: sincronizadores =======
  const onChangeGross = (v: number | null) => {
    const g = toNumber(v);
    setPriceGross(g);
    const net = r2(g / (1 + (vat || 0) / 100));
    setPriceNet(net);
    form.setFieldsValue({ price: net, taxRate: vat });
  };

  const onChangeVat = (v: number | null) => {
    const t = toNumber(v ?? 0);
    setVat(t);
    const net = r2(priceGross / (1 + t / 100));
    setPriceNet(net);
    form.setFieldsValue({ price: net, taxRate: t });
  };

  const onChangeNet = (v: number | null) => {
    const n = toNumber(v ?? 0);
    setPriceNet(n);
    const g = r2(n * (1 + (vat || 0) / 100));
    setPriceGross(g);
    form.setFieldsValue({ price: n, taxRate: vat });
  };

  const handleOk = async () => {
    // Aseguramos que el form lleve neto/iva actualizados
    form.setFieldsValue({ price: priceNet, taxRate: vat });

    const values = await form.validateFields();

    const payload: ProductValues = {
      ...(values as ProductValues),
      priceGross, // 👈 ya tipado como parte de ProductValues (opcional)
    };

    await onOk(payload);
    form.resetFields();
  };

  const mg = Form.useWatch("modifierGroups", form) as
    | ModifierGroupConfig[]
    | undefined;
  const currentGroupId = Form.useWatch("groupId", form) as number | undefined;

  const updateGroupLocal = (index: number, updated: ModifierGroupConfig) => {
    const arr =
      (form.getFieldValue("modifierGroups") as ModifierGroupConfig[]) ?? [];
    const next = [...arr];
    next[index] = updated;
    form.setFieldsValue({ modifierGroups: next });
    onUpdateModifier(index, updated); // notifica al padre (mantiene sincronía)
  };

  const removeGroupLocal = (index: number) => {
    const arr =
      (form.getFieldValue("modifierGroups") as ModifierGroupConfig[]) ?? [];
    const next = [...arr];
    next.splice(index, 1);
    form.setFieldsValue({ modifierGroups: next });
    onRemoveModifier(index); // notifica al padre
  };

  const openQuickModal = () => {
    const fallbackGroupId =
      currentGroupId ?? (catalogGroups[0]?.id as number | undefined);
    const fallbackAreaId = areasImpresions[0]?.id as number | undefined;
    setQuickGroupName("");
    setQuickOptionName("");
    setQuickOptionGroupId(fallbackGroupId);
    setQuickOptionPrintArea(fallbackAreaId);
    setQuickOptionTaxRate(vat || 16);
    setQuickOptionPriceGross(0);
    setQuickPriceDelta(0);
    setQuickOpen(true);
  };

  const createQuickGroupAndOption = async () => {
    const groupName = quickGroupName.trim();
    const optionName = quickOptionName.trim();
    if (!groupName) {
      message.warning("Indica un nombre para el grupo");
      return;
    }
    if (!optionName) {
      message.warning("Indica un nombre para la opción");
      return;
    }
    if (!quickOptionGroupId) {
      message.warning("Selecciona un grupo de catálogo para la opción");
      return;
    }
    if (!quickOptionPrintArea) {
      message.warning("Selecciona un área de impresión");
      return;
    }

    setQuickLoading(true);
    try {
      const groupRes = await apiOrder.post("/modifier-groups", {
        name: groupName,
      });
      const createdGroup = (groupRes.data?.data ?? groupRes.data) as {
        id: number;
        name: string;
        code?: string;
      };

      const optionRes = await apiOrder.post("/products", {
        name: optionName,
        groupId: quickOptionGroupId,
        printArea: quickOptionPrintArea,
        priceGross: quickOptionPriceGross ?? 0,
        taxRate: quickOptionTaxRate ?? 16,
        enabled: false,
      });
      const createdOption = (optionRes.data?.data ?? optionRes.data) as {
        id: number;
        code?: string;
        name?: string;
        basePrice?: number;
        taxRate?: number;
        isEnabled?: boolean;
        groupId?: number;
        subgroupId?: number | null;
      };

      await apiOrder.post("/modifiers", {
        modifierGroupId: createdGroup.id,
        modifierId: createdOption.id,
        priceDelta: Number(quickPriceDelta ?? 0),
        isEnabled: true,
      });

      const basePrice =
        createdOption.basePrice ??
        r2(Number(quickOptionPriceGross ?? 0) / (1 + (quickOptionTaxRate || 0) / 100));

      const newGroup: ModifierGroupConfig = {
        id: createdGroup.id,
        name: createdGroup.name ?? groupName,
        code: createdGroup.code ?? createdGroup.name ?? groupName,
        includedQty: 0,
        maxQty: 1,
        isForced: false,
        captureIncluded: false,
        priority: 0,
        modifiers: [
          {
            modifierGroupId: createdGroup.id,
            modifierId: createdOption.id,
            priceDelta: Number(quickPriceDelta ?? 0),
            isEnabled: true,
            modifier: {
              id: createdOption.id,
              groupId: createdOption.groupId ?? quickOptionGroupId,
              subgroupId: createdOption.subgroupId ?? null,
              code: createdOption.code ?? "",
              name: createdOption.name ?? optionName,
              basePrice,
              taxRate: createdOption.taxRate ?? quickOptionTaxRate ?? 16,
              isEnabled: createdOption.isEnabled ?? true,
              isNew: false,
            } as any,
          },
        ],
        isNew: false,
      };

      const existing =
        (form.getFieldValue("modifierGroups") as ModifierGroupConfig[]) ?? [];
      const next = [...existing, newGroup];
      form.setFieldsValue({ modifierGroups: next });
      onAddModifierGroup?.(newGroup);

      message.success("Grupo y opción creados");
      setQuickOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "No se pudo crear el grupo";
      message.error(msg);
    } finally {
      setQuickLoading(false);
    }
  };
  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nuevo producto" : "Editar producto"}
      width={860}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      okText={mode === "create" ? "Crear" : "Guardar cambios"}
      confirmLoading={!!confirmLoading}
      destroyOnClose
    >
      <Form<ProductValues> form={form} layout="vertical">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            label="Nombre"
            name="name"
            rules={[
              { required: true, message: "Nombre requerido" },
              { min: 2 },
            ]}
          >
            <Input placeholder="Corona 355ml" maxLength={80} />
          </Form.Item>

          <Form.Item name="code" hidden>
            <Input type="hidden" />
          </Form.Item>

          <Form.Item
            label="Grupo"
            name="groupId"
            rules={[{ required: true, message: "Selecciona grupo" }]}
          >
            <Select
              placeholder="Grupo"
              onChange={handleGroupChange}
              options={catalogGroups.map((g) => ({
                value: g.id,
                label: g.name,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item label="Subgrupo (opcional)" name="subgroupId">
            <Select
              allowClear
              placeholder="Subgrupo"
              options={subgroupOptions.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              showSearch
              optionFilterProp="label"
              notFoundContent="Sin subgrupos"
            />
          </Form.Item>

          <Form.Item label="Área de impresión" name="printArea">
            <Select
              allowClear
              placeholder="Área de impresión"
              options={areasImpresions.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          {/* ======= NUEVO: bloque de precios centrado en PRECIO FINAL ======= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
            {/* Precio CON IVA (principal) */}
            <Form.Item
              label="Precio (con IVA)"
              tooltip="Precio final al cliente"
            >
              <InputNumber
                min={0}
                step={0.01}
                className="w-full"
                addonBefore="$"
                value={priceGross}
                onChange={onChangeGross}
              />
            </Form.Item>

            {/* IVA % (default 16) */}
            <Form.Item label="IVA" name="taxRate" tooltip="Porcentaje de IVA">
              <InputNumber
                min={0}
                step={0.5}
                className="w-full"
                addonAfter="%"
                value={vat}
                onChange={onChangeVat}
              />
            </Form.Item>

            {/* Precio SIN IVA (derivado; editable si lo necesitas) */}
            <Form.Item
              label="Precio (sin IVA)"
              name="price"
              rules={[{ required: true, message: "Requerido" }]}
              tooltip="Se guarda como basePrice en la DB"
            >
              <InputNumber
                min={0}
                step={0.01}
                className="w-full"
                addonBefore="$"
                value={priceNet}
                onChange={onChangeNet}
              />
            </Form.Item>
          </div>

          <Form.Item label="¿Activo?" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        <Divider>Grupos de modificadores</Divider>
        {(mg ?? []).length === 0 && (
          <Text type="secondary">
            Aún no has agregado grupos de modificadores a este producto.
          </Text>
        )}

        {/* 👇 Registrar el campo en el Form (aunque sea oculto) */}
        <Form.Item name="modifierGroups" hidden>
          <Input type="hidden" />
        </Form.Item>

        {/* Renderizar tarjetas de cada grupo (reacciona a mg y groupId) */}
        {(mg ?? []).map((g, i) => (
          <ModifierGroupCard
            key={`${g.id}-${i}`} // en edición puede repetirse id temporalmente
            group={g}
            parentProductGroupId={currentGroupId ?? 0}
            modifiersGroups={mg ?? []}
            onUpdate={(upd) => updateGroupLocal(i, upd)}
            onRemove={() => removeGroupLocal(i)}
          />
        ))}

        <Divider>Agregar modificadores</Divider>
        <div className="rounded-md border border-dashed p-3">
          <div className="text-sm font-medium text-slate-700">
            ¿Qué quieres agregar?
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Button type="primary" onClick={onOpenSelector}>
              Grupo de modificadores
            </Button>
            <Button onClick={openQuickModal}>Modificador individual (rápido)</Button>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            El flujo rápido crea un grupo con una sola opción y lo adjunta a
            este producto.
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Tip: en el punto de venta, cada grupo aparece como una pregunta y
            sus opciones se capturan como extras según el máximo y las
            incluidas.
          </div>
        </div>
        <Modal
          open={quickOpen}
          title="Crear grupo + opción"
          onCancel={() => setQuickOpen(false)}
          onOk={createQuickGroupAndOption}
          okText="Crear y agregar"
          confirmLoading={quickLoading}
          destroyOnClose
        >
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-700">
                Grupo (la pregunta)
              </div>
              <Input
                placeholder="Ej. Salsas"
                value={quickGroupName}
                onChange={(e) => setQuickGroupName(e.target.value)}
              />
            </div>

            <Divider className="my-3" />

            <div>
              <div className="text-sm font-medium text-slate-700">
                Opción (el modificador)
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Ej. Chipotle"
                  value={quickOptionName}
                  onChange={(e) => setQuickOptionName(e.target.value)}
                />
                <Select
                  placeholder="Grupo de catálogo"
                  value={quickOptionGroupId}
                  onChange={(v) => setQuickOptionGroupId(v)}
                  options={catalogGroups.map((g) => ({
                    value: g.id,
                    label: g.name,
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
                <Select
                  placeholder="Área de impresión"
                  value={quickOptionPrintArea}
                  onChange={(v) => setQuickOptionPrintArea(v)}
                  options={areasImpresions.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
                <InputNumber
                  min={0}
                  step={0.01}
                  className="w-full"
                  addonBefore="$"
                  placeholder="Precio con IVA"
                  value={quickOptionPriceGross}
                  onChange={(v) => setQuickOptionPriceGross(toNumber(v))}
                />
                <InputNumber
                  min={0}
                  step={0.5}
                  className="w-full"
                  addonAfter="%"
                  placeholder="IVA"
                  value={quickOptionTaxRate}
                  onChange={(v) => setQuickOptionTaxRate(toNumber(v))}
                />
                <InputNumber
                  min={0}
                  step={0.01}
                  className="w-full"
                  addonBefore="$"
                  placeholder="Extra por opción"
                  value={quickPriceDelta}
                  onChange={(v) => setQuickPriceDelta(toNumber(v))}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                El extra se cobra cuando la opción excede las incluidas.
              </div>
            </div>
          </div>
        </Modal>
      </Form>
    </Modal>
  );
}
