import { Modal, Form, InputNumber, Select, Space, Button, message } from "antd";
import { useCash } from "../../context/CashKioskContext"; // 👈 usa el contexto compartido

export default function PayModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { selectedOrder, payOrder } = useCash(); // 👈 ya no useCashKiosk()
  const [form] = Form.useForm();

  if (!selectedOrder) return null; // si no hay selección, no se muestra

  const subtotal = selectedOrder.items.reduce(
    (acc, it) => acc + (it.total ?? it.qty * it.unitPrice),
    0
  );

  const handleOk = async () => {
    const values = await form.validateFields();
    const payments = [
      { methodId: values.methodId, amount: Number(values.amount || subtotal) },
    ];
    try {
      await payOrder(selectedOrder.id, {
        payments,
        tip: Number(values.tip || 0),
        discount: Number(values.discount || 0),
      });
      message.success("Pago registrado");
      onClose();
    } catch (e: any) {
      message.error(String(e?.response?.data?.error || "No se pudo cobrar"));
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`Cobrar · #${selectedOrder.id}`}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ amount: subtotal, methodId: 1 }}
      >
        <Form.Item
          label="Método de pago"
          name="methodId"
          rules={[{ required: true, message: "Selecciona método" }]}
        >
          <Select
            options={[
              { value: 1, label: "Efectivo" },
              { value: 2, label: "Tarjeta" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Importe" name="amount" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Space className="w-full">
          <Form.Item label="Propina" name="tip" className="flex-1">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Descuento" name="discount" className="flex-1">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Space>
        <Space className="w-full justify-end">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleOk}>
            Confirmar pago
          </Button>
        </Space>
      </Form>
    </Modal>
  );
}
