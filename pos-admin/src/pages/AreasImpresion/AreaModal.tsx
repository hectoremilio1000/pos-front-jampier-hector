import { useEffect, useState } from "react";
import { Modal, Form, Input, InputNumber, Steps, message } from "antd";
import { createArea, updateArea } from "./areasImpresion.api";

export interface AreaImpresion {
  id: number;
  name: string;
  sortOrder: number;
}

export interface AreaUpsert {
  name: string;
  sortOrder: number;
}

export default function AreaModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: Partial<AreaImpresion>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<AreaUpsert>();
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(initial?.id);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: initial?.name ?? "",
        sortOrder: initial?.sortOrder ?? 1,
      });
    } else {
      form.resetFields();
    }
  }, [open, initial, form]);

  const handleFinish = async (values: AreaUpsert) => {
    setSubmitting(true);
    try {
      if (isEditing && initial?.id) {
        await updateArea(initial.id, values);
        message.success("Área actualizada");
      } else {
        await createArea(values);
        message.success("Área creada");
      }
      onSaved();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Error al guardar área");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? "Editar área" : "Nueva área"}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={
        submitting
          ? isEditing
            ? "Actualizando..."
            : "Creando..."
          : isEditing
            ? "Actualizar"
            : "Crear"
      }
      okButtonProps={{ loading: submitting }}
      destroyOnClose
    >
      {/* Conserva el look de wizard (consistente con StationWizard) */}
      <Steps
        current={0}
        size="small"
        items={[{ title: "Datos" }]}
        className="mb-4"
      />

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        <Form.Item
          label="Nombre del área"
          name="name"
          rules={[{ required: true, message: "El nombre es requerido" }]}
        >
          <Input placeholder="Ej. Cocina, Barra, Repostería" maxLength={80} />
        </Form.Item>

        <Form.Item
          label="Orden"
          name="sortOrder"
          rules={[{ required: true, message: "El orden es requerido" }]}
        >
          <InputNumber min={1} step={1} className="w-full" placeholder="1" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
