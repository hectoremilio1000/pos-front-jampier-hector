// /pos-admin/src/pages/Billing/Account.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Progress,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useAuth } from "@/components/Auth/AuthContext";
import { useSubscription } from "@/components/Billing/SubscriptionContext";
import ChoosePlan from "@/components/Billing/ChoosePlan";
import apiCenter from "@/components/apis/apiCenter";
import PlanSwitcher from "@/components/Billing/PlanSwitcher";

type PlanPrice = {
  id: number;
  interval: "day" | "week" | "month" | "year";
  intervalCount: number;
  amount: number;
  currency: string;
};

type SubRow = {
  id: number;
  restaurantId: number;
  planId: number;
  planPriceId: number;
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "expired"
    | "paused";
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paidAt?: string | null;
  planPrice?: PlanPrice;
  plan?: { name: string };
};

export default function Account() {
  const { user } = useAuth();
  const { subscription, loading, refresh } = useSubscription();
  const restaurantId = user?.restaurant?.id;

  const [history, setHistory] = useState<SubRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const days = useMemo(() => {
    if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd)
      return { left: 0, total: 0, percent: 0 };
    const start = dayjs(subscription.currentPeriodStart);
    const end = dayjs(subscription.currentPeriodEnd);
    const now = dayjs();
    const total = Math.max(end.diff(start, "day"), 1);
    const left = Math.max(end.diff(now, "day"), 0);
    const used = total - left;
    const percent = Math.min(
      100,
      Math.max(0, Math.round((used / total) * 100))
    );
    return { left, total, percent };
  }, [subscription]);

  const nearing =
    days.left <= 7 &&
    (subscription?.status === "active" || subscription?.status === "trialing");

  const columns: ColumnsType<SubRow> = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "Plan", render: (_, r) => r.plan?.name ?? r.planId },
    {
      title: "Periodo",
      render: (_, r) =>
        r.planPrice ? (
          <Tag>{`${r.planPrice.interval}/${r.planPrice.intervalCount}`}</Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Monto",
      render: (_, r) =>
        r.planPrice
          ? `$${Number(r.planPrice.amount).toFixed(2)} ${r.planPrice.currency}`
          : "-",
    },
    {
      title: "Vigencia",
      render: (_, r) =>
        `${new Date(r.currentPeriodStart).toLocaleDateString()} → ${new Date(r.currentPeriodEnd).toLocaleDateString()}`,
    },
    {
      title: "Estado",
      dataIndex: "status",
      render: (v) => (
        <Tag
          color={
            v === "active"
              ? "green"
              : v === "trialing"
                ? "blue"
                : v === "canceled"
                  ? "red"
                  : v === "expired"
                    ? "default"
                    : v === "past_due"
                      ? "orange"
                      : "default"
          }
        >
          {v}
        </Tag>
      ),
    },
  ];

  useEffect(() => {
    const run = async () => {
      if (!restaurantId) return;
      try {
        const { data } = await apiCenter.get(
          `/subscriptions?restaurantId=${restaurantId}`
        );
        setHistory(data ?? []);
      } catch (e) {
        console.error(e);
        message.error("No se pudo cargar el historial");
      }
    };
    run();
  }, [restaurantId]);

  if (loading) {
    return <Card loading title="Mi cuenta" />;
  }

  // Sin suscripción activa → muestra ChoosePlan (igual que el guard)
  if (!subscription) {
    return (
      <Card title="Activa tu suscripción">
        <p>No tienes suscripción activa. Elige un plan:</p>
        <ChoosePlan />
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ display: "block" }}>
      <Card
        title="Mi suscripción"
        extra={
          <Space>
            {nearing ? (
              <Tag color="orange">Vence en {days.left} día(s)</Tag>
            ) : null}
            <Button type="default" onClick={() => setDrawerOpen(true)}>
              Cambiar de plan
            </Button>
          </Space>
        }
      >
        <Descriptions bordered column={1} size="middle">
          <Descriptions.Item label="Estado">
            <Tag
              color={
                subscription.status === "active"
                  ? "green"
                  : subscription.status === "trialing"
                    ? "blue"
                    : "default"
              }
            >
              {subscription.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Plan">
            {subscription.plan?.name ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Periodo actual">
            {subscription.planPrice
              ? `${subscription.planPrice.interval}/${subscription.planPrice.intervalCount} — ` +
                `${new Date(subscription.currentPeriodStart).toLocaleDateString()} → ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
              : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Días restantes">
            {days.left} / {days.total}
            <div style={{ marginTop: 8 }}>
              <Progress percent={days.percent} />
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Historial de suscripciones">
        <Table rowKey="id" dataSource={history} columns={columns} />
      </Card>

      <Drawer
        title="Cambiar de plan"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
      >
        <PlanSwitcher
          currentPlanPriceId={subscription.planPrice?.id}
          onSwitch={async ({ planPriceId }) => {
            try {
              setSwitching(true);
              await apiCenter.post("/subscriptions/change-plan", {
                currentSubscriptionId: subscription.id,
                planPriceId,
              });
              message.success("Plan cambiado correctamente");
              await refresh();
              setDrawerOpen(false);
            } catch (e) {
              console.error(e);
              message.error("No se pudo cambiar el plan");
            } finally {
              setSwitching(false);
            }
          }}
          switching={switching}
        />
      </Drawer>
    </Space>
  );
}
