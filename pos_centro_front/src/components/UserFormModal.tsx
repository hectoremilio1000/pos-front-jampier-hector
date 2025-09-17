import { useEffect } from "react";
import { Form, Input, Modal, Select } from "antd";

export type RoleOption = { value: string; label: string }; // code,label
export type RestaurantOption = { value: number; label: string }; // id,name

export type UserFormValues = {
  fullName: string;
  email: string;
  password?: string;
  roleCode: string;
  restaurantId?: number; // <- ahora opcional
  status: "active" | "inactive";
};

type Props = {
  open: boolean;
  loading?: boolean;
  title: string;
  okText?: string;
  isEditing?: boolean;

  initialValues?: Partial<UserFormValues>;
  roleOptions: RoleOption[];
  restaurantOptions: RestaurantOption[];

  onCancel: () => void;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
};

export default function UserFormModal(props: Props) {
  const {
    open,
    loading,
    title,
    okText = "Guardar",
    isEditing = false,
    initialValues,
    roleOptions,
    restaurantOptions,
    onCancel,
    onSubmit,
  } = props;

  const [form] = Form.useForm<UserFormValues>();
  const roleCode = Form.useWatch("roleCode", form);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ status: "active", ...initialValues });
    }
  }, [open, initialValues, form]);

  useEffect(() => {
    if (roleCode === "superadmin")
      form.setFieldValue("restaurantId", undefined);
  }, [roleCode, form]);

  const handleOk = async () => {
    const v = await form.validateFields();
    if (isEditing && !v.password) delete v.password;
    // Si es superadmin, no enviamos restaurantId
    if (v.roleCode === "superadmin") delete v.restaurantId;
    await onSubmit(v);
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
        <Form.Item
          name="fullName"
          label="Nombre completo"
          rules={[{ required: true }]}
        >
          <Input placeholder="Ej. Super Admin Raíz" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input placeholder="correo@ejemplo.com" />
        </Form.Item>

        {!isEditing ? (
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>
        ) : (
          <Form.Item name="password" label="Nueva contraseña (opcional)">
            <Input.Password placeholder="Deja vacío para no cambiar" />
          </Form.Item>
        )}

        <Form.Item name="roleCode" label="Rol" rules={[{ required: true }]}>
          <Select options={roleOptions} placeholder="Selecciona un rol" />
        </Form.Item>

        {/* Restaurante sólo si NO es superadmin */}
        {roleCode !== "superadmin" && (
          <Form.Item
            name="restaurantId"
            label="Restaurante"
            rules={[{ required: true, message: "Selecciona restaurante" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Selecciona restaurante"
              options={restaurantOptions}
            />
          </Form.Item>
        )}

        <Form.Item name="status" label="Status" initialValue="active">
          <Select
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
