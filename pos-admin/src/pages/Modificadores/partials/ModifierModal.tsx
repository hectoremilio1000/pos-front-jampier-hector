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
  Typography,
  message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

const { Text } = Typography;

type Producto = { id: number; code: string; name: string; groupId: number };
type GrupoCat = { id: number; name: string; code: string };
type AreasCat = { id: number; name: string; code: string };

export default function ModifierModal({
  open,
  editing,
  groupId,
  existingModifierIds,
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
  existingModifierIds: number[];
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form] = Form.useForm<{
    modifierGroupId: number;
    modifierId: number | null;
    priceDelta: number;
    isEnabled: boolean;
  }>();

  const [products, setProducts] = useState<Producto[]>([]);
  const [groupsCat, setGroupsCat] = useState<GrupoCat[]>([]);
  const [areasCat, setAreasCat] = useState<AreasCat[]>([]);

  // crear producto rápido
  const [quickOpen, setQuickOpen] = useState(false);
  const [qpName, setQpName] = useState("");
  const [qpGroupId, setQpGroupId] = useState<number | undefined>(undefined);
  const [printArea, setPrintArea] = useState<number | undefined>(undefined);
  const [qpCode, setQpCode] = useState("");
  const [qpTax, setQpTax] = useState(16);
  const [qpPriceGross, setQpPriceGross] = useState(0);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // cargar catálogos al abrir
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [p, gc, ac] = await Promise.all([
          apiOrder.get("/products"),
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

  // genera siguiente código simple por prefijo de grupo (fallback)
  const nextCodeForGroup = (
    prefix: string,
    list: Producto[],
    groupId: number
  ): string => {
    const numbers = list
      .filter((p) => p.groupId === groupId && p.code?.startsWith(prefix))
      .map((p) => {
        const tail = String(p.code).replace(prefix, "").trim();
        const n = parseInt(tail, 10);
        return isNaN(n) ? 0 : n;
      });
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `${prefix}${String(next).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!quickOpen) return;
    // set defaults al abrir bloque rápido
    const g = groupsCat[0];
    if (g) {
      setQpGroupId((prev) => prev ?? g.id);
      if (!qpCode) setQpCode(nextCodeForGroup(g.code, products, g.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickOpen]);

  useEffect(() => {
    if (!qpGroupId) return;
    const g = groupsCat.find((x) => x.id === qpGroupId);
    if (!g) return;
    setQpCode(nextCodeForGroup(g.code, products, qpGroupId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qpGroupId, products, groupsCat]);

  const createQuickProduct = async () => {
    if (!qpName.trim() || !qpCode.trim() || !qpGroupId) {
      message.warning("Completa nombre, código y grupo");
      return;
    }
    if (!printArea) {
      message.warning("Debes seleccionar una area de impresion");
      return;
    }
    try {
      setCreatingProduct(true);
      // Tu backend prioriza priceGross si llega
      const { data: prod } = await apiOrder.post("/products", {
        name: qpName.trim(),
        code: qpCode.trim(),
        groupId: qpGroupId,
        subgroupId: null,
        printArea: printArea,
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

      // prepara siguiente
      const g = groupsCat.find((x) => x.id === qpGroupId)!;
      setQpCode(nextCodeForGroup(g.code, [...products, nuevo], qpGroupId));
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
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          modifierGroupId: groupId,
          priceDelta: 0,
          isEnabled: true,
        }}
      >
        <Form.Item
          label="Grupo"
          name="modifierGroupId"
          rules={[{ required: true, message: "Elige un grupo" }]}
        >
          <Select
            placeholder="Elige un grupo"
            // cargamos los grupos al abrir la página (vienen del padre vía /modifier-groups)
            // Para no duplicar, el padre fija el groupId y aquí solo permitimos cambiar si llega vacío.
            options={
              groupId ? [{ value: groupId, label: `#${groupId}` }] : [] // si quieres listar grupos aquí, tráelos como prop
            }
            disabled={!!groupId}
          />
        </Form.Item>

        <Form.Item
          label="Producto (modificador)"
          name="modifierId"
          rules={[{ required: true, message: "Elige un producto" }]}
          normalize={(v) => (v === null ? null : Number(v))}
        >
          <Select
            placeholder="Buscar producto"
            showSearch
            optionFilterProp="label"
            options={filteredProducts.map((p) => ({
              value: p.id,
              label: `${p.code} ${p.name}`,
            }))}
            // 👇 evita glitches de popup en modales
            getPopupContainer={(trigger) => trigger.parentElement!}
          />
        </Form.Item>

        <div className="flex justify-end -mt-2 mb-4">
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setQuickOpen(true)}
          >
            Crear producto rápido
          </Button>
        </div>

        <Form.Item
          label="Extra (monto a sumar)"
          name="priceDelta"
          rules={[{ required: true, message: "Indica el monto del extra" }]}
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
              <Text strong>Producto: </Text>
              {(() => {
                const v = form.getFieldValue("modifierId");
                const p = products.find((x) => x.id === v);
                return p ? `${p.code} ${p.name}` : "—";
              })()}
            </div>
            <div>
              <Text strong>Extra: </Text>$
              {Number(form.getFieldValue("priceDelta") ?? 0).toFixed(2)}
            </div>
            <div>
              <Text strong>Estado: </Text>
              {form.getFieldValue("isEnabled") ? "Activo" : "Off"}
            </div>
          </Space>
        </Card>
      </Form>
      <Modal
        open={quickOpen}
        title="Crear producto rápido"
        onCancel={() => setQuickOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="Nombre"
            value={qpName}
            onChange={(e) => setQpName(e.target.value)}
            autoFocus
          />

          <Select
            placeholder="Grupo de catálogo"
            value={qpGroupId}
            onChange={setQpGroupId}
            options={groupsCat.map((g) => ({ value: g.id, label: g.name }))}
            showSearch
            optionFilterProp="label"
            getPopupContainer={(trigger) => trigger.parentElement!}
          />

          <Select
            placeholder="Área de impresión"
            value={printArea}
            onChange={setPrintArea}
            options={areasCat.map((a) => ({ value: a.id, label: a.name }))}
            showSearch
            optionFilterProp="label"
            getPopupContainer={(trigger) => trigger.parentElement!}
          />

          <Input
            placeholder="Código"
            value={qpCode}
            onChange={(e) => setQpCode(e.target.value)}
          />

          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              addonBefore="$"
              placeholder="Precio con IVA"
              value={qpPriceGross}
              min={0}
              step={0.01}
              onChange={(v) => setQpPriceGross(v ?? 0)}
              style={{ width: "60%" }}
            />
            <InputNumber
              addonAfter="%"
              placeholder="IVA"
              value={qpTax}
              min={0}
              step={0.5}
              onChange={(v) => setQpTax(v ?? 16)}
              style={{ width: "40%" }}
            />
          </Space.Compact>

          <Button
            type="primary"
            loading={creatingProduct}
            onClick={async () => {
              await createQuickProduct();
              // si se creó OK, cerramos el modal (createQuickProduct ya selecciona modifierId)
              setQuickOpen(false);
            }}
          >
            Crear producto y usar
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
