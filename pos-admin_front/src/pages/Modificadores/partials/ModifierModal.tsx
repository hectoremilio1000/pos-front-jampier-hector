// pos-admin/src/pages/Modificadores/partials/ModifierModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  Button,
  Input,
  Space,
  Card,
  Steps,
  Typography,
  message,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";

import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

const { Text } = Typography;

type Producto = { id: number; code: string; name: string; groupId: number };
type GrupoCat = { id: number; name: string; code: string };
type AreasCat = { id: number; name: string; code: string };
type ModifierGroupOption = {
  id: number;
  name: string;
  code: string;
  modifiers?: { modifierId: number }[];
};

export default function ModifierModal({
  open,
  editing,
  groupId,
  groupName,
  modifierGroups,
  wizard,
  onCancel,
  onSaved,
}: {
  open: boolean;
  editing: {
    id: number;
    modifierGroupId: number;
    modifierId: number;
    priceDelta: number;
    isEnabled: boolean;
  } | null;
  groupId?: number;
  groupName?: string;
  modifierGroups: ModifierGroupOption[];
  wizard?: { steps: { title: string }[]; current: number };
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form] = Form.useForm<{
    modifierGroupId: number;
    modifierId: number | null;
    priceDelta: number;
    isEnabled: boolean;
  }>();
  const watchedModifierId = Form.useWatch("modifierId", form) as number | null;
  const watchedPriceDelta = Form.useWatch("priceDelta", form) as number | null;
  const watchedEnabled = Form.useWatch("isEnabled", form) as boolean | null;
  const watchedGroupId = Form.useWatch("modifierGroupId", form) as number | null;

  const [products, setProducts] = useState<Producto[]>([]);
  const [groupsCat, setGroupsCat] = useState<GrupoCat[]>([]);
  const [areasCat, setAreasCat] = useState<AreasCat[]>([]);

  // crear producto rápido
  const [quickOpen, setQuickOpen] = useState(false);
  const [qpName, setQpName] = useState("");
  const [qpGroupId, setQpGroupId] = useState<number | undefined>(undefined);
  const [printArea, setPrintArea] = useState<number | undefined>(undefined);
  const [qpTax, setQpTax] = useState(16);
  const [qpPriceGross, setQpPriceGross] = useState(0);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // cargar catálogos al abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [p, gc, ac] = await Promise.all([
          apiOrder.get("/modifier-products"),
          apiOrder.get("/groups"),
          apiOrder.get("/areasImpresion"),
        ]);
        const plist = Array.isArray(p.data) ? p.data : (p.data?.data ?? []);
        const gcat = Array.isArray(gc.data) ? gc.data : (gc.data?.data ?? []);
        const acat = Array.isArray(ac.data) ? ac.data : (ac.data?.data ?? []);
        setProducts(
          plist.map((x: any) => ({
            id: x.id,
            code: x.code,
            name: x.name,
            groupId: x.groupId,
          }))
        );
        setGroupsCat(
          gcat.map((x: any) => ({ id: x.id, name: x.name, code: x.code }))
        );
        setAreasCat(
          acat.map((x: any) => ({ id: x.id, name: x.name, code: x.code }))
        );

        if (editing) {
          form.setFieldsValue({
            modifierGroupId: editing.modifierGroupId,
            modifierId: editing.modifierId,
            priceDelta: editing.priceDelta,
            isEnabled: editing.isEnabled,
          } as any);
        } else {
          form.setFieldsValue({
            modifierGroupId: groupId as any,
            modifierId: null,
            priceDelta: 0,
            isEnabled: true,
          } as any);
        }
      } catch {
        setProducts([]);
        setGroupsCat([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // filtra productos para no permitir duplicar dentro del grupo
  const selectedGroupId =
    watchedGroupId ?? editing?.modifierGroupId ?? groupId ?? null;

  const existingModifierIds = useMemo(() => {
    if (!selectedGroupId) return [];
    const group = modifierGroups.find((g) => g.id === selectedGroupId);
    return group?.modifiers?.map((m) => m.modifierId) ?? [];
  }, [modifierGroups, selectedGroupId]);

  const filteredProducts = useMemo(() => {
    if (!editing) {
      return products.filter((p) => !existingModifierIds.includes(p.id));
    }
    // en edición, permite el mismo id de la línea
    return products.filter(
      (p) => p.id === editing.modifierId || !existingModifierIds.includes(p.id)
    );
  }, [products, existingModifierIds, editing]);

  const handleOk = async () => {
    try {
      const v = await form.validateFields();
      if (!v.modifierGroupId) {
        message.warning("Elige un grupo");
        return;
      }
      if (v.modifierId == null) {
        message.warning("Elige o crea un producto");
        return;
      }

      if (editing) {
        await apiOrder.put(`/modifiers/${editing.id}`, v);
        message.success("Modificador actualizado");
      } else {
        await apiOrder.post(`/modifiers`, v);
        message.success("Modificador creado");
      }
      await onSaved();
    } catch {
      /* no-op */
    }
  };

  /* ───────── crear producto rápido ───────── */

  const defaultModifierGroup = useMemo(() => {
    return (
      groupsCat.find((g) => String(g.code || '').toUpperCase() === 'EXTRAS') ||
      groupsCat.find((g) => String(g.name || '').toLowerCase() === 'extras') ||
      groupsCat.find((g) => String(g.name || '').toLowerCase() === 'modificadores') ||
      null
    )
  }, [groupsCat])

  useEffect(() => {
    if (!quickOpen) return;
    setQpName('');
    setQpPriceGross(0);
    setQpTax(16);
    setQpGroupId(defaultModifierGroup?.id);
    setPrintArea(areasCat[0]?.id);
  }, [quickOpen, defaultModifierGroup, areasCat]);

  const createQuickProduct = async () => {
    if (!qpName.trim()) {
      message.warning("Completa el nombre del modificador");
      return;
    }
    const fallbackGroupId = qpGroupId ?? defaultModifierGroup?.id;
    const fallbackPrintArea = printArea ?? areasCat[0]?.id;
    if (!fallbackGroupId) {
      message.warning("No se encontró el grupo de modificadores (EXTRAS)");
      return;
    }
    try {
      setCreatingProduct(true);
      // Tu backend prioriza priceGross si llega
      const { data: prod } = await apiOrder.post("/products", {
        name: qpName.trim(),
        groupId: fallbackGroupId,
        subgroupId: null,
        printArea: fallbackPrintArea,
        priceGross: Number(qpPriceGross ?? 0),
        taxRate: Number(qpTax ?? 16),
        enabled: false,
      });
      const nuevo: Producto = {
        id: prod.id,
        code: prod.code,
        name: prod.name,
        groupId: prod.groupId,
      };
      // agrega al catálogo local y selecciónalo
      setProducts((prev) => [...prev, nuevo]);
      form.setFieldsValue({ modifierId: nuevo.id });
      const currentDelta = Number(form.getFieldValue("priceDelta") ?? 0);
      if (currentDelta === 0 && Number(qpPriceGross ?? 0) > 0) {
        form.setFieldsValue({ priceDelta: Number(qpPriceGross ?? 0) });
      }

      // prepara siguiente
      setQpName("");
      setQpPriceGross(0);
      setQpTax(16);
      message.success("Producto creado");
      setQuickOpen(false); // ✅ cerrar modal rápido
    } finally {
      setCreatingProduct(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editing ? "Editar modificador" : "Nuevo modificador"}
      onCancel={onCancel}
      onOk={handleOk}
      okText={editing ? "Guardar" : "Crear"}
      destroyOnClose
    >
      {wizard && (
        <Steps
          size="small"
          current={wizard.current}
          items={wizard.steps}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          modifierGroupId: groupId,
          priceDelta: 0,
          isEnabled: true,
        }}
      >
        <Form.Item
          label="Grupo de modificadores"
          name="modifierGroupId"
          rules={[{ required: true, message: "Elige un grupo" }]}
        >
          <Select
            placeholder="Elige un grupo de modificadores"
            options={[
              ...modifierGroups.map((g) => ({
                value: g.id,
                label: `${g.name} (${g.code})`,
              })),
              ...(groupId && !modifierGroups.some((g) => g.id === groupId)
                ? [
                    {
                      value: groupId,
                      label: groupName
                        ? `${groupName} (#${groupId})`
                        : `#${groupId}`,
                    },
                  ]
                : []),
            ]}
            disabled={!!editing}
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="inline-flex items-center gap-2">
              Modificador (obligatorio)
              <Tooltip title="Se guarda internamente como producto para poder reutilizarlo en varios productos (ej: ‘Hawaiana’, ‘Americana’).">
                <InfoCircleOutlined />
              </Tooltip>
            </span>
          }
          name="modifierId"
          rules={[{ required: true, message: "Elige una opción" }]}
          normalize={(v) => (v === null ? null : Number(v))}
          extra="Tip: si no existe el modificador, créalo aquí y quedará disponible para futuros productos."
        >
          <Select
            placeholder="Buscar modificador…"
            showSearch
            filterOption={(input, option) => {
              const label = String(option?.label ?? "");
              const code = String((option as any)?.code ?? "");
              return `${label} ${code}`.toLowerCase().includes(input.toLowerCase());
            }}
            options={filteredProducts.map((p) => ({
              value: p.id,
              label: p.name,
              code: p.code,
            }))}
            getPopupContainer={(trigger) => trigger.parentElement!}
          />
        </Form.Item>

        <div className="flex justify-end -mt-2 mb-4">
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setQuickOpen(true)}
          >
            Crear modificador nuevo
          </Button>
        </div>

        <Form.Item
          label="Extra por modificador (se suma a la cuenta)"
          name="priceDelta"
          rules={[{ required: true, message: "Indica el monto del extra" }]}
          extra="Este monto se agrega al total cada vez que el mesero selecciona este modificador. Ej: $15 x 2 = $30."
        >
          <InputNumber min={0} step={0.01} addonBefore="$" className="w-full" />
        </Form.Item>

        <Form.Item label="¿Activo?" name="isEnabled" valuePropName="checked">
          <Switch />
        </Form.Item>

        {/* Resumen */}
        <Card size="small">
          <Space direction="vertical" size="small">
            <div>
              <Text strong>Modificador: </Text>
              {(() => {
                const p = products.find((x) => x.id === watchedModifierId);
                return p ? p.name : "—";
              })()}
            </div>
            <div>
              <Text strong>Extra: </Text>$
              {Number(watchedPriceDelta ?? 0).toFixed(2)}
            </div>
            <div>
              <Text strong>Estado: </Text>
              {watchedEnabled ? "Activo" : "Off"}
            </div>
          </Space>
        </Card>
      </Form>
      <Modal
        open={quickOpen}
        title="Crear modificador rápido"
        onCancel={() => setQuickOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="Nombre del modificador"
            value={qpName}
            onChange={(e) => setQpName(e.target.value)}
            autoFocus
          />

          <InputNumber
            addonBefore="$"
            placeholder="Precio con IVA"
            value={qpPriceGross}
            min={0}
            step={0.01}
            onChange={(v) => setQpPriceGross(v ?? 0)}
            style={{ width: "100%" }}
          />

          <Select
            placeholder="Área de impresión"
            value={printArea}
            onChange={setPrintArea}
            options={areasCat.map((a) => ({ value: a.id, label: a.name }))}
            showSearch
            allowClear
            optionFilterProp="label"
            getPopupContainer={(trigger) => trigger.parentElement!}
          />

          <Button
            type="primary"
            loading={creatingProduct}
            onClick={async () => {
              await createQuickProduct();
              // si se creó OK, cerramos el modal (createQuickProduct ya selecciona modifierId)
              setQuickOpen(false);
            }}
          >
            Crear modificador y usar
          </Button>

          <Text type="secondary">
            El backend calculará el precio neto/base desde el bruto (priceGross)
            y el IVA.
          </Text>
        </Space>
      </Modal>
    </Modal>
  );
}
