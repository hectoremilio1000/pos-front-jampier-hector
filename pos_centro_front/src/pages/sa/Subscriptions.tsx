import { useEffect, useState } from "react";
import { Button, Card, Form, InputNumber, Select, Space, message } from "antd";
import apiCenter from "@/apis/apiCenter";
import apiAuth from "@/apis/apiAuth";

type Restaurant = { id: number; name: string };
type Plan = {
  id: number;
  code: string;
  name: string;
  amountCents: number;
  interval: "month" | "semiannual" | "year";
};

export default function Subscriptions() {
  const [form] = Form.useForm();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          apiAuth.get("/restaurants"),
          apiCenter.get("/plans"),
        ]);
        setRestaurants(r1.data.data ?? r1.data);
        setPlans(r2.data);
      } catch (e) {
        console.error(e);
        message.error("No se pudieron cargar catálogos");
      }
    })();
  }, []);

  const onCreate = async () => {
    try {
      setSaving(true);
      const v = await form.validateFields();
      await apiCenter.post("/subscriptions", {
        restaurantId: v.restaurantId,
        planCode: v.planCode,
        priceOverrideCents: v.priceOverrideCents ?? null,
        recurringDiscountPercent: v.recurringDiscountPercent ?? 0,
        recurringDiscountCents: v.recurringDiscountCents ?? 0,
      });
      message.success("Suscripción creada");
      form.resetFields();
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear la suscripción");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Crear Suscripción">
      <Form form={form} layout="vertical">
        <Form.Item
          name="restaurantId"
          label="Restaurante"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Form.Item>

        <Form.Item name="planCode" label="Plan" rules={[{ required: true }]}>
          <Select
            options={plans.map((p) => ({
              value: p.code,
              label: `${p.name} (${p.interval}) — $${(p.amountCents / 100).toFixed(2)}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="priceOverrideCents" label="Precio override (centavos)">
          <InputNumber style={{ width: "100%" }} min={0} step={100} />
        </Form.Item>

        <Space size="large" style={{ display: "flex" }}>
          <Form.Item name="recurringDiscountPercent" label="Descuento %">
            <InputNumber min={0} max={100} />
          </Form.Item>
          <Form.Item
            name="recurringDiscountCents"
            label="Descuento fijo (centavos)"
          >
            <InputNumber min={0} step={100} />
          </Form.Item>
        </Space>

        <Button type="primary" onClick={onCreate} loading={saving}>
          Crear suscripción
        </Button>
      </Form>
    </Card>
  );
}
