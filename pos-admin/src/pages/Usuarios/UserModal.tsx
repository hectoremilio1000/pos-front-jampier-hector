// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Usuarios/UserModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Alert,
  Typography,
  Steps,
  Button,
  Space,
} from "antd";

const { Text } = Typography;

export type UserFormValues = {
  full_name: string;
  role_code: "admin" | "manager" | "captain" | "cashier" | "waiter";
  password?: string; // gerenciales: alfanum >=6, operativos: exactamente 6 dígitos
  status?: "active" | "blocked" | "suspended" | "invited";
};

type Role = { id: number; code: UserFormValues["role_code"]; name: string };

export default function UserModal({
  open,
  mode,
  initial,
  roles,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<UserFormValues>;
  roles: Role[];
  onCancel: () => void;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
  currentUserRoleCode?: string;
}) {
  const [form] = Form.useForm<UserFormValues>();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Roles permitidos en POS Admin (no owner ni superadmin)
  const allowedCodes: Array<UserFormValues["role_code"]> = [
    "manager",
    "captain",
    "cashier",
    "waiter",
  ];

  const roleOptions = useMemo(() => {
    const list = roles.filter((r) => allowedCodes.includes(r.code));
    return list.map((r) => ({ value: r.code, label: r.name }));
  }, [roles]);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        full_name: initial?.full_name ?? "",
        role_code: (initial?.role_code as any) ?? undefined,
        password: "", // vacío = no cambiar en edición
        status: (initial?.status as any) ?? "active",
      });
      setStep(0);
    } else {
      form.resetFields();
      setStep(0);
    }
  }, [open, initial, form]);

  const roleSelected = Form.useWatch("role_code", form);
  const isGerencial = roleSelected === "manager" || roleSelected === "captain";
  const isOperativo = roleSelected === "waiter" || roleSelected === "cashier";

  const goNext = async () => {
    await form.validateFields(["role_code"]);
    setStep(1);
  };

  const goBack = () => setStep(0);

  const handleSubmit = async () => {
    if (step === 0) {
      try {
        await form.validateFields(["role_code"]);
        setStep(1);
      } catch {
        /* antd muestra el error de ese campo */
      }
      return;
    }

    try {
      await form.validateFields(["full_name", "password"]); // valida solo los del paso 2
      const vals = form.getFieldsValue(true) as UserFormValues; // incluye role_code preservado
      const pwd = String(vals.password || "");
      const role = vals.role_code as UserFormValues["role_code"];
      const isMgr = role === "manager" || role === "captain";
      const isOp = role === "waiter" || role === "cashier";

      if (mode === "create") {
        if (isMgr) {
          if (!/^[A-Za-z0-9]{6,}$/.test(pwd)) {
            throw new Error(
              "La contraseña debe tener mínimo 6 caracteres alfanuméricos"
            );
          }
        } else if (isOp) {
          if (!/^\d{6}$/.test(pwd)) {
            throw new Error("La contraseña debe tener exactamente 6 dígitos");
          }
        } else {
          throw new Error("Rol no permitido");
        }
      } else {
        if (pwd) {
          if (isMgr && !/^[A-Za-z0-9]{6,}$/.test(pwd)) {
            throw new Error(
              "La contraseña debe tener mínimo 6 caracteres alfanuméricos"
            );
          }
          if (isOp && !/^\d{6}$/.test(pwd)) {
            throw new Error("La contraseña debe tener exactamente 6 dígitos");
          }
        }
      }

      setSubmitting(true);
      await onSubmit(vals);
    } catch (err: any) {
      // 🔊 No silenciar: muestra el error si viene de nuestra validación manual
      if (err instanceof Error && err.message) {
        // Usa Modal de antd para no importar nada extra
        Modal.error({
          title: "No se pudo crear/actualizar",
          content: err.message,
        });
      }
      // Si el error fue de antd Form (reglas), ya lo muestra el propio Form
    } finally {
      setSubmitting(false);
    }
  };

  // Footer personalizado para controlar “Siguiente / Atrás / Crear / Actualizar”
  const footer = (
    <Space>
      {step === 1 ? (
        <>
          <Button onClick={goBack}>Atrás</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {mode === "create" ? "Crear" : "Actualizar"}
          </Button>
        </>
      ) : (
        <>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="primary" onClick={goNext}>
            Siguiente
          </Button>
        </>
      )}
    </Space>
  );

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nuevo usuario" : "Editar usuario"}
      onCancel={onCancel}
      footer={footer}
      destroyOnClose
    >
      <Steps
        size="small"
        current={step}
        items={[{ title: "Rol" }, { title: "Datos" }]}
        className="mb-4"
      />

      <Form<UserFormValues> form={form} layout="vertical">
        {step === 0 && (
          <>
            <Form.Item
              label="Rol"
              name="role_code"
              rules={[{ required: true, message: "Selecciona un rol" }]}
              preserve
            >
              <Select placeholder="Selecciona un rol" options={roleOptions} />
            </Form.Item>

            <Alert
              type="info"
              showIcon
              message={
                <Text>
                  En el siguiente paso se capturarán <b>Nombre completo</b> y{" "}
                  <b>
                    {isGerencial
                      ? "contraseña alfanumérica (≥6)"
                      : isOperativo
                        ? "contraseña de 6 dígitos"
                        : "contraseña según el rol"}
                  </b>
                  . El correo se autogenerará.
                </Text>
              }
            />
          </>
        )}

        {step === 1 && (
          <>
            <Form.Item
              label="Nombre completo"
              name="full_name"
              rules={[{ required: true, message: "Nombre requerido" }]}
            >
              <Input placeholder="Nombre y apellidos" maxLength={80} />
            </Form.Item>

            <Form.Item noStyle shouldUpdate>
              {() => {
                const role = form.getFieldValue(
                  "role_code"
                ) as UserFormValues["role_code"];
                const isMgr = role === "manager" || role === "captain";
                const isOp = role === "waiter" || role === "cashier";
                const label = isMgr
                  ? "Contraseña (mín. 6, letras y números)"
                  : "Contraseña (exactamente 6 dígitos)";
                const placeholder = isMgr
                  ? "Mínimo 6 caracteres alfanuméricos"
                  : "Ingresa 6 dígitos";

                return (
                  <Form.Item
                    label={label}
                    name="password"
                    rules={
                      mode === "create"
                        ? [{ required: true, message: "Contraseña requerida" }]
                        : []
                    }
                  >
                    <Input
                      maxLength={32}
                      placeholder={placeholder}
                      inputMode={isOp ? "numeric" : "text"}
                      onChange={(e) => {
                        if (isOp) {
                          e.target.value = e.target.value.replace(/\D/g, "");
                        }
                      }}
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>

            {(isOperativo || isGerencial) && (
              <Alert
                type="info"
                showIcon
                message={
                  isGerencial ? (
                    <Text>
                      <b>Gerencial (Manager/Captain):</b> contraseña
                      alfanumérica de <b>mínimo 6</b> caracteres. El email se
                      autogenerará.
                    </Text>
                  ) : (
                    <Text>
                      <b>Operación (Waiter/Cashier):</b> contraseña de{" "}
                      <b>6 dígitos</b>. El email se autogenerará.
                    </Text>
                  )
                }
              />
            )}

            <Form.Item
              label="¿Activo?"
              name="status"
              valuePropName="checked"
              getValueFromEvent={(checked: boolean) =>
                checked ? "active" : "blocked"
              }
              getValueProps={(value) => ({ checked: value !== "blocked" })}
            >
              <Switch />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
