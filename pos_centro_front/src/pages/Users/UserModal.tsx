import { useEffect, useMemo } from "react";
import { Alert, Form, Input, Modal, Select, Tag, Tooltip } from "antd";

export type RoleOption = { value: UserFormValues["roleCode"]; label: string };
export type RestaurantOption = { value: number; label: string };

export type UserFormValues = {
  fullName: string;
  email: string;
  password?: string;
  roleCode:
    | "superadmin"
    | "owner"
    | "admin"
    | "manager"
    | "captain"
    | "waiter"
    | "cashier";
  restaurantId?: number;
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
  ownerRestaurantIds?: number[];
  onCancel: () => void;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
};

// --- helpers ---
const isOperative = (r?: UserFormValues["roleCode"]) =>
  r === "waiter" || r === "cashier";

// const isManagerial = (r?: UserFormValues["roleCode"]) =>
//   r === "superadmin" ||
//   r === "owner" ||
//   r === "admin" ||
//   r === "manager" ||
//   r === "captain";

const needsRestaurant = (r?: UserFormValues["roleCode"]) => r !== "superadmin";

const manualEmail = (r?: UserFormValues["roleCode"]) =>
  r === "owner" || r === "superadmin";

// nombrelimpio@r{restaurantId}.pos
function simpleSlug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 30) || "usuario"
  );
}

function autoEmailFrom(fullName?: string, restaurantId?: number) {
  const base = simpleSlug(fullName ?? "");
  const r = restaurantId ?? 0;
  return `${base}@r${r}.pos`;
}

export default function UserModal({
  open,
  loading,
  title,
  okText = "Guardar",
  isEditing,
  initialValues,
  roleOptions,
  restaurantOptions,
  ownerRestaurantIds = [],
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<UserFormValues>();

  // set defaults when opening
  useEffect(() => {
    if (open) {
      const def: Partial<UserFormValues> = {
        status: "active",
        roleCode: "owner",
        ...initialValues,
      };
      // si no es superadmin, mantener restaurantId (si viene), si es superadmin -> undefined
      if (def.roleCode === "superadmin") {
        def.restaurantId = undefined;
      }
      form.setFieldsValue(def as UserFormValues);
    } else {
      form.resetFields();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // autogenerar email cuando:
  // - no es manual (no owner/superadmin)
  // - cambia fullName o restaurantId
  const roleCode = Form.useWatch("roleCode", form);
  const fullName = Form.useWatch("fullName", form);
  const restaurantId = Form.useWatch("restaurantId", form);

  useEffect(() => {
    if (!manualEmail(roleCode)) {
      form.setFieldValue("email", autoEmailFrom(fullName, restaurantId));
    }
  }, [roleCode, fullName, restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // si cambian a superadmin, limpiar restaurantId
  useEffect(() => {
    if (roleCode === "superadmin") {
      form.setFieldValue("restaurantId", undefined);
    }
  }, [roleCode, form]);

  const ownerSet = useMemo(
    () => new Set(ownerRestaurantIds),
    [ownerRestaurantIds]
  );

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit(values);
    } catch {
      // validation error – do nothing
    }
  };

  const passwordExtra = isEditing
    ? "Deja en blanco para no cambiar la contraseña/PIN."
    : isOperative(roleCode)
      ? "PIN EXACTO de 6 dígitos."
      : "Mínimo 6 caracteres alfanuméricos.";

  const passwordRules = isOperative(roleCode)
    ? [
        { required: !isEditing, message: "Requerido (6 dígitos)" },
        {
          pattern: /^\d{6}$/,
          message: "Debe ser exactamente 6 dígitos (0-9)",
        },
      ]
    : [
        { required: !isEditing, message: "Requerido (≥ 6 caracteres)" },
        {
          min: 6,
          message: "Mínimo 6 caracteres",
        },
        {
          pattern: /^(?=.*[A-Za-z])(?=.*\d).*$/,
          message: "Debe incluir letras y números",
        },
      ];

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      confirmLoading={loading}
      onOk={handleOk}
      onCancel={onCancel}
      destroyOnClose
      maskClosable={false}
    >
      <Form<UserFormValues> form={form} layout="vertical">
        <Form.Item
          label="Rol"
          name="roleCode"
          rules={[{ required: true, message: "Selecciona un rol" }]}
        >
          <Select
            options={roleOptions}
            onChange={() => {
              // fuerza validación de password al cambiar de rol
              const pwd = form.getFieldValue("password");
              if (pwd) form.validateFields(["password"]).catch(() => {});
            }}
          />
        </Form.Item>

        {needsRestaurant(roleCode) && (
          <Form.Item
            label={
              <>
                Restaurante{" "}
                {roleCode === "owner" && (
                  <Tooltip title="Solo un owner por restaurante">
                    <Tag color="gold">owner único</Tag>
                  </Tooltip>
                )}
              </>
            }
            name="restaurantId"
            rules={[{ required: true, message: "Selecciona un restaurante" }]}
          >
            <Select
              options={restaurantOptions.map((opt) => ({
                ...opt,
                disabled:
                  roleCode === "owner" ? ownerSet.has(opt.value) : false,
                label:
                  roleCode === "owner" && ownerSet.has(opt.value)
                    ? `${opt.label} (ya tiene owner)`
                    : opt.label,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        )}

        <Form.Item
          label="Nombre y apellidos"
          name="fullName"
          rules={[
            { required: true, message: "Ingresa el nombre completo" },
            { min: 2, message: "Demasiado corto" },
          ]}
        >
          <Input placeholder="Ej. Juan Pérez" />
        </Form.Item>

        <Form.Item
          label={
            manualEmail(roleCode)
              ? "Correo (manual)"
              : "Correo (autogenerado por nombre + restaurante)"
          }
          name="email"
          rules={[
            { required: true, message: "Ingresa el correo" },
            { type: "email", message: "Formato de correo inválido" },
          ]}
        >
          <Input
            placeholder={
              manualEmail(roleCode) ? "owner@tu-dominio.com" : "autogenerado"
            }
            readOnly={!manualEmail(roleCode)}
          />
        </Form.Item>

        <Form.Item
          label="Contraseña / PIN"
          name="password"
          extra={passwordExtra}
          rules={passwordRules}
        >
          <Input.Password
            placeholder={
              isOperative(roleCode) ? "******" : "Mínimo 6, letras y números"
            }
          />
        </Form.Item>

        <Form.Item
          label="Estado"
          name="status"
          rules={[{ required: true, message: "Selecciona el estado" }]}
        >
          <Select
            options={[
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
          />
        </Form.Item>

        {roleCode === "owner" && ownerRestaurantIds.length > 0 && (
          <Alert
            type="info"
            showIcon
            message="Restricción de owner"
            description="Los restaurantes que ya tienen owner aparecen deshabilitados en el selector."
          />
        )}
      </Form>
    </Modal>
  );
}
