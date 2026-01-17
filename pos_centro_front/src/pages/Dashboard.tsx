import { Alert, Card, Col, Row, Spin, Statistic, Typography } from "antd";
import { useEffect, useState } from "react";

import apiCenter from "@/components/apis/apiCenter";

type DashboardKpis = {
  period: { label: string; start: string; end: string };
  restaurants: { total: number; active: number; inactive: number };
  subscriptions: {
    total: number;
    active: number;
    trialing: number;
    past_due: number;
    canceled: number;
    paused: number;
    expired: number;
  };
  revenue: { mrr: number; arr: number; collectedMonth: number };
  invoices: {
    pending: number;
    paid: number;
    past_due: number;
    void: number;
    overdue: number;
  };
  alerts: {
    plansWithoutDefaultPrice: number;
    subsWithoutPaymentMethod: number;
    overdueInvoices: number;
  };
  bot: {
    conversationsNew: number;
    userMessages: number;
    botMessages: number;
    pendingResponses: number;
    errors: number;
  };
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const green = { color: "#3f8600" };
  const red = { color: "#cf1322" };
  const amber = { color: "#d48806" };
  const gray = { color: "#8c8c8c" };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiCenter.get("/dashboard/kpis");
        if (!active) return;
        setData(res.data as DashboardKpis);
      } catch (err: any) {
        if (!active) return;
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "No se pudo cargar el panel.";
        setError(String(msg));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Card>
        <Typography.Title level={3}>Centro de Control</Typography.Title>
        <Typography.Paragraph>
          {data?.period?.label ? `KPIs — ${data.period.label}` : "KPIs"}
        </Typography.Paragraph>
      </Card>

      <Spin spinning={loading}>
        {error && (
          <Card style={{ marginTop: 16 }}>
            <Alert type="error" message={error} showIcon />
          </Card>
        )}

        {data && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={12} lg={8}>
              <Card title="Restaurantes">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="Total" value={data.restaurants.total} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Activos" value={data.restaurants.active} valueStyle={green} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Inactivos" value={data.restaurants.inactive} valueStyle={red} />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Card title="Suscripciones">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="Activas" value={data.subscriptions.active} valueStyle={green} />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="En prueba"
                      value={data.subscriptions.trialing}
                      valueStyle={amber}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Vencidas"
                      value={data.subscriptions.past_due}
                      valueStyle={red}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Canceladas" value={data.subscriptions.canceled} valueStyle={gray} />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Card title="Ingresos">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="MRR" value={data.revenue.mrr} precision={2} prefix="$" />
                  </Col>
                  <Col span={12}>
                    <Statistic title="ARR" value={data.revenue.arr} precision={2} prefix="$" />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Cobranza mes"
                      value={data.revenue.collectedMonth}
                      precision={2}
                      prefix="$"
                      valueStyle={green}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Card title="Facturas">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="Pendientes" value={data.invoices.pending} valueStyle={amber} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Vencidas" value={data.invoices.overdue} valueStyle={red} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Pagadas" value={data.invoices.paid} valueStyle={green} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Vencidas" value={data.invoices.past_due} valueStyle={red} />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Card title="Alertas">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="Planes sin precio"
                      value={data.alerts.plansWithoutDefaultPrice}
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Subs sin pago"
                      value={data.alerts.subsWithoutPaymentMethod}
                      valueStyle={red}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Facturas vencidas"
                      value={data.alerts.overdueInvoices}
                      valueStyle={{ color: "#cf1322" }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Card title="Bot">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="Conversaciones nuevas" value={data.bot.conversationsNew} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Mensajes usuario" value={data.bot.userMessages} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Mensajes bot" value={data.bot.botMessages} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Pendientes" value={data.bot.pendingResponses} />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        )}
      </Spin>
    </>
  );
}
