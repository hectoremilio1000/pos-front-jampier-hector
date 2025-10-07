import { useEffect } from "react";
import {
  Modal,
  Steps,
  Form,
  Input,
  Select,
  Switch,
  Typography,
  Tooltip,
  Button,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export type StationForm = {
  code: string;
  name: string;
  mode: "MASTER" | "DEPENDENT";
  isEnabled: boolean;
  openingRequired: boolean;
  cashierId: number | null;
};

export default function StationWizardModal({
  open,
  loading,
  initial,
  cashiers,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  loading: boolean;
  initial: Partial<StationForm>;
  cashiers: { id: number; fullName: string; email: string }[];
  onCancel: () => void;
  onSubmit: (values: StationForm) => void;
}) {
  const [form] = Form.useForm<StationForm>();

  // defaults inteligentes
  useEffect(() => {
    form.setFieldsValue({
      code: initial.code || "",
      name: initial.name || "",
      mode: initial.mode || "MASTER",
      isEnabled: initial.isEnabled ?? true,
      openingRequired: initial.openingRequired ?? true,
      cashierId: initial.cashierId ?? null,
    });
  }, [initial, form]);

  // autogenera código si está vacío al escribir nombre
  const handleNameChange = (v: string) => {
    const code = (form.getFieldValue("code") || "").trim();
    if (!code && v) {
      const slug = v
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 6);
      form.setFieldsValue({ code: `${slug}01` });
    }
  };

  const title = initial.code ? "Editar estación" : "Nueva estación";

  const footer = null; // usamos <Form> submit dentro

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      footer={footer}
      destroyOnClose
    >
      <Steps
        current={0}
        size="small"
        items={[{ title: "Básico" }, { title: "Cajero" }, { title: "Reglas" }]}
        className="mb-4"
      />

      <Form<StationForm> form={form} layout="vertical" onFinish={onSubmit}>
        {/* Paso 1: Básico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Form.Item
            label="Código"
            name="code"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input
              maxLength={12}
              placeholder="CAJA01"
              onChange={(e) =>
                form.setFieldsValue({ code: e.target.value.toUpperCase() })
              }
            />
          </Form.Item>
          <Form.Item
            label="Nombre"
            name="name"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input
              placeholder="Caja principal"
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </Form.Item>
          <Form.Item
            label={
              <>
                Modo{" "}
                <Tooltip title="MASTER = caja principal del día. DEPENDENT = opera bajo la MASTER.">
                  <InfoCircleOutlined />
                </Tooltip>
              </>
            }
            name="mode"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "MASTER", label: "MASTER (principal)" },
                { value: "DEPENDENT", label: "DEPENDENT (dependiente)" },
              ]}
            />
          </Form.Item>
        </div>

        <Steps
          current={1}
          size="small"
          items={[{ title: "" }]}
          className="hidden"
        />
        {/* Paso 2: Cajero */}
        <Form.Item
          label={
            <>
              Asignar cajero (opcional){" "}
              <Text type="secondary">• puedes hacerlo luego</Text>
            </>
          }
          name="cashierId"
        >
          <Select
            allowClear
            placeholder="Selecciona cajero"
            showSearch
            optionFilterProp="label"
            options={cashiers.map((c) => ({
              value: c.id,
              label: `${c.fullName} (${c.email})`,
            }))}
          />
        </Form.Item>

        <Steps
          current={2}
          size="small"
          items={[{ title: "" }]}
          className="hidden"
        />
        {/* Paso 3: Reglas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Form.Item
            label="Habilitada"
            name="isEnabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label={
              <>
                Requiere fondo inicial{" "}
                <Tooltip title="El fondo se declara al ABRIR turno desde POS Cash.">
                  <InfoCircleOutlined />
                </Tooltip>
              </>
            }
            name="openingRequired"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onCancel}>Cancelar</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {initial.code ? "Guardar cambios" : "Crear estación"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
