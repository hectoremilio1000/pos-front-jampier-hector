// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Modificadores/ModifierWizardModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Switch,
  Tooltip,
  Input,
  Divider,
  Button,
  Steps,
  Typography,
  Space,
  Card,
} from "antd";
import { InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import { nextCodeForGroup } from "@/utils/nextCode";

const { Text } = Typography;

// Helpers para localizar o crear el grupo de catálogo "Extras (MOD)"
async function ensureExtrasGroup(
  groupsCat: { id: number; name: string; code: string }[]
): Promise<{ id: number; name: string; code: string }> {
  // 1) buscar por nombre/código
  const found =
    groupsCat.find((g) => g.name.toLowerCase() === "extras") ||
    groupsCat.find((g) => g.code.toUpperCase() === "MOD");

  if (found) return found;

  // 2) crear si no existe
  const { data } = await apiOrder.post("/groups", {
    // ajusta si tu backend exige categoryId/sortOrder/isEnabled
    code: "MOD",
    name: "Extras",
    sortOrder: 999,
    isEnabled: true,
  });
  return { id: data.id, name: data.name, code: data.code };
}

export type ModifierValues = {
  modifierGroupId: number;
  modifierId: number | null; // producto (existente)
  priceDelta: number;
  isEnabled: boolean;
};

type Producto = { id: number; code: string; name: string; groupId: number };
type GrupoMod = { id: number; name: string };
type GrupoCat = { id: number; name: string; code: string }; // grupos de catálogo (productos)

export default function ModifierWizardModal({
  open,
  mode, // "create" | "edit"
  initial,
  confirmLoading,
  onCancel,
  onOk,
  excludeProductIds, // productos ya usados en el conjunto seleccionado
  onDuplicateCheck, // validación extra antes de guardar
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<ModifierValues>;
  confirmLoading?: boolean;
  onCancel: () => void;
  onOk: (values: ModifierValues) => Promise<void> | void;
  excludeProductIds?: number[];
  onDuplicateCheck?: (v: ModifierValues) => string | null;
}) {
  const [form] = Form.useForm<ModifierValues>();
  const [step, setStep] = useState(0);

  // catálogos
  const [groupsMod, setGroupsMod] = useState<GrupoMod[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [groupsCat, setGroupsCat] = useState<GrupoCat[]>([]); // para producto rápido

  // crear conjunto inline
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCode, setNewGroupCode] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // producto rápido
  const [quickOpen, setQuickOpen] = useState(false);
  const [qpName, setQpName] = useState("");
  const [qpGroupId, setQpGroupId] = useState<number | undefined>(undefined);
  const [qpCode, setQpCode] = useState("");
  const [qpTax, setQpTax] = useState(16);
  const [qpPrice, setQpPrice] = useState(0);
  const [creatingProduct, setCreatingProduct] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [g, p, gc] = await Promise.all([
          apiOrder.get("/modifier-groups"),
          apiOrder.get("/products"),
          apiOrder.get("/groups"), // grupos de catálogo
        ]);
        const glist = Array.isArray(g.data) ? g.data : (g.data?.data ?? []);
        const plist = Array.isArray(p.data) ? p.data : (p.data?.data ?? []);
        const gcat = Array.isArray(gc.data) ? gc.data : (gc.data?.data ?? []);

        setGroupsMod(glist.map((x: any) => ({ id: x.id, name: x.name })));
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

        // defaults de wizard (número sugerido para nuevos conjuntos de modificadores)
        const next = String((glist?.length ?? 0) + 1);
        setNewGroupCode(next);
        setNewGroupName("");

        // 👉 Forzar producto rápido al grupo de catálogo "Extras (MOD)"
        const extras = await ensureExtrasGroup(
          gcat.map((x: any) => ({ id: x.id, name: x.name, code: x.code }))
        );
        const extrasId = extras.id;

        // si no estaba en el estado local, agrégalo
        if (!gcat.find((g: any) => g.id === extrasId)) {
          setGroupsCat((prev) => [...prev, extras]);
        }

        // setear por defecto el grupo "Extras (MOD)" y calcular código con su prefijo
        setQpGroupId(extrasId);
        const code = nextCodeForGroup(extras.code, plist, extrasId, 1);
        setQpCode(code);

        // si hay initial, precargar form y step
        form.setFieldsValue({
          modifierGroupId: initial?.modifierGroupId ?? undefined,
          modifierId: initial?.modifierId ?? null,
          priceDelta: initial?.priceDelta ?? 0,
          isEnabled: initial?.isEnabled ?? true,
        } as any);
        setStep(0);
      } catch {
        setGroupsMod([]);
        setProducts([]);
        setGroupsCat([]);
      }
    })();
  }, [open]); // eslint-disable-line

  // recalcular code del producto rápido si cambia grupo catálogo
  useEffect(() => {
    if (!qpGroupId) return;
    const gcat = groupsCat.find((g) => g.id === qpGroupId);
    if (!gcat) return;
    const code = nextCodeForGroup(gcat.code, products, qpGroupId, 1);
    setQpCode(code);
  }, [qpGroupId, products, groupsCat]);

  const filteredProducts = useMemo(
    () => products.filter((p) => !(excludeProductIds ?? []).includes(p.id)),
    [products, excludeProductIds]
  );

  const next = async () => {
    // validaciones por paso
    if (step === 0) {
      await form.validateFields(["modifierGroupId"]);
    }
    if (step === 1) {
      await form.validateFields(["modifierId"]);
      const vals = form.getFieldsValue(true) as ModifierValues;
      if (onDuplicateCheck) {
        const msg = onDuplicateCheck(vals);
        if (msg) {
          form.setFields([{ name: "modifierId", errors: [msg] }]);
          return;
        }
      }
    }
    if (step === 2) {
      await form.validateFields(["priceDelta"]);
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handleOk = async () => {
    try {
      // valida explícitamente lo crítico
      await form.validateFields([
        "modifierGroupId",
        "modifierId",
        "priceDelta",
      ]);
      // trae TODOS los valores (aunque el campo ya no esté montado)
      const vals = form.getFieldsValue(true) as ModifierValues;

      if (onDuplicateCheck) {
        const msg = onDuplicateCheck(vals);
        if (msg) {
          form.setFields([{ name: "modifierId", errors: [msg] }]);
          return;
        }
      }
      await onOk(vals);
      form.resetFields();
    } catch {}
  };

  // crear conjunto inline
  const handleCreateGroupInline = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return;
    try {
      setCreatingGroup(true);
      const { data } = await apiOrder.post("/modifier-groups", {
        name: newGroupName.trim(),
        code: newGroupCode.trim(),
      });
      const nuevo = { id: data.id, name: data.name } as GrupoMod;
      setGroupsMod((prev) => [...prev, nuevo]);
      form.setFieldsValue({ modifierGroupId: nuevo.id });
      // siguiente código sugerido
      const next = String(groupsMod.length + 2);
      setNewGroupName("");
      setNewGroupCode(next);
    } finally {
      setCreatingGroup(false);
    }
  };

  // crear producto rápido
  const handleCreateQuickProduct = async () => {
    if (!qpName.trim() || !qpCode.trim()) return;
    try {
      setCreatingProduct(true);

      // asegurar "Extras (MOD)" por si el usuario cambió manualmente
      let extras = groupsCat.find(
        (g) =>
          g.name.toLowerCase() === "extras" || g.code.toUpperCase() === "MOD"
      );
      if (!extras) {
        extras = await ensureExtrasGroup(groupsCat);
        setGroupsCat((prev) => [...prev, extras]);
      }
      const extrasId = extras.id;

      // re-calcular code con "Extras"
      const code = nextCodeForGroup(extras.code, products, extrasId, 1);
      setQpCode(code);

      const { data: prod } = await apiOrder.post("/products", {
        name: qpName.trim(),
        code,
        groupId: extrasId,
        subgroupId: null,
        printArea: null,
        price: qpPrice, // usualmente 0
        taxRate: qpTax, // 16
        enabled: true,
      });

      const nuevo: Producto = {
        id: prod.id,
        code: prod.code,
        name: prod.name,
        groupId: prod.groupId,
      };
      setProducts((prev) => [...prev, nuevo]);
      form.setFieldsValue({ modifierId: nuevo.id });

      // cerrar bloque rápido y preparar siguiente code
      setQuickOpen(false);
      setQpName("");
      setQpPrice(0);
      setQpTax(16);
      const next = nextCodeForGroup(
        extras.code,
        [...products, nuevo],
        extrasId,
        1
      );
      setQpCode(next);
      setQpGroupId(extrasId);
    } finally {
      setCreatingProduct(false);
    }
  };

  // contenido por paso
  const Step0 = (
    <Form.Item
      label={
        <>
          Conjunto
          <Tooltip title="Grupo de extras donde estará este modificador. Ej.: Toppings, Salsas.">
            <InfoCircleOutlined />
          </Tooltip>
        </>
      }
      name="modifierGroupId"
      rules={[{ required: true, message: "Elige o crea una conjunto" }]}
    >
      <Select
        placeholder="Elige una Conjunto"
        options={groupsMod.map((g) => ({ value: g.id, label: g.name }))}
        showSearch
        optionFilterProp="label"
        dropdownRender={(menu) => (
          <div>
            {menu}
            <Divider style={{ margin: "8px 0" }} />
            <div style={{ padding: 8, display: "grid", gap: 8 }}>
              <Text type="secondary">Crear conjunto rápida</Text>
              <Input
                placeholder="Nombre del conjunto"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Input
                placeholder="Código"
                value={newGroupCode}
                onChange={(e) => setNewGroupCode(e.target.value)}
              />
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                loading={creatingGroup}
                onClick={handleCreateGroupInline}
              >
                Crear conjunto
              </Button>
            </div>
          </div>
        )}
      />
    </Form.Item>
  );

  const Step1 = (
    <>
      <Form.Item
        label={
          <>
            Producto (modificador){" "}
            <Tooltip title="Ingrediente que se cobrará como extra. No se muestran los ya usados en el conjunto.">
              <InfoCircleOutlined />
            </Tooltip>
          </>
        }
        name="modifierId"
        rules={[{ required: true, message: "Elige o crea un producto" }]}
      >
        <Select
          placeholder="Elige un producto"
          showSearch
          optionFilterProp="label"
          options={filteredProducts.map((p) => ({
            value: p.id,
            label: `${p.code} ${p.name}`,
          }))}
          dropdownRender={(menu) => (
            <div>
              {menu}
              <Divider style={{ margin: "8px 0" }} />
              {/* Bloque de producto rápido */}
              <div style={{ padding: 8 }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setQuickOpen((v) => !v)}
                  >
                    {quickOpen
                      ? "Ocultar producto rápido"
                      : "Crear producto rápido"}
                  </Button>
                  {quickOpen && (
                    <Card size="small">
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Input
                          placeholder="Nombre del producto"
                          value={qpName}
                          onChange={(e) => setQpName(e.target.value)}
                        />
                        <Select
                          placeholder="Grupo (catálogo)"
                          value={qpGroupId}
                          onChange={(v) => setQpGroupId(v)}
                          options={groupsCat.map((g) => ({
                            value: g.id,
                            label: g.name,
                          }))}
                          showSearch
                          optionFilterProp="label"
                        />
                        <Input
                          placeholder="Código"
                          value={qpCode}
                          onChange={(e) => setQpCode(e.target.value)}
                        />
                        <Space.Compact>
                          <InputNumber
                            addonBefore="$"
                            placeholder="Precio"
                            value={qpPrice}
                            min={0}
                            step={0.01}
                            onChange={(v) => setQpPrice(v ?? 0)}
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
                          onClick={handleCreateQuickProduct}
                        >
                          Crear y usar
                        </Button>
                      </Space>
                    </Card>
                  )}
                </Space>
              </div>
            </div>
          )}
        />
      </Form.Item>
    </>
  );

  const Step2 = (
    <>
      <Form.Item
        label={
          <>
            Extra{" "}
            <Tooltip title="Monto que se suma al precio del plato.">
              <InfoCircleOutlined />
            </Tooltip>
          </>
        }
        name="priceDelta"
        rules={[{ required: true, message: "Indica el monto del extra" }]}
      >
        <InputNumber min={0} step={0.01} className="w-full" addonBefore="$" />
      </Form.Item>

      <Form.Item label="¿Activo?" name="isEnabled" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );

  const vals = form.getFieldsValue() as Partial<ModifierValues>;
  const resumen = (
    <Card size="small">
      <Space direction="vertical" size="small">
        <div>
          <Text strong>Conjunto:</Text>{" "}
          {groupsMod.find((g) => g.id === vals.modifierGroupId)?.name ?? "—"}
        </div>
        <div>
          <Text strong>Producto:</Text>{" "}
          {products.find((p) => p.id === vals.modifierId)?.name ?? "—"}
        </div>
        <div>
          <Text strong>Extra:</Text> ${Number(vals.priceDelta ?? 0).toFixed(2)}
        </div>
        <div>
          <Text strong>Estado:</Text>{" "}
          {(vals.isEnabled ?? true) ? "Activo" : "Off"}
        </div>
      </Space>
    </Card>
  );

  return (
    <Modal
      open={open}
      title="Nuevo modificador"
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      footer={
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button
            onClick={() => {
              form.resetFields();
              onCancel();
            }}
          >
            Cancelar
          </Button>
          <Space>
            {step > 0 && <Button onClick={prev}>Atrás</Button>}
            {step < 3 && (
              <Button type="primary" onClick={next}>
                Siguiente
              </Button>
            )}
            {step === 3 && (
              <Button
                type="primary"
                loading={!!confirmLoading}
                onClick={handleOk}
              >
                {mode === "create" ? "Crear" : "Guardar cambios"}
              </Button>
            )}
          </Space>
        </Space>
      }
      confirmLoading={false}
      destroyOnClose
    >
      <Steps
        size="small"
        current={step}
        items={[
          { title: "Conjunto" },
          { title: "Producto" },
          { title: "Extra" },
          { title: "Revisión" },
        ]}
        style={{ marginBottom: 16 }}
      />

      <Form<ModifierValues> form={form} layout="vertical" preserve>
        {step === 0 && Step0}
        {step === 1 && Step1}
        {step === 2 && Step2}
        {step === 3 && resumen}
      </Form>
    </Modal>
  );
}
