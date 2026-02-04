// src/pages/Reports/modals/VentasMeserosReportModal.tsx
import { useState } from "react";
import { Button, DatePicker, Radio, Space, message } from "antd";
import type { RadioChangeEvent } from "antd";
import type { Dayjs } from "dayjs";
import { DesktopOutlined, PrinterOutlined } from "@ant-design/icons";

import apiOrder from "@/components/apis/apiOrder"; // ⬅️ si lo pones en pos-cash, cambia a apiCash
import { useAuth } from "@/components/Auth/AuthContext";

type ViewType = "pantalla" | "impresora";
type TypeFilter = "turno" | "periodo";

interface Props {
  onClose: () => void;
}

type WaiterRow = {
  waiterId: number;
  waiterName: string;
  ventaBruta: number;
  impuestos: number;
  propina: number;
  descuentos: number;
  totalConImpuestos: number;
  cuentas: number;
  personas: number;
  promedioPorPersona: number;
  promedioPorCuenta: number;
};

// imprimir sin abrir pestaña
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
  }

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 800);
  }, 300);
}

function buildWaiterSalesHtml(opts: {
  rows: WaiterRow[];
  type: TypeFilter;
  date?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  restaurant?: { name: string; address?: string | null } | null;
}) {
  const { rows, type, date, startDate, endDate, restaurant } = opts;

  const now = new Date();
  const f = now.toLocaleDateString("es-MX");
  const h = now.toLocaleTimeString("es-MX");

  const restaurantName = restaurant?.name ?? "MI RESTAURANTE";
  const restaurantAddress = restaurant?.address ?? "";
  const restaurantRFC = "RFC PENDIENTE";

  const title = "REPORTE DE VENTAS POR MESERO";

  const filtroLine =
    type === "turno"
      ? `Turno / Día: ${date ?? "-"}`
      : `Período: ${startDate ?? "-"} a ${endDate ?? "-"}`;

  const rowsHtml = rows
    .map((r) => {
      return `
      <tr>
        <td style="padding:4px;border-bottom:1px solid #eee;">${r.waiterName}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">${r.cuentas}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">${r.personas}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.ventaBruta.toFixed(
          2
        )}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.impuestos.toFixed(
          2
        )}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.propina.toFixed(
          2
        )}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.descuentos.toFixed(
          2
        )}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.totalConImpuestos.toFixed(
          2
        )}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.promedioPorPersona.toFixed(
          2
        )}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right;">$${r.promedioPorCuenta.toFixed(
          2
        )}</td>
      </tr>
    `;
    })
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      margin: 20px;
    }
    .header { font-size: 12px; margin-bottom: 10px; }
    .title { font-size: 14px; font-weight: bold; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th {
      background: #ccc;
      padding: 4px;
      border: 1px solid #555;
      font-weight: bold;
      text-align: center;
    }
    td { padding: 4px; }
    .filters { font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div><b>${restaurantName}</b></div>
    <div>${restaurantAddress}</div>
    <div>${restaurantRFC}</div>
  </div>

  <div style="text-align:right;font-size:11px;">
    ${f}<br/>
    ${h}
  </div>

  <div class="title">${title}</div>

  <div class="filters">
    ${filtroLine}
  </div>

  <table>
    <thead>
      <tr>
        <th>MESERO</th>
        <th>CUENTAS</th>
        <th>PERSONAS</th>
        <th>VENTA BRUTA</th>
        <th>IMPUESTOS</th>
        <th>PROPINA</th>
        <th>DESCUENTOS</th>
        <th>TOTAL</th>
        <th>PROM / PERSONA</th>
        <th>PROM / CUENTA</th>
      </tr>
    </thead>
    <tbody>
      ${
        rowsHtml ||
        `<tr><td colspan="10" style="text-align:center;">Sin datos</td></tr>`
      }
    </tbody>
  </table>
</body>
</html>
`;

  return html;
}

export default function VentasMeserosReportModal({ onClose }: Props) {
  const { user } = useAuth();

  const [viewType, setViewType] = useState<ViewType>("pantalla");
  const [type, setType] = useState<TypeFilter>("turno");
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState<Dayjs | null>(null);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [previewHtml, setPreviewHtml] = useState<string>("");

  const handleTypeChange = (e: RadioChangeEvent) => {
    setType(e.target.value as TypeFilter);
  };

  async function handleGenerate() {
    if (type === "turno" && !date) {
      message.warning("Selecciona la fecha del turno");
      return;
    }
    if (type === "periodo" && (!range || !range[0] || !range[1])) {
      message.warning("Selecciona el período de fechas");
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        type,
      };

      if (type === "turno" && date) {
        params.date = date.format("YYYY-MM-DD");
      }
      if (type === "periodo" && range && range[0] && range[1]) {
        params.startDate = range[0].format("YYYY-MM-DD");
        params.endDate = range[1].format("YYYY-MM-DD");
      }

      const res = await apiOrder.get("/reports/waiter-sales", { params });

      const payload = res.data;
      const rows: WaiterRow[] = Array.isArray(payload)
        ? payload
        : payload?.data || [];

      if (!rows.length) {
        message.info("No hay datos para los filtros seleccionados");
        setPreviewHtml("");
        return;
      }

      const dateStr =
        type === "turno" && date ? date.format("YYYY-MM-DD") : undefined;
      const startStr =
        type === "periodo" && range && range[0]
          ? range[0].format("YYYY-MM-DD")
          : undefined;
      const endStr =
        type === "periodo" && range && range[1]
          ? range[1].format("YYYY-MM-DD")
          : undefined;

      const html = buildWaiterSalesHtml({
        rows,
        type,
        date: dateStr ?? null,
        startDate: startStr ?? null,
        endDate: endStr ?? null,
        restaurant: user?.restaurant ?? null,
      });

      setPreviewHtml(html);

      if (viewType === "impresora") {
        printViaIframe(html);
        message.success("Enviando reporte de ventas por mesero a impresión…");
      }
    } catch (e) {
      console.error(e);
      message.error("Error al obtener el reporte de ventas por mesero");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 8, width: "100%", maxWidth: 900 }}>
      <h2>Ventas por mesero</h2>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Tipo: turno / periodo */}
        <div>
          <strong>Tipo de filtro:</strong>
          <Radio.Group
            style={{ marginLeft: 8 }}
            value={type}
            onChange={handleTypeChange}
          >
            <Radio value="turno">Por turno (día)</Radio>
            <Radio value="periodo">Por período</Radio>
          </Radio.Group>
        </div>

        {/* Fecha o rango */}
        {type === "turno" ? (
          <div>
            <strong>Fecha del turno:</strong>
            <div style={{ marginTop: 6 }}>
              <DatePicker
                value={date as any}
                onChange={(d) => setDate(d as Dayjs | null)}
                format="YYYY-MM-DD"
              />
            </div>
          </div>
        ) : (
          <div>
            <strong>Período:</strong>
            <div style={{ marginTop: 6 }}>
              <DatePicker.RangePicker
                value={range as any}
                onChange={(vals) =>
                  setRange(vals as [Dayjs | null, Dayjs | null] | null)
                }
                format="YYYY-MM-DD"
              />
            </div>
          </div>
        )}

        {/* Tipo de vista */}
        <div>
          <strong>Tipo de vista:</strong>
          <Space style={{ marginTop: 8 }}>
            <Button
              icon={<DesktopOutlined />}
              type={viewType === "pantalla" ? "primary" : "default"}
              onClick={() => setViewType("pantalla")}
            >
              Pantalla
            </Button>
            <Button
              icon={<PrinterOutlined />}
              type={viewType === "impresora" ? "primary" : "default"}
              onClick={() => setViewType("impresora")}
            >
              Impresora
            </Button>
          </Space>
        </div>

        {/* Botón generar */}
        <Button type="primary" onClick={handleGenerate} loading={loading}>
          Generar reporte
        </Button>

        {/* Preview en iframe (igual que impresión) */}
        {viewType === "pantalla" && previewHtml && (
          <iframe
            style={{
              width: "100%",
              height: "70vh",
              border: "1px solid #ddd",
            }}
            ref={(node) => {
              if (node && previewHtml) {
                const doc =
                  node.contentDocument || node.contentWindow?.document;
                if (doc) {
                  doc.open();
                  doc.write(previewHtml);
                  doc.close();
                }
              }
            }}
          />
        )}

        <Button onClick={onClose} danger>
          Cerrar
        </Button>
      </Space>
    </div>
  );
}
