// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/Runs/PurchaseRunFormModal.tsx
import { Modal, Form, Input, DatePicker, Select, message } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { createPurchaseRun, PurchaseRunRow } from "@/lib/api_inventory";
import { buildRunNotes, RunTypeKey } from "../purchaseUi";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (run: PurchaseRunRow) => void;
  restaurantId: number;
};

export default function PurchaseRunFormModal({ open, onClose, onSaved, restaurantId }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const runType = Form.useWatch("runType", form) as RunTypeKey | undefined;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: "",
      runAt: dayjs(),
      runType: "comisariato",
      notes: "",
    });
  }, [open, form]);

  const typeHelp =
    runType === "ruta"
      ? "Se priorizan órdenes a proveedores; lo de almacén queda como secundario."
      : "Checklist interno. Podrás convertir faltantes en compras a proveedor.";

  const titlePlaceholder =
    runType === "ruta" ? "Ej. Ruta proveedores martes" : "Ej. Compras lunes (comisariato)";

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const created = await createPurchaseRun(restaurantId, {
        title: v.title || null,
        runAt: v.runAt ? v.runAt.toISOString() : undefined,
        notes: buildRunNotes(v.notes, v.runType as RunTypeKey),
        createdBy: "admin",
      });
      message.success("Viaje creado");
      onSaved(created);
    } catch (e: any) {
      message.error(e?.message ?? "Error creando viaje");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nuevo viaje de compras"
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText="Crear viaje"
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Título" name="title" rules={[{ required: true }]}>
          <Input placeholder={titlePlaceholder} />
        </Form.Item>

        <Form.Item
          label="Tipo de viaje"
          name="runType"
          rules={[{ required: true }]}
          extra={<span style={{ color: "rgba(0,0,0,0.55)" }}>{typeHelp}</span>}
        >
          <Select
            options={[
              { label: "Comisariato/almacén", value: "comisariato" },
              { label: "Ruta de proveedores/tiendas", value: "ruta" },
            ]}
          />
        </Form.Item>

        <Form.Item label="Fecha/Hora del viaje" name="runAt" rules={[{ required: true }]}>
          <DatePicker showTime={{ format: "HH:mm" }} format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Notas" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
