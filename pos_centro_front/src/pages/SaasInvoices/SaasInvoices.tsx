/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Button, Card, Input, Select, Space, message } from "antd";
import apiCenter from "@/components/apis/apiCenter";
import apiAuth from "@/components/apis/apiAuth";
import SaasInvoicesTable, {
  type SaasInvoiceRow,
} from "@/pages/SaasInvoices/SaasInvoicesTable";

type Restaurant = { id: number; name: string };

export default function SaasInvoices() {
  const [rows, setRows] = useState<SaasInvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [q, setQ] = useState<string>("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | undefined>(
    undefined
  );

  const apiBase = (import.meta.env.VITE_API_URL_CENTER || "").replace(/\/$/, "");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await apiCenter.get("/saas/invoices", {
        params: {
          status,
          restaurantId,
          q: q.trim() || undefined,
        },
      });
      setRows(data ?? []);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar facturas SaaS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [status, restaurantId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiAuth.get("/restaurants");
        setRestaurants(r.data?.data ?? r.data ?? []);
      } catch (e) {
        console.error(e);
        message.error("No se pudieron cargar restaurantes");
      }
    })();
  }, []);

  return (
    <Card title="Facturas CFDI (SAT)">
      <Space style={{ marginBottom: 12 }}>
        <Input
          placeholder="Buscar UUID / ID Facturapi"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          allowClear
          placeholder="Estado"
          value={status}
          onChange={(v) => setStatus(v)}
          options={[
            { value: "valid", label: "Vigente" },
            { value: "pending", label: "Pendiente" },
            { value: "canceled", label: "Cancelada" },
          ]}
          style={{ width: 160 }}
        />
        <Select<number>
          allowClear
          placeholder="Restaurante"
          value={restaurantId}
          onChange={(v) => setRestaurantId(v)}
          showSearch
          optionFilterProp="label"
          options={restaurants.map((r) => ({ value: r.id, label: r.name }))}
          style={{ width: 260 }}
        />
        <Button onClick={fetchAll}>Buscar</Button>
      </Space>

      <SaasInvoicesTable rows={rows} loading={loading} apiBase={apiBase} />
    </Card>
  );
}
