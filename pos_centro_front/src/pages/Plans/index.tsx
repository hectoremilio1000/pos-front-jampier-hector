// /src/pages/Admin/Plans.tsx
import { useEffect, useState } from "react";
import { Button, Card, Modal, Space, Table, Tag, message, Divider } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCenter from "@/components/apis/apiCenter";
import PlanFormModal, { type PlanFormValues } from "./PlanFormModal";
import PlanPriceFormModal, {
  type PlanPriceFormValues,
} from "@/components/PlanPriceFormModal";
import type { Plan, PlanPrice } from "@/types/billing";
// helper al inicio del archivo (debajo de imports)
function humanizeInterval(interval: string, count: number) {
  const n = Number(count || 1);
  const unit = String(interval);
  const map: Record<string, { s: string; p: string }> = {
    day: { s: "día", p: "días" },
    week: { s: "semana", p: "semanas" },
    month: { s: "mes", p: "meses" },
    year: { s: "año", p: "años" },
  };
  const m = map[unit] || { s: unit, p: unit + "s" };
  return n === 1 ? m.s : `${n} ${m.p}`;
}

export default function Plans() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  // modales Plan
  const [openPlan, setOpenPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [initialPlan, setInitialPlan] = useState<Partial<PlanFormValues>>({});

  // modales Price
  const [openPrice, setOpenPrice] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PlanPrice | null>(null);
  const [parentPlan, setParentPlan] = useState<Plan | null>(null);
  const [savingPrice, setSavingPrice] = useState(false);
  const [initialPrice, setInitialPrice] = useState<
    Partial<PlanPriceFormValues>
  >({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await apiCenter.get("/plans");
      setRows(data);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar planes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // PLAN handlers
  const handleCreatePlan = () => {
    setEditingPlan(null);
    setInitialPlan({
      code: "",
      name: "",
      description: "",
      isPublic: true,
      isActive: true,
    });
    setOpenPlan(true);
  };
  const handleEditPlan = (row: Plan) => {
    setEditingPlan(row);
    setInitialPlan({
      code: row.code,
      name: row.name,
      description: row.description || "",
      isPublic: row.isPublic,
      isActive: row.isActive,
      defaultPriceId: row.defaultPriceId ?? undefined,
    });
    setOpenPlan(true);
  };
  const handleSavePlan = async (values: PlanFormValues) => {
    setSavingPlan(true);
    try {
      if (editingPlan) {
        await apiCenter.put(`/plans/${editingPlan.id}`, {
          name: values.name,
          description: values.description,
          isPublic: values.isPublic,
          isActive: values.isActive,
          defaultPriceId: values.defaultPriceId ?? null,
        });
        message.success("Plan actualizado");
      } else {
        await apiCenter.post("/plans", {
          code: values.code,
          name: values.name,
          description: values.description,
          isPublic: values.isPublic,
          isActive: values.isActive,
          // opcional: puedes mandar un price inicial desde aquí si quieres
        });
        message.success("Plan creado");
      }
      setOpenPlan(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      message.error("No se pudo guardar el plan");
    } finally {
      setSavingPlan(false);
    }
  };
  const handleDeletePlan = (row: Plan) => {
    Modal.confirm({
      title: `Eliminar plan "${row.name}"`,
      content: "Esta acción no se puede deshacer.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        try {
          await apiCenter.delete(`/plans/${row.id}`);
          message.success("Plan eliminado");
          await fetchData();
        } catch (e) {
          console.error(e);
          message.error("No se pudo eliminar");
        }
      },
    });
  };

  // PRICE handlers
  const openCreatePrice = (plan: Plan) => {
    setParentPlan(plan);
    setEditingPrice(null);
    // openCreatePrice
    setInitialPrice({
      planId: plan.id,
      interval: "month",
      intervalCount: 1,
      amount: undefined,
      currency: "MXN",
      isDefault: plan.defaultPriceId ? false : true,
    });

    setOpenPrice(true);
  };
  const openEditPrice = (plan: Plan, price: PlanPrice) => {
    setParentPlan(plan);
    setEditingPrice(price);
    // openEditPrice
    setInitialPrice({
      planId: plan.id,
      interval: price.interval,
      intervalCount: price.intervalCount,
      amount: price.amount,
      currency: price.currency,
      isDefault: price.isDefault,
    });

    setOpenPrice(true);
  };
  const handleSavePrice = async (values: PlanPriceFormValues) => {
    setSavingPrice(true);
    try {
      if (editingPrice) {
        await apiCenter.put(`/plan-prices/${editingPrice.id}`, values);
        message.success("Precio actualizado");
      } else {
        await apiCenter.post(`/plan-prices`, values);
        message.success("Precio creado");
      }
      setOpenPrice(false);
      await fetchData();
    } catch (e) {
      console.error(e);
      message.error("No se pudo guardar el precio");
    } finally {
      setSavingPrice(false);
    }
  };
  const handleDeletePrice = (price: PlanPrice) => {
    Modal.confirm({
      // handleDeletePrice (título)
      title: `Eliminar precio ${humanizeInterval(price.interval, price.intervalCount)}`,
      content: "Esta acción no se puede deshacer.",
      okText: "Eliminar",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        try {
          await apiCenter.delete(`/plan-prices/${price.id}`);
          message.success("Precio eliminado");
          await fetchData();
        } catch (e) {
          console.error(e);
          message.error("No se pudo eliminar");
        }
      },
    });
  };

  const columns: ColumnsType<Plan> = [
    { title: "Code", dataIndex: "code", key: "code" },
    { title: "Nombre", dataIndex: "name", key: "name" },
    {
      title: "Precios",
      key: "prices",
      render: (_, row) => (
        <div>
          {row.prices.length === 0 ? <Tag color="red">Sin precios</Tag> : null}
          {row.prices.map((pr: any) => (
            <div key={pr.id} style={{ marginBottom: 6 }}>
              <Tag>{humanizeInterval(pr.interval, pr.intervalCount)}</Tag>{" "}
              <b>
                ${Number(pr.amount).toFixed(2)} {pr.currency}
              </b>{" "}
              {pr.isDefault ? <Tag color="green">default</Tag> : null}
              <Space size="small" style={{ marginLeft: 8 }}>
                <Button size="small" onClick={() => openEditPrice(row, pr)}>
                  Editar
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => handleDeletePrice(pr)}
                >
                  Eliminar
                </Button>
              </Space>
            </div>
          ))}
          <Divider style={{ margin: "8px 0" }} />
          <Button size="small" onClick={() => openCreatePrice(row)}>
            Agregar precio
          </Button>
        </div>
      ),
    },
    {
      title: "Activo",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (v: boolean) =>
        v ? <Tag color="green">activo</Tag> : <Tag color="red">inactivo</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => handleEditPlan(row)}>
            Editar plan
          </Button>
          <Button size="small" danger onClick={() => handleDeletePlan(row)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Planes"
      extra={
        <Space>
          <Button onClick={fetchData}>Refrescar</Button>
          <Button type="primary" onClick={handleCreatePlan}>
            Nuevo plan
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

      <PlanFormModal
        open={openPlan}
        loading={savingPlan}
        initialValues={initialPlan}
        title={editingPlan ? `Editar: ${editingPlan.name}` : "Nuevo plan"}
        okText={editingPlan ? "Guardar" : "Crear"}
        disableCode={!!editingPlan}
        onCancel={() => setOpenPlan(false)}
        onSubmit={handleSavePlan}
      />

      <PlanPriceFormModal
        open={openPrice}
        loading={savingPrice}
        initialValues={initialPrice}
        title={
          editingPrice
            ? `Editar precio (${humanizeInterval(editingPrice.interval, editingPrice.intervalCount)})`
            : `Nuevo precio para ${parentPlan?.name}`
        }
        okText={editingPrice ? "Guardar" : "Crear"}
        onCancel={() => setOpenPrice(false)}
        onSubmit={handleSavePrice}
      />
    </Card>
  );
}
