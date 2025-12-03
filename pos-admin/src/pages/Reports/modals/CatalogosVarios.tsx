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
];

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

// 🔥 Utilidad para imprimir HTML independiente
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

export default function CatalogosVarios({ onClose }: Props) {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<string>();
  const [viewType, setViewType] = useState<ViewType>("pantalla");
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  async function handleFetch() {
    if (!catalog) {
      message.warning("Selecciona un catálogo primero");
      return;
    }

    setLoading(true);
    try {
      let res;

      /* --- APIs por catálogo --- */

      if (catalog === "productos") {
        res = await apiOrder.get("/products");
      }

      if (catalog === "insumos") {
        res = await apiOrder.get("/ingredients");
      }

      if (catalog === "usuarios") {
        res = await apiAuth.get("/users");
      }

      if (catalog === "clientes") {
        res = await apiAuth.get("/clients");
      }

      if (catalog === "meseros") {
        res = await apiAuth.get("/users?role=waiter");
      }
      if (catalog === "cajeros") {
        res = await apiAuth.get("/users?role=cashier");
      }

      if (catalog === "proveedores") {
        res = await apiOrder.get("/suppliers");
      }

      let data = res?.data || [];

      /* --- Normalizar rows para evitar errores de objetos --- */
      const flatData = data.map(flattenRow);

      if (flatData.length === 0) {
        message.info("No hay datos para mostrar.");
        setRows([]);
        return;
      }

      /* --- Construir columnas dinámicas --- */
      const sample = flatData[0];
      const dynamicCols = Object.keys(sample).map((key) => ({
        title: key.toUpperCase(),
        dataIndex: key,
        ellipsis: true,
      }));

      setColumns(dynamicCols);
      setRows(flatData);

      /* --- IMPRESORA --- */
      if (viewType === "impresora") {
        if (catalog === "productos") {
          printCatalogoProductos({
            rows: data, // ← data original de productos
            restaurant: user?.restaurant ?? null,
          });
          return;
        }
        const tableHTML = `
          <h2>Reporte de ${catalog}</h2>
          <table border="1" cellspacing="0" cellpadding="6">
            <thead>
              <tr>${dynamicCols.map((c) => `<th>${c.title}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${flatData
                .map(
                  (r: any) =>
                    `<tr>${dynamicCols
                      .map((c) => `<td>${r[c.dataIndex] ?? ""}</td>`)
                      .join("")}</tr>`
                )
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
          options={CATALOG_OPTIONS}
          placeholder="Selecciona un catálogo"
          onChange={setCatalog}
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
