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

const MOVEMENT_PRINT_ENDPOINT = "nprint";

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
  const { recordCashMovement, restaurantProfile, stationCurrent, shiftId } =
    useCash(); // 👈 ya no useCashKiosk()
  const [form] = Form.useForm();

  const resolveLocalBaseUrl = () =>
    (restaurantProfile?.localBaseUrl || "").replace(/\/$/, "") || null;

  const buildMovementPrintPayload = (movement: {
    type: "IN" | "OUT";
    amount: number;
    reason: string;
  }) => {
    const printerName = stationCurrent?.printerName?.trim();
    return {
      ...(printerName ? { printerName } : {}),
      data: {
        type: movement.type,
        amount: movement.amount,
        reason: movement.reason || null,
        shiftId: Number(
          shiftId || sessionStorage.getItem("cash_shift_id") || 0,
        ),
        stationId: stationCurrent?.id ?? stationCurrent?.code ?? null,
        printerStationName: stationCurrent?.name ?? null,
        createdAt: new Date().toISOString(),
      },
    };
  };

  const printCashMovement = async (
    payload: ReturnType<typeof buildMovementPrintPayload>,
  ) => {
    const baseUrl = resolveLocalBaseUrl();
    if (!baseUrl) {
      message.warning(
        "No se encontró la URL local para imprimir el movimiento de caja.",
      );
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/nprint/printers/print-movtos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.warn(
          `[movimiento] ${MOVEMENT_PRINT_ENDPOINT} error ${res.status}: ${detail}`,
        );
      } else {
        await res.json().catch(() => {});
      }
    } catch (error) {
      console.warn("[movimiento] print failed", error);
    }
  };

  const handleOk = async () => {
    const v = await form.validateFields();
    try {
      await recordCashMovement(v.type, Number(v.amount), v.reason || "");
      await printCashMovement(
        buildMovementPrintPayload({
          type: v.type,
          amount: Number(v.amount),
          reason: v.reason || "",
        }),
      );
      message.success(
        v.type === "IN" ? "Entrada registrada" : "Salida registrada",
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
