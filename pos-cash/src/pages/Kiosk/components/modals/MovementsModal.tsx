// pos-cash/src/pages/Kiosk/components/modals/MovementsModal.tsx
import {
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Space,
  Button,
  message,
} from "antd";
import { useCash } from "../../context/CashKioskContext"; // 👈 usa el contexto compartido

const REASONS_IN = [
  "Fondo de caja",
  "Cambio",
  "Reposición",
  "Ingreso extraordinario",
];
const REASONS_OUT = [
  "Gasto menor",
  "Retiro bóveda",
  "Entrega a gerente",
  "Devolución propinas",
];

export default function MovementsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { recordCashMovement } = useCash(); // 👈 ya no useCashKiosk()
  const [form] = Form.useForm();

  const handleOk = async () => {
    const v = await form.validateFields();
    try {
      await recordCashMovement(v.type, Number(v.amount), v.reason || "");
      message.success(
        v.type === "IN" ? "Entrada registrada" : "Salida registrada"
      );
      form.resetFields();
      onClose();
    } catch (e: any) {
      message.error(String(e?.response?.data?.error || "No se pudo registrar"));
    }
  };

  const type = Form.useWatch("type", form) || "IN";
  const presets = type === "IN" ? REASONS_IN : REASONS_OUT;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Movimiento de efectivo"
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ type: "IN" }}>
        <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "IN", label: "Entrada" },
              { value: "OUT", label: "Salida" },
            ]}
          />
        </Form.Item>
        <Form.Item name="amount" label="Monto" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item name="reason" label="Motivo">
          <Input list="reasons-list" placeholder="Escribe un motivo…" />
          <datalist id="reasons-list">
            {presets.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Form.Item>

        <Space className="w-full justify-end">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleOk}>
            Registrar
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
