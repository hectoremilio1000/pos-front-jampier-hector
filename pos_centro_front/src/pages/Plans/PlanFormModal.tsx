// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/components/PlanFormModal.tsx
import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Modal, Select } from "antd";

export type PlanInterval = "month" | "semiannual" | "year";

export type PlanFormValues = {
  code: string;
  name: string;
  interval: PlanInterval;
  amountPesos: number; // 👈 en pesos en el form
  currency: string;
  isActive: boolean;
};

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<PlanFormValues>;
  title: string;
  okText?: string;
  disableCode?: boolean; // para bloquear code en edición si quieres
  onCancel: () => void;
  onSubmit: (values: PlanFormValues) => Promise<void> | void;
};

const toCode = (name: string) => {
  const base = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base ? `${base}_PLAN` : "";
};

export default function PlanFormModal({
  open,
  loading,
  initialValues,
  title,
  okText = "Guardar",
  disableCode = false,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<PlanFormValues>();
  const [codeTouched, setCodeTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setCodeTouched(false);
      form.resetFields();
      form.setFieldsValue({
        interval: "month",
        currency: "MXN",
        isActive: true,
        ...initialValues,
      });
    }
  }, [open, initialValues, form]);

  // autogenerar code mientras el usuario no lo toque manualmente
  const nameW = Form.useWatch("name", form) as string | undefined;
  const codeW = Form.useWatch("code", form) as string | undefined;

  useEffect(() => {
    if (!open || codeTouched) return;
    const sug = toCode(nameW || "");
    if (sug && sug !== codeW) form.setFieldsValue({ code: sug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameW, codeTouched, open]);

  const handleOk = async () => {
    const v = await form.validateFields();
    await onSubmit({
      ...v,
      currency: (v.currency || "").toUpperCase(),
    });
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={okText}
      confirmLoading={!!loading}
      destroyOnHidden // evita warning de antd
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
          <Input placeholder="Básico Mensual" />
        </Form.Item>

        <Form.Item name="code" label="Code" rules={[{ required: true }]}>
          <Input
            placeholder="BASICO"
            disabled={disableCode}
            onFocus={() => setCodeTouched(true)}
            onChange={() => setCodeTouched(true)}
          />
        </Form.Item>

        <Form.Item
          name="interval"
          label="Intervalo"
          rules={[{ required: true }]}
          initialValue="month"
        >
          <Select
            options={[
              { value: "month", label: "Mensual" },
              { value: "semiannual", label: "Semestral" },
              { value: "year", label: "Anual" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="amountPesos"
          label="Precio (MXN / mes)"
          rules={[{ required: true, message: "Ingresa el precio en MXN" }]}
        >
          <InputNumber<number> // 👈 fuerza ValueType = number
            style={{ width: "100%" }}
            min={0}
            step={50}
            formatter={(v) =>
              v == null ? "" : `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(v) => {
              const n = Number((v ?? "").replace(/[^\d.]/g, ""));
              return Number.isNaN(n) ? 0 : n; // ahora el parser devuelve number
            }}
          />
        </Form.Item>

        <Form.Item name="currency" label="Moneda" initialValue="MXN">
          <Input placeholder="MXN" />
        </Form.Item>

        <Form.Item name="isActive" label="Activo" initialValue={true}>
          <Select
            options={[
              { value: true, label: "Sí" },
              { value: false, label: "No" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
