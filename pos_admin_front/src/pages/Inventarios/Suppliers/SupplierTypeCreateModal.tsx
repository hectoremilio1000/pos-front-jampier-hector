import { Modal, Form, Input, message } from "antd";
import { useEffect, useState } from "react";
import { createSupplierType } from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
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

// ✅ estable: usa primera palabra recortada a 5
function makeCodeFromName(name: string) {
  const cleaned = slugUpper(name);
  if (!cleaned) return "";
  const firstWord = cleaned.split(" ").filter(Boolean)[0] ?? "";
  return firstWord.slice(0, 5);
}

export default function SupplierTypeCreateModal({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // ✅ para no pisar el code si el usuario lo editó manualmente
  const [codeTouched, setCodeTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setCodeTouched(false);
  }, [open, form]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await createSupplierType({
        code: String(v.code).trim().toUpperCase(),
        name: String(v.name).trim(),
        description: v.description ? String(v.description).trim() : null,
      });

      message.success("Tipo creado");
      onClose();
      await onCreated();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")) {
        message.error("Ese código ya existe. Ajusta el código.");
      } else {
        message.error(e?.message ?? "Error creando tipo");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nuevo tipo de proveedor"
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={saving}
      okText="Crear"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={(changed, all) => {
          // ✅ cuando cambia el nombre y el usuario no tocó code, generamos code
          if ("name" in changed && !codeTouched) {
            const nextCode = makeCodeFromName(String(all.name ?? ""));
            form.setFieldsValue({ code: nextCode });
          }
        }}
      >
        <Form.Item label="Nombre" name="name" rules={[{ required: true }]}>
          <Input placeholder="Compras / Bebidas / Carnes..." />
        </Form.Item>

        <Form.Item
          label="Código"
          name="code"
          rules={[
            { required: true, message: "Código requerido" },
            { max: 5, message: "Máx 5 caracteres" },
          ]}
          extra="Se genera automáticamente; si lo editas, ya no se sobreescribe."
        >
          <Input
            maxLength={5}
            onChange={() => {
              // ✅ marca que el usuario ya lo tocó
              if (!codeTouched) setCodeTouched(true);
            }}
          />
        </Form.Item>

        <Form.Item label="Descripción (opcional)" name="description">
          <Input placeholder="Opcional" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
