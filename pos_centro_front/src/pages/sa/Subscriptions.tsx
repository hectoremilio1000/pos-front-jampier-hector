import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCenter from "@/apis/apiCenter";
import apiAuth from "@/apis/apiAuth";
import SubscriptionFormModal, {
  type SubscriptionFormValues,
  type RestaurantOpt,
  type PlanOpt,
} from "@/components/SubscriptionFormModal";

type SubscriptionRow = {
  id: number;
  restaurantId: number;
  restaurantName: string;
  planCode: string;
  planName: string;
  planInterval: "month" | "semiannual" | "year";
  priceOverride?: number | null; // 👈 PESOS
  recurringDiscountPercent: number; // %
  recurringDiscount: number; // 👈 PESOS
  status: "active" | "trialing" | "past_due" | "canceled" | "paused";
};

type Restaurant = { id: number; name: string };
type Plan = {
  id: number;
  code: string;
  name: string;
  amount: number; // 👈 PESOS
  currency: string;
  interval: "month" | "semiannual" | "year";
};

export default function Subscriptions() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // catalogs
  const [restaurants, setRestaurants] = useState<RestaurantOpt[]>([]);
  const [plans, setPlans] = useState<PlanOpt[]>([]); // value, label, interval, amount

  // modal state
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [initialValues, setInitialValues] = useState<
    Partial<SubscriptionFormValues>
  >({});

  const fetchCatalogs = async () => {
    try {
      const [r1, r2] = await Promise.all([
        apiAuth.get("/restaurants"),
        apiCenter.get("/plans"),
      ]);
      const rawR: Restaurant[] = r1.data?.data ?? r1.data ?? [];
      const rawP: Plan[] = r2.data ?? [];
      setRestaurants(rawR.map((r) => ({ value: r.id, label: r.name })));
      setPlans(
        rawP.map((p) => ({
          value: p.code,
          label: `${p.name} (${p.interval}) — $${Number(p.amount).toFixed(2)} ${p.currency}`,
          interval: p.interval,
          amount: Number(p.amount), // 👈 PESOS
        }))
      );
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar catálogos");
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const { data } = await apiCenter.get("/subscriptions");
      // 🔧 Normaliza a number (el backend puede mandar DECIMAL como string)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const norm = (data ?? []).map((r: any) => ({
        ...r,
        priceOverride:
          r.priceOverride === null || r.priceOverride === undefined
            ? null
            : Number(r.priceOverride),
        recurringDiscountPercent: Number(r.recurringDiscountPercent ?? 0),
        recurringDiscount: Number(r.recurringDiscount ?? 0),
      }));
      setRows(norm);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar suscripciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogs();
    fetchRows();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setInitialValues({
      priceOverridePesos: undefined, // form en pesos
      recurringDiscountPercent: 0,
      recurringDiscount: 0, // 👈 form en pesos
    });
    setOpen(true);
  };

  const openEdit = (row: SubscriptionRow) => {
    setEditing(row);
    setInitialValues({
      restaurantId: row.restaurantId,
      planCode: row.planCode,
      priceOverridePesos: row.priceOverride ?? undefined, // 👈 PESOS
      recurringDiscountPercent: row.recurringDiscountPercent,
      recurringDiscount: row.recurringDiscount, // 👈 PESOS
    });
    setOpen(true);
  };

  const handleDelete = (row: SubscriptionRow) => {
    Modal.confirm({
      title: `Cancelar suscripción de "${row.restaurantName}"`,
      content: "Esta acción no se puede deshacer.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        try {
          await apiCenter.delete(`/subscriptions/${row.id}`);
          message.success("Suscripción eliminada");
          fetchRows();
        } catch (e) {
          console.error(e);
          message.error("No se pudo eliminar");
        }
      },
    });
  };

  const handleSubmit = async (v: SubscriptionFormValues) => {
    try {
      setSaving(true);
      const payload = {
        restaurantId: v.restaurantId,
        planCode: v.planCode,
        priceOverride:
          v.priceOverridePesos != null ? Number(v.priceOverridePesos) : null, // PESOS
        recurringDiscountPercent: v.recurringDiscountPercent ?? 0, // %
        recurringDiscount: v.recurringDiscount ?? 0, // PESOS
      };

      if (editing) {
        await apiCenter.put(`/subscriptions/${editing.id}`, payload);
        message.success("Suscripción actualizada");
      } else {
        await apiCenter.post("/subscriptions", payload);
        message.success("Suscripción creada");
      }
      setOpen(false);
      fetchRows();
    } catch (e) {
      console.error(e);
      message.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const plansMap = useMemo(() => {
    const m = new Map<string, { amount: number }>();
    for (const p of plans) {
      m.set(p.value, { amount: p.amount }); // 👈 PESOS
    }
    return m;
  }, [plans]);

  const columns: ColumnsType<SubscriptionRow> = useMemo(
    () => [
      {
        title: "Restaurante",
        dataIndex: "restaurantName",
        key: "restaurantName",
      },
      {
        title: "Plan",
        dataIndex: "planName",
        key: "planName",
        render: (_: string | null, r: SubscriptionRow) =>
          `${r.planName ?? "—"} (${r.planInterval ?? "—"})`,
      },
      {
        title: "Precio final",
        key: "finalPrice",
        width: 160,
        render: (_: unknown, r) => {
          const plan = plansMap.get(r.planCode);
          const planAmount = plan?.amount ?? 0; // PESOS
          const base = r.priceOverride ?? planAmount; // PESOS
          const afterPercent =
            base - (base * (r.recurringDiscountPercent ?? 0)) / 100;
          const final = Math.max(0, afterPercent - (r.recurringDiscount ?? 0)); // PESOS, nunca negativo
          return `$${final.toFixed(2)}`;
        },
      },
      {
        title: "Descuento",
        key: "discounts",
        width: 180,
        render: (_: unknown, r: SubscriptionRow) =>
          r.recurringDiscountPercent || r.recurringDiscount
            ? `${r.recurringDiscountPercent || 0}% + $${Number(r.recurringDiscount || 0).toFixed(2)}`
            : "—",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (s) => {
          const color =
            s === "active" || s === "trialing"
              ? "green"
              : s === "paused"
                ? "orange"
                : "red";
          return <Tag color={color}>{s}</Tag>;
        },
      },
      {
        title: "Acciones",
        key: "actions",
        width: 220,
        render: (_: unknown, row) => (
          <Space>
            <Button size="small" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <Button size="small" danger onClick={() => handleDelete(row)}>
              Eliminar
            </Button>
          </Space>
        ),
      },
    ],
    [plansMap]
  );

  return (
    <Card
      title="Suscripciones"
      extra={
        <Space>
          <Button type="primary" onClick={openCreate}>
            Nueva suscripción
          </Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns}
      />

      <SubscriptionFormModal
        open={open}
        loading={saving}
        initialValues={initialValues}
        restaurants={restaurants}
        plans={plans}
        title={editing ? `Editar suscripción` : "Nueva suscripción"}
        okText={editing ? "Guardar" : "Crear"}
        onCancel={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
