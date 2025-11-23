import {
  Modal,
  Space,
  DatePicker,
  Select,
  Button,
  message,
  Typography,
  Radio,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import apiCashKiosk from "@/components/apis/apiCashKiosk";

const { Title } = Typography;

type ClosedShiftLite = {
  id: number;
  openedAt: string; // ISO
  closedAt: string; // ISO
};

type XCutReport = {
  // datos de cabecera
  company: { name: string; rfc?: string; address?: string };
  shift: {
    id: number;
    openedAt: string;
    closedAt: string;
    stationName?: string;
    turnName?: string;
  };
  // CAJA
  openingCash: number;
  totalsByMethod: Array<{ name: string; amount: number }>;
  cashDeposits: number; // depósitos efectivo (si aplica)
  cashWithdrawals: number; // retiros efectivo
  tipsPaid: number; // propinas pagadas
  finalBalance: number; // saldo final
  finalCash: number; // efectivo final
  // FORMAS DE PAGO
  salesByMethod: Array<{ name: string; salesAmount: number }>;
  tipsByMethod: Array<{ name: string; tipAmount: number }>;
  // VENTAS POR TIPO PRODUCTO
  byCategory: Array<{
    name: string;
    salesAmount: number;
    salesCount: number;
    pct: number;
  }>;
  // VENTAS POR SERVICIO
  byService: Array<{
    name: string;
    salesAmount: number;
    salesCount: number;
    pct: number;
  }>;
  // Totales de venta (si los expones)
  totals?: {
    subtotal?: number;
    discounts?: number;
    net?: number;
    taxes?: Array<{ rateLabel: string; base: number; tax: number }>;
    taxesTotal?: number;
    gross?: number;
    ordersCount?: number;
    ordersCanceled?: number;
    avgTicket?: number;
    guests?: number;
    tipsTotal?: number;
    // folios
    folioSeries?: string;
    folioFrom?: string;
    folioTo?: string;
  };
};

export default function XCutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [shifts, setShifts] = useState<ClosedShiftLite[]>([]);
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [mode, setMode] = useState<"screen" | "print" | "excel">("screen");
  const [loading, setLoading] = useState(false);

  const dateStr = useMemo(() => date.format("YYYY-MM-DD"), [date]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const { data } = await apiCashKiosk.get(`/shifts/closed`, {
          params: { date: dateStr },
          validateStatus: () => true,
        });
        const rows: ClosedShiftLite[] = Array.isArray(data) ? data : [];
        setShifts(rows);
        setShiftId(rows.length ? Number(rows[0].id) : null);
      } catch (e) {
        message.error("No fue posible cargar turnos cerrados");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, dateStr]);

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  function formatDT(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function printViaIframe(html: string) {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch {}
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    } else {
      document.body.removeChild(iframe);
    }
  }

  function downloadCSV(name: string, rows: Array<string[]>) {
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildHtml(r: XCutReport) {
    // HTML muy similar al layout del PDF “Corte de caja X” que muestras
    // con bloques: CAJA / FORMAS DE PAGO VENTAS / PROPINA / POR TIPO DE PRODUCTO / SERVICIO … :contentReference[oaicite:5]{index=5}
    const line = `<div class="sep"></div>`;
    const fmt = (n?: number) => `$${Number(n ?? 0).toFixed(2)}`;
    const enc = (s?: string) =>
      (s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const methodsSales =
      (r.salesByMethod || [])
        .map((m) => `${enc(m.name)}: ${fmt(m.salesAmount)}`)
        .join("<br/>") || "—";
    const methodsTips =
      (r.tipsByMethod || [])
        .map((m) => `${enc(m.name)}: ${fmt(m.tipAmount)}`)
        .join("<br/>") || "—";
    const totalsByMethod =
      (r.totalsByMethod || [])
        .map((m) => `${enc(m.name)}: ${fmt(m.amount)}`)
        .join("<br/>") || "—";

    const byCat =
      (r.byCategory || [])
        .map(
          (c) =>
            `${enc(c.name)}: ${fmt(c.salesAmount)} (${Math.round((c.pct || 0) * 100)}%) ${c.salesCount}`
        )
        .join("<br/>") || "—";
    const bySvc =
      (r.byService || [])
        .map(
          (s) =>
            `${enc(s.name)}: ${fmt(s.salesAmount)} (${Math.round((s.pct || 0) * 100)}%)`
        )
        .join("<br/>") || "—";

    const taxes =
      (r.totals?.taxes || [])
        .map(
          (t) =>
            `VENTA ${enc(t.rateLabel)}: ${fmt(t.base)}<br/>IMPUESTO ${enc(t.rateLabel)}: ${fmt(t.tax)}`
        )
        .join("<br/>") || "";

    return `
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Corte X</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  body { font-family: "Courier New", monospace; font-size: 14px; margin:0; padding:0; width:78mm; }
  .center { text-align:center; }
  .bold { font-weight:700; }
  .sep { margin:6px 0; border-top:1px dashed #000; }
  .title { font-size:16px; font-weight:700; }
  .small { font-size:12px; }
</style></head>
<body>
  <div class="center bold">${enc(r.company.name)}</div>
  <div class="center small">${enc(r.company.rfc || "")}</div>
  <div class="center small">${enc(r.company.address || "")}</div>

  <div class="center title" style="margin-top:4px;">CORTE DE CAJA X</div>
  <div class="center small">DEL ${formatDT(r.shift.openedAt)}</div>
  <div class="center small">AL  ${formatDT(r.shift.closedAt)}</div>
  <div class="center small">TURNO: ${r.shift.id} ${r.shift.stationName ? " · ESTACIÓN: " + enc(r.shift.stationName) : ""}</div>
  ${line}

  <div class="bold">CAJA</div>
  +EFECTIVO INICIAL: ${fmt(r.openingCash)}<br/>
  ${totalsByMethod}<br/>
  +DEPÓSITOS EFECTIVO: ${fmt(r.cashDeposits)}<br/>
  -RETIROS EFECTIVO: ${fmt(r.cashWithdrawals)}<br/>
  -PROPINAS PAGADAS: ${fmt(r.tipsPaid)}<br/>
  ${line}
  =SALDO FINAL: ${fmt(r.finalBalance)}<br/>
  EFECTIVO FINAL: ${fmt(r.finalCash)}<br/>

  <div class="bold" style="margin-top:6px;">FORMA DE PAGO VENTAS</div>
  ${methodsSales}<br/>
  ${line}
  <div class="bold">FORMA DE PAGO PROPINA</div>
  ${methodsTips}<br/>
  ${line}

  <div class="bold">VENTA (NO INCLUYE IMPUESTOS)</div>
  <div class="bold">POR TIPO DE PRODUCTO</div>
  ${byCat}<br/>

  <div class="bold" style="margin-top:4px;">POR TIPO DE SERVICIO</div>
  ${bySvc}<br/>

  ${line}
  ${r.totals?.subtotal != null ? `SUBTOTAL : ${fmt(r.totals?.subtotal)}<br/>` : ""}
  ${r.totals?.discounts != null ? `-DESCUENTOS : ${fmt(r.totals?.discounts)}<br/>` : ""}
  ${r.totals?.net != null ? `VENTA NETA : ${fmt(r.totals?.net)}<br/>` : ""}
  ${line}
  ${taxes ? taxes + "<br/>" : ""}
  ${r.totals?.taxesTotal != null ? `IMPUESTOS TOTAL: ${fmt(r.totals?.taxesTotal)}<br/>` : ""}
  ${line}
  ${r.totals?.gross != null ? `VENTAS CON IMP.: ${fmt(r.totals?.gross)}<br/>` : ""}
</body></html>`.trim();
  }

  function toCSVRows(r: XCutReport): string[][] {
    const rows: string[][] = [];
    rows.push(["Empresa", r.company.name]);
    rows.push(["RFC", r.company.rfc || ""]);
    rows.push(["Dirección", r.company.address || ""]);
    rows.push([]);
    rows.push(["CORTE DE CAJA X"]);
    rows.push([
      "DEL",
      r.shift.openedAt,
      "AL",
      r.shift.closedAt,
      "TURNO",
      String(r.shift.id),
    ]);
    rows.push([]);
    rows.push(["CAJA"]);
    rows.push(["EFECTIVO INICIAL", r.openingCash.toFixed(2)]);
    r.totalsByMethod?.forEach((m) => rows.push([m.name, m.amount.toFixed(2)]));
    rows.push(["DEPÓSITOS EFECTIVO", r.cashDeposits.toFixed(2)]);
    rows.push(["RETIROS EFECTIVO", r.cashWithdrawals.toFixed(2)]);
    rows.push(["PROPINAS PAGADAS", r.tipsPaid.toFixed(2)]);
    rows.push(["SALDO FINAL", r.finalBalance.toFixed(2)]);
    rows.push(["EFECTIVO FINAL", r.finalCash.toFixed(2)]);
    rows.push([]);
    rows.push(["FORMA DE PAGO VENTAS"]);
    r.salesByMethod?.forEach((m) =>
      rows.push([m.name, m.salesAmount.toFixed(2)])
    );
    rows.push([]);
    rows.push(["FORMA DE PAGO PROPINA"]);
    r.tipsByMethod?.forEach((m) => rows.push([m.name, m.tipAmount.toFixed(2)]));
    rows.push([]);
    rows.push(["VENTA POR TIPO DE PRODUCTO"]);
    r.byCategory?.forEach((c) =>
      rows.push([
        c.name,
        c.salesAmount.toFixed(2),
        String(c.salesCount),
        `${Math.round((c.pct || 0) * 100)}%`,
      ])
    );
    rows.push([]);
    rows.push(["VENTA POR TIPO DE SERVICIO"]);
    r.byService?.forEach((s) =>
      rows.push([
        s.name,
        s.salesAmount.toFixed(2),
        String(s.salesCount),
        `${Math.round((s.pct || 0) * 100)}%`,
      ])
    );
    return rows;
  }

  const handleExecute = async () => {
    if (!shiftId) return message.error("Selecciona un turno");
    try {
      setLoading(true);
      const { data } = await apiCashKiosk.get(`/shifts/${shiftId}/xcut`, {
        validateStatus: () => true,
      });
      if (!data || data.error) {
        return message.error(data?.error || "No fue posible obtener el corte");
      }
      const r = data as XCutReport;
      if (mode === "screen") {
        const html = buildHtml(r);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer,width=480,height=800");
      } else if (mode === "print") {
        const html = buildHtml(r);
        printViaIframe(html);
      } else {
        const rows = toCSVRows(r);
        downloadCSV(`corte_x_shift_${shiftId}_${dateStr}`, rows);
      }
    } catch (e: any) {
      message.error(String(e?.message || "No fue posible ejecutar el corte X"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Corte de caja X"
      footer={null}
      destroyOnClose
      width={720}
      confirmLoading={loading}
    >
      <Space direction="vertical" className="w-full">
        <Space align="end" className="w-full justify-between">
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Filtrar por fecha
            </Title>
            <DatePicker value={date} onChange={(d) => d && setDate(d)} />
          </Space>

          <Space direction="vertical" size={2} style={{ minWidth: 380 }}>
            <Title level={5} style={{ margin: 0 }}>
              Turnos cerrados del día
            </Title>
            <Select
              value={shiftId ?? undefined}
              style={{ width: 380 }}
              placeholder="Selecciona un turno"
              options={shifts.map((s) => ({
                label: `Turno #${s.id} — Apertura: ${formatDT(s.openedAt)} · Cierre: ${formatDT(s.closedAt)}`,
                value: s.id,
              }))}
              onChange={(v) => setShiftId(Number(v))}
              loading={loading}
            />
          </Space>
        </Space>

        <Space
          align="center"
          className="w-full justify-between"
          style={{ marginTop: 8 }}
        >
          <Radio.Group
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="screen">👁️ Pantalla</Radio.Button>
            <Radio.Button value="print">🖨️ Impresora</Radio.Button>
            <Radio.Button value="excel">📊 Excel (CSV)</Radio.Button>
          </Radio.Group>

          <Button
            type="primary"
            onClick={handleExecute}
            loading={loading}
            icon={<span>▶️</span>}
          >
            Ejecutar
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}
