import { useState } from "react";
import { Button, Select, Space, Table, message } from "antd";
import { PrinterOutlined, DesktopOutlined } from "@ant-design/icons";

import apiOrder from "@/components/apis/apiOrder";
import apiAuth from "@/components/apis/apiAuth";
import { useAuth } from "@/components/Auth/AuthContext";
import { printCatalogoProductos } from "../utils/printCatalogo";

interface Props {
  onClose: () => void;
}

type ViewType = "pantalla" | "impresora";

const CATALOG_OPTIONS = [
  { label: "Productos", value: "productos" },
  { label: "Insumos", value: "insumos" },
  { label: "Meseros", value: "meseros" },
  { label: "Cajeros", value: "cajeros" },
  { label: "Clientes", value: "clientes" },
  { label: "Usuarios", value: "usuarios" },
  { label: "Proveedores", value: "proveedores" },
] as const;

type CatalogValue = (typeof CATALOG_OPTIONS)[number]["value"];

/* =========================
   1) Etiquetas en español
   ========================= */

const COMMON_COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  restaurantId: "Restaurante (ID)",
  code: "Código",
  name: "Nombre",
  fullName: "Nombre completo",
  email: "Correo",
  status: "Estatus",
  role: "Rol",
  restaurant: "Restaurante",

  basePrice: "Precio base",
  priceGross: "Precio final",
  taxRate: "IVA (%)",
  isEnabled: "Activo",

  group: "Grupo",
  subgroup: "Subgrupo",
  areaImpresion: "Área de impresión",

  createdAt: "Creado",
  updatedAt: "Actualizado",
  passwordChangedAt: "Cambio de contraseña",
};

const CATALOG_COLUMN_LABELS: Partial<
  Record<CatalogValue, Record<string, string>>
> = {
  productos: {
    // por si quieres forzar algún nombre distinto sólo aquí
    printArea: "Área impresión (ID)",
  },
};

const DEFAULT_EXCLUDE_KEYS = new Set<string>([
  // casi siempre estorba en reportes
  "updatedAt",
]);

const CATALOG_EXCLUDE_KEYS: Partial<Record<CatalogValue, string[]>> = {
  productos: [
    "restaurantId",
    "groupId",
    "subgroupId",
    "printArea",
    "modifierGroups",
    "productModifierGroups",
  ],
  usuarios: ["restaurantId", "roleId", "passwordChangedAt"],
  meseros: ["restaurantId", "roleId", "passwordChangedAt"],
  cajeros: ["restaurantId", "roleId", "passwordChangedAt"],
  clientes: [],
  proveedores: [],
  insumos: [],
};

const CATALOG_COLUMN_ORDER: Partial<Record<CatalogValue, string[]>> = {
  productos: [
    "id",
    "code",
    "name",
    "group",
    "subgroup",
    "areaImpresion",
    "basePrice",
    "taxRate",
    "priceGross",
    "isEnabled",
    "createdAt",
  ],
  usuarios: [
    "id",
    "fullName",
    "email",
    "role",
    "status",
    "restaurant",
    "createdAt",
  ],
  meseros: [
    "id",
    "fullName",
    "email",
    "role",
    "status",
    "restaurant",
    "createdAt",
  ],
  cajeros: [
    "id",
    "fullName",
    "email",
    "role",
    "status",
    "restaurant",
    "createdAt",
  ],
};

/* =========================
   2) Helpers
   ========================= */

function getCatalogLabel(value?: string) {
  return CATALOG_OPTIONS.find((o) => o.value === value)?.label ?? "Catálogo";
}

function humanizeKey(key: string) {
  // camelCase / snake_case -> "Restaurant id"
  const spaced = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getColumnTitle(catalog: CatalogValue, key: string) {
  const catalogLabels = CATALOG_COLUMN_LABELS[catalog] ?? {};
  return catalogLabels[key] ?? COMMON_COLUMN_LABELS[key] ?? humanizeKey(key);
}

function isIsoDateString(v: any) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v);
}

function toNumberMaybe(v: any) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatCurrency(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function formatCellValue(value: any, key: string, currency: string) {
  if (value === null || value === undefined || value === "") return "";

  // booleanos
  if (typeof value === "boolean") {
    if (key === "isEnabled") return value ? "Activo" : "Inactivo";
    return value ? "Sí" : "No";
  }

  // estatus típico
  if (key === "status" && typeof value === "string") {
    const v = value.toLowerCase();
    if (v === "active") return "Activo";
    if (v === "inactive") return "Inactivo";
    if (v === "disabled") return "Deshabilitado";
    return value;
  }

  // fechas ISO
  if (isIsoDateString(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toLocaleString("es-MX");
    return value;
  }

  // IVA (%)
  if (key === "taxRate") {
    const n = toNumberMaybe(value);
    if (n !== null) return `${n.toFixed(2)}%`;
    return String(value);
  }

  // precios/costos (basePrice, priceGross, etc.)
  if (/price|cost|amount|total|subtotal/i.test(key)) {
    const n = toNumberMaybe(value);
    if (n !== null) return formatCurrency(n, currency);
    return String(value);
  }

  return String(value);
}

function escapeHtml(s: string) {
  return s
    .replace("&", "&amp;")
    .replace("<", "&lt;")
    .replace(">", "&gt;")
    .replace('"', "&quot;")
    .replace("'", "&#039;");
}

/* =========================
   3) Normalizador (tu base)
   ========================= */

// 🔥 Normalizador para columnas: evita objetos y errores
function flattenRow(row: any) {
  const output: any = {};

  for (const key of Object.keys(row)) {
    const value = row[key];

    if (value === null || value === undefined) {
      output[key] = "";
    }
    // Si es un objeto
    else if (typeof value === "object") {
      // Si tiene name → usarlo
      if ("name" in value) {
        output[key] = value.name;
      }
      // Si es un array → cantidad
      else if (Array.isArray(value)) {
        output[key] = `${value.length} items`;
      }
      // Si es objeto complejo → ignorar
      else {
        // Ignorado
      }
    }
    // Si es primitivo
    else {
      output[key] = value;
    }
  }

  return output;
}

/* =========================
   4) Impresión por iframe
   ========================= */

// 🔥 Impresión silenciosa sin abrir nueva pestaña (igual que POS CASH)
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
    doc.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <title>Reporte</title>
            <style>
              body { font-family: Arial, sans-serif; }
              h2 { margin: 0 0 12px 0; }
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #333; padding: 6px; font-size: 12px; }
              th { background: #f3f3f3; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 300);">
            ${html}
          </body>
        </html>
      `);
    doc.close();
  }

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1500);
}

/* =========================
   5) Column builder
   ========================= */

function buildReportColumns(params: {
  catalog: CatalogValue;
  flatData: any[];
  currency: string;
}) {
  const { catalog, flatData, currency } = params;

  const sample = flatData[0] ?? {};
  const sampleKeys = Object.keys(sample);

  const exclude = new Set<string>([...DEFAULT_EXCLUDE_KEYS]);
  for (const k of CATALOG_EXCLUDE_KEYS[catalog] ?? []) exclude.add(k);

  const preferredOrder = (CATALOG_COLUMN_ORDER[catalog] ?? []).filter(
    (k) => sampleKeys.includes(k) && !exclude.has(k)
  );

  const rest = sampleKeys.filter(
    (k) => !exclude.has(k) && !preferredOrder.includes(k)
  );

  const finalKeys = [...preferredOrder, ...rest];

  return finalKeys.map((key) => ({
    title: getColumnTitle(catalog, key),
    dataIndex: key,
    ellipsis: true,
    render: (value: any) => formatCellValue(value, key, currency),
  }));
}

export default function CatalogosVarios({ onClose }: Props) {
  const { user } = useAuth();

  const [catalog, setCatalog] = useState<CatalogValue | undefined>(undefined);
  const [viewType, setViewType] = useState<ViewType>("pantalla");
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  async function handleFetch() {
    if (!catalog) {
      message.warning("Selecciona un catálogo primero");
      return;
    }

    const currency = user?.restaurant?.currency ?? "MXN";

    setLoading(true);
    try {
      let res;

      /* --- APIs por catálogo --- */
      if (catalog === "productos") res = await apiOrder.get("/products");
      if (catalog === "insumos") res = await apiOrder.get("/ingredients");
      if (catalog === "usuarios") res = await apiAuth.get("/users");
      if (catalog === "clientes") res = await apiAuth.get("/clients");
      if (catalog === "meseros") res = await apiAuth.get("/users?role=waiter");
      if (catalog === "cajeros") res = await apiAuth.get("/users?role=cashier");
      if (catalog === "proveedores") res = await apiOrder.get("/suppliers");

      const data = res?.data || [];

      /* --- Normalizar rows para evitar errores de objetos --- */
      const flatData = data.map(flattenRow);

      if (flatData.length === 0) {
        message.info("No hay datos para mostrar.");
        setRows([]);
        setColumns([]);
        return;
      }

      /* --- Construir columnas dinámicas (en español) --- */
      const reportCols = buildReportColumns({ catalog, flatData, currency });

      setColumns(reportCols);
      setRows(flatData);

      /* --- IMPRESORA --- */
      if (viewType === "impresora") {
        // Productos ya tienen su impresor dedicado
        if (catalog === "productos") {
          printCatalogoProductos({
            rows: data, // ← data original de productos
            restaurant: user?.restaurant ?? null,
          });
          message.success("Reporte enviado a impresión.");
          return;
        }

        const title = `Reporte de ${getCatalogLabel(catalog)}`;

        const tableHTML = `
          <h2>${escapeHtml(title)}</h2>
          <table cellspacing="0" cellpadding="6">
            <thead>
              <tr>
                ${reportCols.map((c: any) => `<th>${escapeHtml(String(c.title))}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${flatData
                .map((r: any) => {
                  const tds = reportCols
                    .map((c: any) => {
                      const raw = r[c.dataIndex];
                      const pretty = formatCellValue(
                        raw,
                        c.dataIndex,
                        currency
                      );
                      return `<td>${escapeHtml(String(pretty ?? ""))}</td>`;
                    })
                    .join("");
                  return `<tr>${tds}</tr>`;
                })
                .join("")}
            </tbody>
          </table>
        `;

        printViaIframe(tableHTML);
        message.success("Reporte enviado a impresión.");
      }
    } catch (err) {
      console.error(err);
      message.error("Error obteniendo datos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 8 }}>
      <h2>Catálogo Varios</h2>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* SELECT CATALOGO */}
        <Select
          style={{ width: "100%" }}
          options={CATALOG_OPTIONS as any}
          placeholder="Selecciona un catálogo"
          onChange={setCatalog as any}
          value={catalog}
        />

        {/* SELECTOR DE MODO */}
        <Space>
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

        {/* BOTON */}
        <Button
          type="primary"
          onClick={handleFetch}
          loading={loading}
          disabled={!catalog}
        >
          Generar reporte
        </Button>

        {/* TABLA SOLO EN PANTALLA */}
        {viewType === "pantalla" && rows.length > 0 && (
          <Table
            style={{ marginTop: 20 }}
            dataSource={rows}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: true }}
          />
        )}

        <Button onClick={onClose} danger>
          Cerrar
        </Button>
      </Space>
    </div>
  );
}
