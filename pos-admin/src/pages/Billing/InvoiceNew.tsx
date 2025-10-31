import { Card, Form, Input, Button, Select, message } from "antd";
import { useAuth } from "@/components/Auth/AuthContext";
import apiAuth from "@/components/apis/apiAuth";

export default function InvoiceNew() {
  const { user } = useAuth();
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    try {
      const payload = {
        mode: "test",
        invoicePayload: {
          customer: values.customer, // { legal_name, tax_id, tax_system, address{zip,state,...}, email }
          items: JSON.parse(values.items), // [{ quantity, product: { description, product_key, price, taxes:{ IVA }, unit_key } }]
          payment_form: values.payment_form, // "03" (transfer), etc.
          payment_method: "PUE",
          use: "G01",
        },
      };
      // Proxy al backend pos-auth (ajusta baseURL)
      const res = await apiAuth.post(
        `/restaurants/${user?.restaurant.id}/invoices`,
        payload
      );
      message.success(`Factura creada: ${res.data.id}`);
    } catch (e: any) {
      console.error(e);
      message.error(e?.response?.data?.error || "No se pudo crear la factura");
    }
  };

  return (
    <Card title="Emitir CFDI 4.0 (TEST)">
      <Form layout="vertical" form={form} onFinish={onFinish}>
        <Form.Item
          name={["customer", "legal_name"]}
          label="Razón social"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["customer", "tax_id"]}
          label="RFC"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["customer", "tax_system"]}
          label="Régimen (clave SAT)"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name={["customer", "address", "zip"]}
          label="CP"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="payment_form"
          label="Forma de pago"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: "03", label: "Transferencia" },
              { value: "01", label: "Efectivo" },
            ]}
          />
        </Form.Item>
        {/* En producción, haz un selector de productos/servicios configurados */}
        <Form.Item
          name="items"
          label="Items (JSON)"
          rules={[{ required: true }]}
        >
          <Input.TextArea
            placeholder='[{"quantity":1,"product":{"description":"Servicio","product_key":85121600,"price":100,"unit_key":"E48"},"taxes":{"IVA":{"rate":0.16}}}]'
            rows={4}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Emitir (TEST)
        </Button>
      </Form>
    </Card>
  );
}
