import { useEffect, useState } from "react";
import { Modal, Form, Input, Steps, message, Select, Spin } from "antd";
import { createArea, updateArea } from "./areasImpresion.api";

// 🔹 Estructura que viene de NPrint
type NPrintPrinter = {
  name: string;
  shared: string;
  work_offline: string;
  default: string;
  status: string;
  network: string;
  availability: string;
};

// 🔹 Área según backend (ya con campos de impresora opcionales)
export interface AreaImpresion {
  id: number;
  name: string;
  printerName?: string | null;
  printerShared?: boolean | null;
  printerWorkOffline?: boolean | null;
  printerDefault?: boolean | null;
  printerStatus?: string | null;
  printerNetwork?: boolean | null;
  printerAvailability?: string | null;
}

// 🔹 Payload que mandamos al backend
export interface AreaUpsert {
  name: string;
  printerName?: string | null;
  printerShared?: boolean | null;
  printerWorkOffline?: boolean | null;
  printerDefault?: boolean | null;
  printerStatus?: string | null;
  printerNetwork?: boolean | null;
  printerAvailability?: string | null;
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

  const [printers, setPrinters] = useState<NPrintPrinter[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  const isEditing = Boolean(initial?.id);

  // 🔸 Cargar impresoras NPrint cuando se abre el modal
  useEffect(() => {
    const fetchPrinters = async () => {
      setLoadingPrinters(true);
      try {
        const res = await fetch("https://172.27.106.19/nprint/printers");
        const data = (await res.json()) as { printers: NPrintPrinter[] };

        // Si quieres solo compartidas:
        const sharedPrinters = data.printers.filter((p) => p.shared === "TRUE");
        setPrinters(sharedPrinters.length ? sharedPrinters : data.printers);
      } catch (e) {
        console.error(e);
        message.error("No se pudieron cargar las impresoras locales");
      } finally {
        setLoadingPrinters(false);
      }
    };

    if (open) {
      fetchPrinters();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: initial?.name ?? "",
        printerName: initial?.printerName ?? null,
        printerShared: initial?.printerShared ?? null,
        printerWorkOffline: initial?.printerWorkOffline ?? null,
        printerDefault: initial?.printerDefault ?? null,
        printerStatus: initial?.printerStatus ?? null,
        printerNetwork: initial?.printerNetwork ?? null,
        printerAvailability: initial?.printerAvailability ?? null,
      });
    } else {
      form.resetFields();
    }
  }, [open, initial, form]);

  const handleFinish = async (values: AreaUpsert) => {
    setSubmitting(true);
    try {
      if (isEditing && initial?.id) {
        console.log(values);
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

  const handlePrinterChange = (printerName: string | null) => {
    if (!printerName) {
      form.setFieldsValue({
        printerName: null,
        printerShared: null,
        printerWorkOffline: null,
        printerDefault: null,
        printerStatus: null,
        printerNetwork: null,
        printerAvailability: null,
      });
      return;
    }

    const p = printers.find((pr) => pr.name === printerName);
    if (!p) return;

    form.setFieldsValue({
      printerName: p.name,
      printerShared: p.shared === "TRUE",
      printerWorkOffline: p.work_offline === "TRUE",
      printerDefault: p.default === "TRUE",
      printerStatus: p.status || null,
      printerNetwork: p.network === "TRUE",
      printerAvailability: p.availability || null,
    });
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

        <Form.Item label="Impresora local" name="printerName">
          {loadingPrinters ? (
            <Spin size="small" />
          ) : (
            <Select
              allowClear
              placeholder="Selecciona la impresora local"
              onChange={(value) =>
                handlePrinterChange((value as string) || null)
              }
              value={form.getFieldValue("printerName") || undefined}
              showSearch
              optionFilterProp="children"
            >
              {printers.map((p) => (
                <Select.Option key={p.name} value={p.name}>
                  {p.name}
                  {p.shared === "TRUE" ? " (Compartida)" : ""}
                  {p.default === "TRUE" ? " [Predeterminada]" : ""}
                </Select.Option>
              ))}
            </Select>
          )}
        </Form.Item>
        {/* Los demás campos de impresora se manejan internamente vía setFieldsValue,
            no hace falta mostrarlos visualmente */}
      </Form>
    </Modal>
  );
}
