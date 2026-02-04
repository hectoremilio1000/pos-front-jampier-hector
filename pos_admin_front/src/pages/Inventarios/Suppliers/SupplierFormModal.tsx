import { Modal, Form, Input, Select, Switch, message, Space, Button, InputNumber, Divider } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { SupplierRow, SupplierTypeRow } from "@/lib/api_inventory";
import { upsertSupplier } from "@/lib/api_inventory";
import SupplierTypeCreateModal from "./SupplierTypeCreateModal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (supplier?: SupplierRow) => void;
  restaurantId: number;
  supplier: SupplierRow | null;
  supplierTypes: SupplierTypeRow[];
  onRefreshTypes: () => Promise<void>;
};

function slugUpper(input: string) {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

function makeSupplierCodeFromName(name: string) {
  const cleaned = slugUpper(name);
  if (!cleaned) return "";
  // primera palabra recortada a 12 (para proveedores suele ser mejor largo)
  const first = cleaned.split(" ").filter(Boolean)[0] ?? "";
  return first.slice(0, 12);
}

export default function SupplierFormModal({
  open,
  onClose,
  onSaved,
  restaurantId,
  supplier,
  supplierTypes,
  onRefreshTypes,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  useEffect(() => {
    if (!open) setTypeModalOpen(false);
  }, [open]);

  const typeOptions = useMemo(
    () =>
      supplierTypes.map((t) => ({
        label: `${t.code} — ${t.description ?? ""}`.trim(),
        value: t.id,
      })),
    [supplierTypes]
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      code: (supplier as any)?.code ?? "",
      name: supplier?.name ?? "",
      supplierTypeId: supplier?.supplierTypeId ?? (supplier as any)?.type?.id ?? null,
      taxName: supplier?.taxName ?? null,
      taxId: supplier?.taxId ?? null,
      address: supplier?.address ?? null,
      postalCode: supplier?.postalCode ?? null,
      phone: supplier?.phone ?? null,
      whatsapp: supplier?.whatsapp ?? null,
      email: supplier?.email ?? null,
      creditDays: supplier?.creditDays ?? null,
      bankName: supplier?.bankName ?? null,
      bankAccount: supplier?.bankAccount ?? null,
      bankClabe: supplier?.bankClabe ?? null,
      autoDecrementEnabled: supplier?.autoDecrementEnabled ?? true,
      isDefault: supplier?.isDefault ?? false,
      isActive: supplier?.isActive !== false,
    });
  }, [open, supplier, form]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const codeValue =
        v.code && String(v.code).trim()
          ? String(v.code).trim().toUpperCase()
          : makeSupplierCodeFromName(String(v.name ?? ""));

      const saved = await upsertSupplier(restaurantId, {
        id: supplier?.id,
        code: codeValue,
        name: String(v.name).trim(),
        supplierTypeId: v.supplierTypeId ?? null,
        taxName: v.taxName ?? null,
        taxId: v.taxId ?? null,
        address: v.address ?? null,
        postalCode: v.postalCode ?? null,
        phone: v.phone ?? null,
        whatsapp: v.whatsapp ?? null,
        email: v.email ?? null,
        creditDays: v.creditDays ?? null,
        bankName: v.bankName ?? null,
        bankAccount: v.bankAccount ?? null,
        bankClabe: v.bankClabe ?? null,
        autoDecrementEnabled: v.autoDecrementEnabled ?? true,
        isDefault: v.isDefault ?? false,
        isActive: v.isActive,
      });

      message.success("Proveedor guardado");
      onSaved(saved);
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando proveedor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={supplier?.id ? "Editar proveedor" : "Nuevo proveedor"}
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText="Guardar"
    >
      <Form
        layout="vertical"
        form={form}
        onValuesChange={(changed, all) => {
          if ("name" in changed) {
            const nextCode = makeSupplierCodeFromName(String(all.name ?? ""));
            form.setFieldsValue({ code: nextCode });
          }
        }}
      >
        <Form.Item label="Nombre" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="code" hidden>
          <Input />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }}>Contacto y fiscales</Divider>
        <Form.Item label="Razón social" name="taxName">
          <Input placeholder="Ej: SUMINISTROS S.A. DE C.V." />
        </Form.Item>
        <Form.Item label="RFC / Tax ID" name="taxId">
          <Input placeholder="RFC" />
        </Form.Item>
        <Form.Item label="Dirección" name="address">
          <Input placeholder="Calle, número, colonia, ciudad" />
        </Form.Item>
        <Form.Item label="Código postal" name="postalCode">
          <Input placeholder="CP" />
        </Form.Item>
        <Form.Item label="Teléfono" name="phone">
          <Input placeholder="Teléfono" />
        </Form.Item>
        <Form.Item label="WhatsApp" name="whatsapp">
          <Input placeholder="WhatsApp" />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: "email", message: "Email inválido" }]}>
          <Input placeholder="correo@ejemplo.com" />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }}>Crédito y pagos</Divider>
        <Form.Item label="Días de crédito" name="creditDays">
          <InputNumber min={0} style={{ width: "100%" }} placeholder="Ej: 15" />
        </Form.Item>
        <Form.Item label="Banco" name="bankName">
          <Input placeholder="Nombre del banco" />
        </Form.Item>
        <Form.Item label="Cuenta" name="bankAccount">
          <Input placeholder="Número de cuenta" />
        </Form.Item>
        <Form.Item label="CLABE" name="bankClabe">
          <Input placeholder="CLABE" />
        </Form.Item>

        <Divider style={{ margin: "12px 0" }}>Configuración</Divider>
        <Form.Item label="Tipo">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item name="supplierTypeId" noStyle>
              <Select allowClear options={typeOptions} placeholder="(sin tipo)" />
            </Form.Item>

            <Button htmlType="button" type="default" onClick={() => setTypeModalOpen(true)}>
              + Tipo
            </Button>
          </Space.Compact>
        </Form.Item>

        <Space style={{ display: "flex", justifyContent: "space-between" }}>
          <Form.Item label="Auto-decrement habilitado" name="autoDecrementEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Default" name="isDefault" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Activo" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>

      </Form>

      <SupplierTypeCreateModal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        onCreated={async () => {
          await onRefreshTypes();
        }}
      />
    </Modal>
  );
}
