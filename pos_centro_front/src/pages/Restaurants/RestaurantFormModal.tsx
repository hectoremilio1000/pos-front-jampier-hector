// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/components/RestaurantFormModal.tsx
import { useEffect, useState } from "react";
import { Form, Input, Modal, Select } from "antd";

export type RestaurantFormValues = {
  name: string;
  slug?: string;
  legalName?: string;
  localBaseUrl?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  plan?: string;
  status?: "active" | "inactive";
  logoUrl?: string;
};

const toSlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Mexico_City", label: "America/Mexico_City (CDMX)" },
  { value: "America/Monterrey", label: "America/Monterrey" },
  { value: "America/Mazatlan", label: "America/Mazatlan" },
  { value: "America/Tijuana", label: "America/Tijuana" },
  { value: "America/Bogota", label: "America/Bogota" },
  { value: "America/Lima", label: "America/Lima" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "UTC", label: "UTC" },
];

const CURRENCIES: { value: string; label: string }[] = [
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "USD", label: "USD — Dólar estadounidense" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "COP", label: "COP — Peso colombiano" },
  { value: "PEN", label: "PEN — Sol peruano" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "BRL", label: "BRL — Real brasileño" },
];

type Props = {
  open: boolean;
  loading?: boolean;
  initialValues?: Partial<RestaurantFormValues>;
  title: string;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: RestaurantFormValues) => Promise<void> | void;
};

export default function RestaurantFormModal({
  open,
  loading,
  initialValues,
  title,
  okText = "Guardar",
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<RestaurantFormValues>();
  const [slugTouched, setSlugTouched] = useState(false);

  // Set defaults al abrir
  useEffect(() => {
    console.log(form.getFieldsValue());
    if (open) {
      setSlugTouched(false);
      form.resetFields();
      form.setFieldsValue({
        plan: "free",
        status: "active",
        timezone: "America/Mexico_City",
        currency: "MXN",
        ...initialValues,
      });
    }
  }, [open, initialValues, form]);

  // Autogenerar slug desde name si el usuario no lo tocó
  const nameWatch = Form.useWatch("name", form);
  const slugWatch = Form.useWatch("slug", form);
  useEffect(() => {
    if (!slugTouched) {
      const suggested = toSlug(nameWatch || "");
      const current = slugWatch || "";
      if (suggested && suggested !== current) {
        form.setFieldsValue({ slug: suggested });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameWatch, slugTouched]);

  const handleOk = async () => {
    const values = await form.validateFields();
    await onSubmit({
      ...values,
      slug: values.slug ? toSlug(values.slug) : undefined,
    });
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      okText={okText}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
          <Input placeholder="Ej. Cantina La Llorona" />
        </Form.Item>

        <Form.Item
          name="slug"
          label="Slug"
          tooltip="Editable; se sugiere desde el nombre"
          rules={[
            {
              pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
              message: "Usa minúsculas, números y guiones (kebab-case)",
            },
          ]}
        >
          <Input
            placeholder="ej. la-llorona"
            onChange={() => setSlugTouched(true)}
            onFocus={() => setSlugTouched(true)}
          />
        </Form.Item>

        <Form.Item name="legalName" label="Razón social">
          <Input placeholder="Ej. Cantina La Llorona S.A. de C.V." />
        </Form.Item>

        <Form.Item name="addressLine1" label="Dirección">
          <Input placeholder="Calle y número" />
        </Form.Item>

        <Form.Item name="city" label="Ciudad">
          <Input placeholder="Ej. Cuauhtémoc" />
        </Form.Item>

        <Form.Item name="state" label="Estado">
          <Input placeholder="Ej. Ciudad de México" />
        </Form.Item>
        <Form.Item name="localBaseUrl" label="URL base">
          <Input placeholder="URL local del restaurante: https://192.168.100.xx" />
        </Form.Item>

        <Form.Item
          name="phone"
          label="Teléfono"
          rules={[
            {
              pattern: /^[+0-9()\-.\s]{6,}$/,
              message: "Teléfono inválido",
            },
          ]}
        >
          <Input placeholder="Ej. +52 55 1234 5678" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Correo"
          rules={[{ type: "email", message: "Correo inválido" }]}
        >
          <Input placeholder="reservas@ejemplo.com" />
        </Form.Item>

        <Form.Item
          name="timezone"
          label="Zona horaria"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            placeholder="Ej. America/Mexico_City"
            options={TIMEZONES}
            optionFilterProp="label"
            allowClear
          />
        </Form.Item>

        <Form.Item name="currency" label="Moneda" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Ej. MXN"
            options={CURRENCIES}
            optionFilterProp="label"
            allowClear
          />
        </Form.Item>

        <Form.Item name="plan" label="Plan" initialValue="free">
          <Select
            options={[
              { value: "free", label: "Gratis" },
              { value: "basic", label: "Básico" },
              { value: "pro", label: "Pro" },
            ]}
          />
        </Form.Item>

        <Form.Item name="status" label="Estado" initialValue="active">
          <Select
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
        </Form.Item>

        <Form.Item name="logoUrl" label="Logo (URL)">
          <Input placeholder="https://..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
