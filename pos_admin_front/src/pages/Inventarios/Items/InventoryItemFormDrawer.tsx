import { useEffect, useMemo, useRef, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Divider,
  message,
  Alert,
} from "antd";
import type {
  InventoryGroupRow,
  InventoryItemRow,
  MeasurementUnitRow,
} from "@/lib/api_inventory";
import { upsertInventoryGroup, upsertInventoryItem } from "@/lib/api_inventory";
import InventoryItemPhotosPanel from "./InventoryItemPhotosPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (item: InventoryItemRow) => void;
  restaurantId: number;
  item: InventoryItemRow | null;
  groups: InventoryGroupRow[];
  units: MeasurementUnitRow[];
  onEnsureUnits?: () => Promise<void>;
};

const SUGGESTED_GROUPS = [
  { code: "ALIM", name: "Alimentos" },
  { code: "BEB", name: "Bebidas" },
  { code: "GEN", name: "General" },
];

function makeCodeFromName(name: string) {
  // 1) quita acentos
  const noAccents = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 2) limpia caracteres raros, separa por espacios/guiones
  const words = noAccents
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);

  // 3) “abrevia” palabras largas para parecerse a códigos tipo CARNE-RES-MLD
  //    (si no te gusta, lo cambiamos a slug simple)
  const parts = words.slice(0, 4).map((w) => {
    if (w.length <= 3) return w;
    if (w.length <= 5) return w;
    return w.slice(0, 3); // CARNE->CAR, MOLIDA->MOL, etc.
  });

  // si queda muy corto, usa slug normal
  const code = parts.join("-");
  return code.length >= 3 ? code : words.join("-").slice(0, 24);
}

export default function InventoryItemFormDrawer({
  open,
  onClose,
  onSaved,
  restaurantId,
  item,
  groups,
  units,
  onEnsureUnits,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [ensuringUnits, setEnsuringUnits] = useState(false);

  const isEdit = !!item?.id;
  const codeTouchedRef = useRef(false);

  type GroupSelectValue = number | `suggested:${string}`;
  type GroupSelectOption = { label: string; value: GroupSelectValue };

  const groupOptions: GroupSelectOption[] = useMemo(
    () => groups.map((g) => ({ label: `${g.code} — ${g.name}`, value: g.id })),
    [groups],
  );

  const suggestedGroupOptions: GroupSelectOption[] = useMemo(
    () =>
      SUGGESTED_GROUPS.map((g) => ({
        label: g.name,
        value: `suggested:${g.code}`,
      })),
    [],
  );

  const groupSelectOptions: GroupSelectOption[] =
    groupOptions.length > 0 ? groupOptions : suggestedGroupOptions;

  const unitOptions = useMemo(
    () => units.map((u) => ({ label: `${u.code} — ${u.name}`, value: u.id })),
    [units],
  );
  const hasUnits = unitOptions.length > 0;

  async function handleEnsureUnits() {
    if (!onEnsureUnits) return;
    setEnsuringUnits(true);
    try {
      await onEnsureUnits();
      message.success("Unidades base creadas/actualizadas");
    } catch (e: any) {
      message.error(e?.message ?? "No se pudieron crear las unidades base");
    } finally {
      setEnsuringUnits(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    // al abrir, asumimos que NO lo tocó manualmente
    codeTouchedRef.current = false;

    form.setFieldsValue({
      code: item?.code ?? "",
      name: item?.name ?? "",
      description: item?.description ?? "",
      kind: item?.kind ?? "raw",
      groupId: item?.groupId ?? item?.group?.id ?? null,
      unitId: item?.unitId ?? item?.unit?.id ?? null,
      isActive: item?.isActive !== false,
    });
  }, [open, item, form]);

  async function resolveGroupId(rawValue: unknown): Promise<number | null> {
    if (!rawValue) return null;

    if (typeof rawValue === "string" && rawValue.startsWith("suggested:")) {
      const code = rawValue.replace("suggested:", "");
      const def = SUGGESTED_GROUPS.find((g) => g.code === code);
      if (!def) return null;
      const created = await upsertInventoryGroup(restaurantId, {
        code: def.code,
        name: def.name,
      });
      return created.id;
    }

    const asNumber = Number(rawValue);
    return Number.isFinite(asNumber) ? asNumber : null;
  }

  async function submit() {
    if (!hasUnits) {
      message.warning("No hay unidades base. Crea unidades antes de guardar el insumo.");
      return;
    }

    const values = await form.validateFields();
    setSaving(true);
    try {
      const groupId = await resolveGroupId(values.groupId);
      const finalCode =
        values.code && String(values.code).trim().length > 0
          ? String(values.code).trim()
          : makeCodeFromName(String(values.name ?? ""));
      const saved = await upsertInventoryItem(restaurantId, {
        id: item?.id,
        code: finalCode,
        name: values.name,
        description: values.description ?? "",
        kind: values.kind,
        groupId,
        unitId: values.unitId,
        isActive: values.isActive,
      });
      message.success(isEdit ? "Insumo actualizado" : "Insumo creado");
      onSaved(saved);
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando insumo");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={isEdit ? "Editar insumo" : "Nuevo insumo"}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="primary"
            loading={saving}
            onClick={submit}
            disabled={!hasUnits || ensuringUnits}
          >
            Guardar
          </Button>
        </Space>
      }
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Nombre" name="name" rules={[{ required: true }]}>
          <Input
            autoFocus
            placeholder="Carne molida de res"
            onChange={(e) => {
              const name = e.target.value ?? "";

              // Solo autogenerar en ALTA (no edición)
              if (isEdit) return;

              // Si el usuario ya editó el código manualmente, no lo pisamos
              if (codeTouchedRef.current) return;

              const nextCode = makeCodeFromName(name);
              form.setFieldsValue({ code: nextCode });
            }}
          />
        </Form.Item>

        <Form.Item name="code" hidden>
          <Input />
        </Form.Item>

        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item label="Tipo" name="kind">
          <Select
            options={[
              { value: "raw", label: "Materia prima (raw)" }, // insumos base: carne, limón, azúcar
              {
                value: "prepared",
                label: "Preparación / Subreceta (prepared)",
              }, // jarabes, salsas, mix, pre-batch
              { value: "beverage", label: "Bebida (beverage)" }, // refrescos, cerveza, vino (si lo manejas como insumo)
              { value: "packaging", label: "Empaque / Desechable (packaging)" }, // vasos desechables, tapas, bolsas, popotes
              { value: "glassware", label: "Cristalería (glassware)" }, // vasos, copas, tarros
              { value: "tableware", label: "Vajilla (tableware)" }, // platos, tazas, bowls
              { value: "utensil", label: "Utensilio / Bar tools (utensil)" }, // jiggers, shakers, pinzas, cuchillos
              { value: "cleaning", label: "Limpieza / Químicos (cleaning)" }, // cloro, detergente, desengrasante
              {
                value: "consumable",
                label: "Consumible operativo (consumable)",
              }, // servilletas, toallas, guantes (si no es empaque)
              {
                value: "maintenance",
                label: "Mantenimiento / Refacciones (maintenance)",
              }, // focos, filtros, empaques, refacciones
              { value: "asset", label: "Activo / Equipo (asset)" }, // licuadora, refrigerador, mobiliario
              { value: "merch", label: "Producto para reventa (merch)" }, // playeras, termos, botellas selladas
              { value: "service", label: "Servicio (service)" }, // lavandería, fumigación, internet (si lo quieres trackear)
            ]}
          />
        </Form.Item>

        <Form.Item label="Grupo" name="groupId">
          <Select
            allowClear
            placeholder="(sin grupo)"
            options={groupSelectOptions}
          />
        </Form.Item>

        <Form.Item
          label="Unidad base"
          name="unitId"
          rules={[{ required: true, message: "Selecciona una unidad base" }]}
        >
          <Select
            placeholder={hasUnits ? "g / ml / pza" : "No hay unidades disponibles"}
            options={unitOptions}
            notFoundContent="No hay unidades"
          />
        </Form.Item>

        {!hasUnits && (
          <div style={{ marginBottom: 12 }}>
            <Alert
              type="warning"
              showIcon
              message="No hay unidades base disponibles"
              description="Para crear insumos primero necesitas unidades base."
            />
            <Button
              style={{ marginTop: 8 }}
              onClick={handleEnsureUnits}
              loading={ensuringUnits}
              type="default"
            >
              Crear unidades base (g, kg, ml, l, pza)
            </Button>
          </div>
        )}

        <Form.Item label="Activo" name="isActive" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>

      <Divider />

      {isEdit ? (
        <InventoryItemPhotosPanel
          restaurantId={restaurantId}
          itemId={item!.id}
        />
      ) : (
        <div style={{ opacity: 0.7 }}>
          Guarda el insumo para poder subir fotos.
        </div>
      )}
    </Drawer>
  );
}
