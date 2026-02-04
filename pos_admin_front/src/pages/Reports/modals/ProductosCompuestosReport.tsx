import { useEffect, useState } from "react";
import { Button, Select, Space, message } from "antd";
import { DesktopOutlined, PrinterOutlined } from "@ant-design/icons";

import apiOrder from "@/components/apis/apiOrder";
import { useAuth } from "@/components/Auth/AuthContext";

type ViewType = "pantalla" | "impresora";

interface Props {
  onClose: () => void;
}

// Tipos aproximados (no estrictos) para no pelearnos con TS
type ModifierProduct = {
  id: number;
  code: string;
  name: string;
};

type ModifierItem = {
  id: number;
  modifierId: number;
  priceDelta: string | number;
  isEnabled: boolean;
  modifier?: ModifierProduct;
};

type ModifierGroup = {
  id: number;
  code: string;
  name: string;
  modifiers?: ModifierItem[];
};

type ProductModifierGroup = {
  productId: number;
  modifierGroupId: number;
  includedQty: number;
  maxQty: number | null;
  isForced: boolean;
  captureIncluded: boolean;
  priority: number;
  modifierGroup?: ModifierGroup;
};

type Product = {
  id: number;
  code: string;
  name: string;
  priceGross: string | number;
  productModifierGroups?: ProductModifierGroup[];
};

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

// Construye TODO el documento HTML (pantalla + impresión)
function buildCompositeReportHtml(
  products: Product[],
  restaurant: { name: string; address?: string | null } | null | undefined
) {
  const today = new Date();
  const f = today.toLocaleDateString("es-MX");
  const h = today.toLocaleTimeString("es-MX");

  const restaurantName = restaurant?.name ?? "MI RESTAURANTE";
  const restaurantAddress = restaurant?.address ?? "";
  const restaurantRFC = "RFC PENDIENTE"; // si luego lo agregas en restaurant, lo sustituyes

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

    <div style="font-size:14px;font-weight:bold;margin-top:10px;margin-bottom:10px;">
      PRODUCTOS COMPUESTOS
    </div>
  `;

  products.forEach((p) => {
    const pmgs = p.productModifierGroups ?? [];
    if (!pmgs.length) return; // solo compuestos

    const price = Number(p.priceGross ?? 0);

    body += `
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr style="background:#bcbcbc;">
          <td colspan="3" style="padding:4px;border:1px solid #555;font-weight:bold;">
            PRODUCTO COMPUESTO
          </td>
        </tr>
        <tr style="background:#d0d0d0;">
          <td style="padding:4px;border:1px solid #555;font-weight:bold;width:80px;">CLAVE</td>
          <td style="padding:4px;border:1px solid #555;font-weight:bold;">DESCRIPCIÓN</td>
          <td style="padding:4px;border:1px solid #555;font-weight:bold;width:100px;">PRECIO</td>
        </tr>
        <tr>
          <td style="padding:4px;border-bottom:1px solid #ddd;">${p.code}</td>
          <td style="padding:4px;border-bottom:1px solid #ddd;">${p.name}</td>
          <td style="padding:4px;border-bottom:1px solid #ddd;text-align:right;">
            $${price.toFixed(2)}
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:4px;">
        <tr style="background:#bcbcbc;">
          <td colspan="5" style="padding:4px;border:1px solid #555;font-weight:bold;">
            GRUPOS DE MODIFICADORES
          </td>
        </tr>
      
    `;

    pmgs.forEach((pmg) => {
      const mg = pmg.modifierGroup;
      const mgCode = mg?.code ?? "";
      const mgName = mg?.name ?? "";
      const incluidos = Number(pmg.includedQty ?? 0).toFixed(2);
      const prioridad = pmg.priority ?? "";
      const forzar = pmg.isForced ? "SI" : "NO";

      // fila del grupo
      body += `
        <tr style="background:#d0d0d0;">
          <td style="padding:4px;border:1px solid #555;font-weight:bold;width:60px;">CLAVE</td>
          <td style="padding:4px;border:1px solid #555;font-weight:bold;">MODIFICADOR</td>
          <td style="padding:4px;border:1px solid #555;font-weight:bold;width:80px;">INCLUIDOS</td>
          <td style="padding:4px;border:1px solid #555;font-weight:bold;width:80px;">PRIORIDAD</td>
          <td style="padding:4px;border:1px solid #555;font-weight:bold;width:90px;">FORZAR CAPTURA</td>
        </tr>
        <tr>
          <td style="padding:4px;border-bottom:1px solid #ddd;">${mgCode}</td>
          <td style="padding:4px;border-bottom:1px solid #ddd;">${mgName}</td>
          <td style="padding:4px;border-bottom:1px solid #ddd;text-align:right;">${incluidos}</td>
          <td style="padding:4px;border-bottom:1px solid #ddd;text-align:right;">${prioridad}</td>
          <td style="padding:4px;border-bottom:1px solid #ddd;text-align:center;">${forzar}</td>
        </tr>
      `;

      // encabezado "INGREDIENTE"
      body += `
        <tr>
          <td colspan="5" style="padding:4px 4px 2px 4px;font-weight:bold;">
            INGREDIENTE
          </td>
        </tr>
      `;

      // modificadores / ingredientes
      const mods = mg?.modifiers ?? [];
      mods.forEach((m) => {
        const prod = m.modifier;
        const nombre = prod?.name ?? "";
        const precioDelta = Number(m.priceDelta ?? 0);

        body += `
          <tr>
            <td style="padding:2px 4px;"></td>
            <td style="padding:2px 4px;">${nombre}</td>
            <td style="padding:2px 4px;text-align:right;"></td>
            <td style="padding:2px 4px;text-align:right;"></td>
            <td style="padding:2px 4px;text-align:right;">
              $${precioDelta.toFixed(2)}
            </td>
          </tr>
        `;
      });
    });

    body += `
      </table>
      <div style="margin-top:6px;margin-bottom:10px;border-bottom:1px solid #999;"></div>
    `;
  });

  body += `</div>`;

  const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Productos compuestos</title>
</head>
<body>
${body}
</body>
</html>
`;

  return htmlDoc;
}

export default function ProductosCompuestosReport({ onClose }: Props) {
  const { user } = useAuth();
  const [viewType, setViewType] = useState<ViewType>("pantalla");
  const [loading, setLoading] = useState(false);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // Cargar grupos de modificadores
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiOrder.get("/modifier-groups");
        setModifierGroups(res.data || []);
      } catch (e) {
        console.error(e);
        message.error("No se pudieron cargar los grupos de modificadores");
      }
    };
    load();
  }, []);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await apiOrder.get("/products");
      const allProducts: Product[] = res.data || [];

      // Solo productos que tengan productModifierGroups (compuestos)
      let composite = allProducts.filter(
        (p) => (p.productModifierGroups ?? []).length > 0
      );

      // Si se seleccionaron grupos, filtrar por esos
      if (selectedGroupIds.length > 0) {
        composite = composite.filter((p) =>
          (p.productModifierGroups ?? []).some((pmg) =>
            selectedGroupIds.includes(pmg.modifierGroupId)
          )
        );
      }

      if (!composite.length) {
        message.info(
          "No hay productos compuestos para los filtros seleccionados"
        );
        setPreviewHtml("");
        return;
      }

      const htmlDoc = buildCompositeReportHtml(
        composite,
        user?.restaurant ?? null
      );

      setPreviewHtml(htmlDoc);

      if (viewType === "impresora") {
        printViaIframe(htmlDoc);
        message.success("Enviando productos compuestos a impresión…");
      }
    } catch (e) {
      console.error(e);
      message.error("Error al generar el reporte de productos compuestos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 8, width: "100%", maxWidth: 1000 }}>
      <h1 className="text-2xl font-bold">Productos compuestos</h1>

      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Selector de grupos de modificadores */}
        <div>
          <strong>Selecciona grupo de modificadores para filtrar:</strong>
          <Select
            mode="multiple"
            allowClear
            style={{ width: "100%", marginTop: 6 }}
            placeholder="Selecciona uno o varios grupos (opcional)"
            options={modifierGroups.map((mg) => ({
              label: `${mg.code ?? mg.id} - ${mg.name}`,
              value: mg.id,
            }))}
            value={selectedGroupIds}
            onChange={(vals) => setSelectedGroupIds(vals as number[])}
          />
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
            // cada render reescribe el contenido del iframe
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
