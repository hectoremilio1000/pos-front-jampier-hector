// src/pages/Reports/VentasTotalesReport.tsx

import { useState } from "react";
import { Button, DatePicker, Radio, Space, message, Typography } from "antd";
import { DesktopOutlined, PrinterOutlined } from "@ant-design/icons";
import type { DatePickerProps, RangePickerProps } from "antd/es/date-picker";
import dayjs, { Dayjs } from "dayjs";

import apiOrder from "@/components/apis/apiOrder";
import { useAuth } from "@/components/Auth/AuthContext";

const { RangePicker } = DatePicker;
const { Text } = Typography;

type ViewType = "pantalla" | "impresora";
type Mode = "turno" | "periodo";

interface Props {
  onClose: () => void;
}

interface SalesRow {
  fecha: string; // YYYY-MM-DD
  ventaBruta: number;
  impuestos: number;
  propina: number;
  cuentas: number;
  promedioPorPersona: number;
  promedioPorCuenta: number;
  descuentos: number;
  totalConImpuestos: number;
  categorias: Record<string, number>;
}

interface ApiResponse {
  type: Mode;
  range: {
    start: string;
    end: string;
  };
  data: SalesRow[];
}

type RestaurantInfo =
  | {
      name: string;
      address?: string | null;
      rfc?: string | null;
    }
  | null
  | undefined;

// const money = (n: number) =>
//   new Intl.NumberFormat("es-MX", {
//     style: "currency",
//     currency: "MXN",
//     minimumFractionDigits: 2,
//   }).format(n || 0);

/* ---------- Utilidad para imprimir por iframe (igual que en ProductosCompuestosReport) ---------- */
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

/* ---------- Construir HTML completo (pantalla + impresión) ---------- */
function buildSalesTotalsReportHtml(
  rows: SalesRow[],
  metaRange: { start: string; end: string } | undefined,
  mode: Mode,
  restaurant: RestaurantInfo
) {
  const today = new Date();
  const f = today.toLocaleDateString("es-MX");
  const h = today.toLocaleTimeString("es-MX");

  const restaurantName = restaurant?.name ?? "MI RESTAURANTE";
  const restaurantAddress = restaurant?.address ?? "";
  const restaurantRFC = (restaurant as any)?.rfc ?? "RFC PENDIENTE";

  const rangeText = metaRange
    ? metaRange.start === metaRange.end
      ? `Fecha: ${dayjs(metaRange.start).format("DD/MM/YYYY")}`
      : `Del ${dayjs(metaRange.start).format(
          "DD/MM/YYYY"
        )} al ${dayjs(metaRange.end).format("DD/MM/YYYY")}`
    : "";

  // Totales generales
  const totals = rows.reduce(
    (acc, row) => {
      acc.ventaBruta += row.ventaBruta || 0;
      acc.impuestos += row.impuestos || 0;
      acc.propina += row.propina || 0;
      acc.cuentas += row.cuentas || 0;
      acc.descuentos += row.descuentos || 0;
      acc.totalConImpuestos += row.totalConImpuestos || 0;
      return acc;
    },
    {
      ventaBruta: 0,
      impuestos: 0,
      propina: 0,
      cuentas: 0,
      descuentos: 0,
      totalConImpuestos: 0,
    }
  );

  const moneyHtml = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
    }).format(n || 0);

  let body = `
  <div style="font-family: Arial, sans-serif; font-size: 11px; margin: 20px;">
    <div style="font-size:12px; margin-bottom: 10px;">
      <div><b>${restaurantName}</b></div>
      <div>${restaurantAddress}</div>
      <div>${restaurantRFC}</div>
    </div>

    <div style="text-align:right;font-size:11px;">
      ${f}<br/>
      ${h}
    </div>

    <div style="font-size:14px;font-weight:bold;margin-top:10px;margin-bottom:4px;">
      REPORTE DE VENTAS TOTALES
    </div>
    <div style="font-size:11px;margin-bottom:10px;">
      Tipo: ${mode === "turno" ? "Por turno (un día)" : "Por período (rango)"}
      ${
        rangeText
          ? `<br/><span style="font-size:10px;">${rangeText}</span>`
          : ""
      }
    </div>

    <div style="margin-bottom:10px;border-top:1px solid #999;padding-top:6px;">
      <table style="width:100%;font-size:11px;">
        <tr>
          <td style="padding:2px 4px;"><b>Venta bruta total:</b></td>
          <td style="padding:2px 4px;text-align:right;">${moneyHtml(
            totals.ventaBruta
          )}</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;"><b>Impuestos totales:</b></td>
          <td style="padding:2px 4px;text-align:right;">${moneyHtml(
            totals.impuestos
          )}</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;"><b>Propinas totales:</b></td>
          <td style="padding:2px 4px;text-align:right;">${moneyHtml(
            totals.propina
          )}</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;"><b>Descuentos totales:</b></td>
          <td style="padding:2px 4px;text-align:right;">${moneyHtml(
            totals.descuentos
          )}</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;"><b>Total c/ impuestos:</b></td>
          <td style="padding:2px 4px;text-align:right;">${moneyHtml(
            totals.totalConImpuestos
          )}</td>
        </tr>
        <tr>
          <td style="padding:2px 4px;"><b># Cuentas:</b></td>
          <td style="padding:2px 4px;text-align:right;">${totals.cuentas}</td>
        </tr>
      </table>
    </div>
  `;

  body += `
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <tr style="background:#bcbcbc;">
        <th style="padding:4px;border:1px solid #555;">FECHA</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">VENTA BRUTA</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">IMPUESTOS</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">PROPINA</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">CUENTAS</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">PROM. PERSONA</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">PROM. CUENTA</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">DESCUENTOS</th>
        <th style="padding:4px;border:1px solid #555;text-align:right;">TOTAL C/ IMP.</th>
        <th style="padding:4px;border:1px solid #555;">CATEGORÍAS</th>
      </tr>
  `;

  rows.forEach((row) => {
    const categoriasText = Object.entries(row.categorias || {})
      .map(([name, amount]) => `${name}: ${moneyHtml(amount as number)}`)
      .join("<br/>");

    body += `
      <tr>
        <td style="padding:3px;border:1px solid #ddd;">${dayjs(
          row.fecha
        ).format("DD/MM/YYYY")}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.ventaBruta
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.impuestos
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.propina
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${
          row.cuentas
        }</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.promedioPorPersona
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.promedioPorCuenta
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.descuentos
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;text-align:right;">${moneyHtml(
          row.totalConImpuestos
        )}</td>
        <td style="padding:3px;border:1px solid #ddd;">${
          categoriasText || "<span style='color:#888;'>Sin ventas</span>"
        }</td>
      </tr>
    `;
  });

  body += `
    </table>
  </div>
  `;

  const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Reporte de ventas totales</title>
</head>
<body>
${body}
</body>
</html>
`;

  return htmlDoc;
}

/* ---------- Componente principal, mismo patrón que ProductosCompuestosReport ---------- */

export default function VentasTotalesReport({ onClose }: Props) {
  const { user } = useAuth();
  const [viewType, setViewType] = useState<ViewType>("pantalla");
  const [mode, setMode] = useState<Mode>("turno");
  const [singleDate, setSingleDate] = useState<Dayjs | null>(dayjs());
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [loading, setLoading] = useState(false);
  // const [rows, setRows] = useState<SalesRow[]>([]);
  // const [metaRange, setMetaRange] = useState<{ start: string; end: string }>();
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const onModeChange = (e: any) => {
    const value = e.target.value as Mode;
    setMode(value);
  };

  const onSingleDateChange: DatePickerProps["onChange"] = (date) => {
    setSingleDate(date);
  };

  const onRangeChange: RangePickerProps["onChange"] = (dates) => {
    if (!dates) {
      setRange([null, null]);
    } else {
      setRange([dates[0], dates[1]]);
    }
  };

  async function handleGenerate() {
    try {
      if (mode === "turno") {
        if (!singleDate) {
          return message.warning("Selecciona una fecha para el turno.");
        }
      } else {
        if (!range[0] || !range[1]) {
          return message.warning("Selecciona un rango de fechas.");
        }
      }

      setLoading(true);

      const params: any = { type: mode };

      if (mode === "turno") {
        params.date = singleDate!.format("YYYY-MM-DD");
      } else {
        params.startDate = range[0]!.format("YYYY-MM-DD");
        params.endDate = range[1]!.format("YYYY-MM-DD");
      }

      const { data } = await apiOrder.get<ApiResponse>("/reports/sales", {
        params,
      });

      const rowsData = data.data || [];
      // setRows(rowsData);
      // setMetaRange(data.range);

      if (!rowsData.length) {
        setPreviewHtml("");
        message.info("No hay ventas para el rango seleccionado.");
        return;
      }

      const htmlDoc = buildSalesTotalsReportHtml(
        rowsData,
        data.range,
        data.type,
        user?.restaurant ?? null
      );
      setPreviewHtml(htmlDoc);

      if (viewType === "impresora") {
        printViaIframe(htmlDoc);
        message.success("Enviando reporte de ventas a impresión…");
      }
    } catch (error) {
      console.error(error);
      message.error("Error al generar el reporte de ventas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 8, width: "100%", maxWidth: 1000 }}>
      <h2>Reporte de ventas totales</h2>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Tipo de reporte: turno / periodo */}
        <div>
          <strong>Tipo de reporte:</strong>
          <br />
          <Radio.Group
            style={{ marginTop: 6 }}
            value={mode}
            onChange={onModeChange}
          >
            <Radio.Button value="turno">Por turno (un día)</Radio.Button>
            <Radio.Button value="periodo">Por período (rango)</Radio.Button>
          </Radio.Group>
        </div>

        {/* Fecha o rango */}
        <div>
          <strong>Fechas:</strong>
          <div style={{ marginTop: 6 }}>
            {mode === "turno" ? (
              <Space>
                <Text>Fecha:</Text>
                <DatePicker
                  value={singleDate}
                  onChange={onSingleDateChange}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              </Space>
            ) : (
              <Space>
                <Text>Rango:</Text>
                <RangePicker
                  value={range}
                  onChange={onRangeChange}
                  format="DD/MM/YYYY"
                />
              </Space>
            )}
          </div>
        </div>

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

        {/* PREVIEW: se ve EXACTAMENTE como se imprime, usando un iframe */}
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
