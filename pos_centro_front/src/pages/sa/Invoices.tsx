/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, Select, Space, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import apiCenter from "@/apis/apiCenter";
import apiAuth from "@/apis/apiAuth";
import InvoicesTable, {
  type InvoiceRow,
  type InvoiceStatus,
} from "@/components/InvoicesTable";
import InvoiceAdjustModal, {
  type AdjustFormValues,
} from "@/components/InvoiceAdjustModal";
import InvoiceDueModal from "@/components/InvoiceDueModal";
import PayModal from "@/components/PayModal";
import PaymentsDrawer from "@/components/PaymentsDrawer";

type Restaurant = { id: number; name: string };

export default function Invoices() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatusFilter] = useState<InvoiceStatus | undefined>(
    undefined
  );
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | undefined>(
    undefined
  );

  // Ajuste/Descuento
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [adjustInitial, setAdjustInitial] = useState<AdjustFormValues>({});

  // Editar vencimiento
  const [dueOpen, setDueOpen] = useState(false);
  const [dueLoading, setDueLoading] = useState(false);
  const [dueRow, setDueRow] = useState<InvoiceRow | null>(null);
  const [dueAt, setDueAt] = useState<Dayjs | null>(null);
  const [dueNotes, setDueNotes] = useState<string>("");

  // Cobrar
  const [payOpen, setPayOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<InvoiceRow | null>(null);

  // Pagos (historial)
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [paymentsInvoice, setPaymentsInvoice] = useState<InvoiceRow | null>(
    null
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await apiCenter.get("/invoices", {
        params: { status, restaurantId },
      });
      const norm: InvoiceRow[] = (data ?? []).map((r: any) => ({
        ...r,
        amountBase: Number(r.amountBase ?? 0),
        discount: Number(r.discount ?? 0),
        adjustments: Number(r.adjustments ?? 0),
        amountDue: Number(r.amountDue ?? 0),
      }));
      setRows(norm);
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar facturas");
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

  // Handlers de acciones
  const openPay = (row: InvoiceRow) => {
    setPayInvoice(row);
    setPayOpen(true);
  };
  const openPayments = (row: InvoiceRow) => {
    setPaymentsInvoice(row);
    setPaymentsOpen(true);
  };
  const openAdjust = (id: number) => {
    const row = rows.find((r) => r.id === id);
    setAdjustId(id);
    setAdjustInitial({
      discount: row?.discount ?? 0,
      adjustment: row?.adjustments ?? 0,
      notes: row?.notes ?? "",
    });
    setAdjustOpen(true);
  };
  const openEditDue = (row: InvoiceRow) => {
    setDueRow(row);
    setDueAt(row.dueAt ? dayjs(row.dueAt) : null);
    setDueNotes(row.notes ?? "");
    setDueOpen(true);
  };

  const submitAdjust = async (v: AdjustFormValues) => {
    try {
      setAdjustLoading(true);
      await apiCenter.post(`/invoices/${adjustId}/adjust`, {
        mode: "set",
        discount: v.discount ?? 0,
        adjustments: v.adjustment ?? 0,
        notes: v.notes ?? undefined,
      });
      message.success("Ajuste aplicado");
      setAdjustOpen(false);
      fetchAll();
    } catch (e: unknown) {
      console.error(e);
      const err = e as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const msg =
        err?.response?.data?.error ?? err?.message ?? "No se pudo ajustar";
      message.error(msg);
    } finally {
      setAdjustLoading(false);
    }
  };

  const saveDue = async () => {
    if (!dueRow) return;
    try {
      setDueLoading(true);
      await apiCenter.post(`/invoices/${dueRow.id}/update-meta`, {
        dueAt: dueAt ? dueAt.toISOString() : undefined,
        notes: dueNotes,
      });
      message.success("Vencimiento actualizado");
      setDueOpen(false);
      fetchAll();
    } catch (e) {
      console.error(e);
      message.error("No se pudo actualizar el vencimiento");
    } finally {
      setDueLoading(false);
    }
  };

  const voidInvoice = (id: number) => {
    Modal.confirm({
      title: "Anular factura",
      content: "Esta acción no se puede deshacer.",
      okText: "Anular",
      okButtonProps: { danger: true },
      cancelText: "Cancelar",
      async onOk() {
        try {
          await apiCenter.post(`/invoices/${id}/set-status`, {
            status: "void",
          });
          message.success("Factura anulada");
          fetchAll();
        } catch (e) {
          console.error(e);
          message.error("No se pudo anular");
        }
      },
    });
  };

  const restaurantsMap = useMemo(() => {
    const m = new Map<number, string>();
    restaurants.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [restaurants]);

  return (
    <Card title="Facturas">
      <Space style={{ marginBottom: 12 }}>
        <Select<InvoiceStatus>
          allowClear
          placeholder="Filtrar status"
          value={status}
          onChange={(v) => setStatusFilter(v)}
          options={[
            { value: "pending", label: "pending" },
            { value: "paid", label: "paid" },
            { value: "past_due", label: "past_due" },
            { value: "void", label: "void" },
          ]}
          style={{ width: 180 }}
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
        <Button onClick={fetchAll}>Refrescar</Button>
      </Space>

      <InvoicesTable
        rows={rows}
        restaurantsMap={restaurantsMap}
        loading={loading}
        onOpenPay={openPay}
        onOpenAdjust={openAdjust}
        onOpenEditDue={openEditDue}
        onOpenPayments={openPayments} // puedes quitarlo si aún no usas el Drawer
        onVoid={voidInvoice}
      />

      {/* Ajuste / Descuento */}
      <InvoiceAdjustModal
        open={adjustOpen}
        loading={adjustLoading}
        initialValues={adjustInitial}
        onCancel={() => setAdjustOpen(false)}
        onSubmit={submitAdjust}
      />

      {/* Vencimiento */}
      <InvoiceDueModal
        open={dueOpen}
        loading={dueLoading}
        value={dueAt}
        notes={dueNotes}
        onChangeDate={setDueAt}
        onChangeNotes={setDueNotes}
        onCancel={() => setDueOpen(false)}
        onSubmit={saveDue}
      />

      {/* Cobrar */}
      <PayModal
        open={payOpen}
        invoice={payInvoice}
        onClose={() => setPayOpen(false)}
        onPaid={fetchAll}
      />

      {/* Pagos… (historial) */}
      <PaymentsDrawer
        open={paymentsOpen}
        invoice={paymentsInvoice}
        onClose={() => setPaymentsOpen(false)}
        onChanged={fetchAll}
      />
    </Card>
  );
}
