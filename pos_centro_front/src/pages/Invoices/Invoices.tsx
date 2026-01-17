/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal, Select, Space, Typography, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import apiCenter from "@/components/apis/apiCenter";
import apiAuth from "@/components/apis/apiAuth";
import InvoicesTable, {
  type InvoiceRow,
  type InvoiceStatus,
} from "@/pages/Invoices/InvoicesTable";
import InvoiceAdjustModal, {
  type AdjustFormValues,
} from "@/pages/Invoices/InvoiceAdjustModal";
import InvoiceDueModal from "@/pages/Invoices/InvoiceDueModal";
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
  const [printOpen, setPrintOpen] = useState(false);
  const [printRow, setPrintRow] = useState<InvoiceRow | null>(null);

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
  const openPrint = (row: InvoiceRow) => {
    setPrintRow(row);
    setPrintOpen(true);
  };

  const statusLabel = (value?: string | null) => {
    const map: Record<string, string> = {
      pending: "Pendiente",
      paid: "Pagada",
      past_due: "Vencida",
      void: "Anulada",
    };
    return map[value || ""] ?? value ?? "-";
  };

  const renderNote = (row: InvoiceRow) => (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid #eee",
          paddingBottom: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          <span style={{ color: "#1677ff" }}>GrowthSuite</span> POS Centro
        </div>
      </div>

      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Nota por cobrar
      </Typography.Title>
      <Typography.Text type="secondary">Nota #{row.id}</Typography.Text>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <div>
          <strong>Restaurante:</strong>{" "}
          {row.restaurantName ||
            restaurantsMap.get(row.restaurantId) ||
            row.restaurantId}
        </div>
        <div>
          <strong>Suscripcion:</strong> #{row.subscriptionId}
        </div>
        <div>
          <strong>Estado:</strong> {statusLabel(row.status)}
        </div>
        <div>
          <strong>Vence:</strong>{" "}
          {row.dueAt ? new Date(row.dueAt).toLocaleString("es-MX") : "-"}
        </div>
        {row.paidAt && (
          <div>
            <strong>Pagada:</strong>{" "}
            {new Date(row.paidAt).toLocaleString("es-MX")}
          </div>
        )}
        {row.createdAt && (
          <div>
            <strong>Creada:</strong>{" "}
            {new Date(row.createdAt).toLocaleString("es-MX")}
          </div>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
              Concepto
            </th>
            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd" }}>
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: 8 }}>Base</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              ${Number(row.amountBase).toFixed(2)} {row.currency}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Descuento</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              -${Number(row.discount).toFixed(2)} {row.currency}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Ajustes</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              ${Number(row.adjustments).toFixed(2)} {row.currency}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8, fontWeight: "bold" }}>Total</td>
            <td style={{ padding: 8, textAlign: "right", fontWeight: "bold" }}>
              ${Number(row.amountDue).toFixed(2)} {row.currency}
            </td>
          </tr>
        </tbody>
      </table>

      {row.notes && (
        <div style={{ marginTop: 16 }}>
          <strong>Notas:</strong>
          <div style={{ whiteSpace: "pre-wrap" }}>{row.notes}</div>
        </div>
      )}
    </div>
  );

  const handlePrint = () => {
    if (!printRow) return;
    setTimeout(() => window.print(), 0);
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
    <>
      <style>{`
        @media print {
          .note-no-print { display: none !important; }
          body * { visibility: hidden !important; }
          .note-print-only, .note-print-only * { visibility: visible !important; }
          .note-print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }
      `}</style>

      <div className="note-no-print">
        <Card title="Notas">
          <Space style={{ marginBottom: 12 }}>
            <Select<InvoiceStatus>
              allowClear
              placeholder="Filtrar estado"
              value={status}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: "pending", label: "Pendiente" },
                { value: "paid", label: "Pagada" },
                { value: "past_due", label: "Vencida" },
                { value: "void", label: "Anulada" },
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
            onOpenPrint={openPrint}
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

        <Modal
          title={`Imprimir nota #${printRow?.id ?? ""}`}
          open={printOpen}
          onCancel={() => setPrintOpen(false)}
          footer={
            <Space>
              <Button onClick={() => setPrintOpen(false)}>Cerrar</Button>
              <Button type="primary" disabled={!printRow} onClick={handlePrint}>
                Imprimir
              </Button>
            </Space>
          }
          width={720}
        >
          {printRow ? renderNote(printRow) : null}
        </Modal>
      </div>

      <div className="note-print-only" style={{ display: "none" }}>
        {printRow ? renderNote(printRow) : null}
      </div>
    </>
  );
}
