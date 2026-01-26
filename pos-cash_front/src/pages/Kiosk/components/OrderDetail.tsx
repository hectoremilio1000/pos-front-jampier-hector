import {
  Card,
  Descriptions,
  Empty,
  Space,
  Table,
  Button,
  Divider,
  Modal,
  Form,
  Input,
  Checkbox,
  message,
  Tag,
  Radio,
  InputNumber,
} from "antd";
import {
  createInvoiceForOrder,
  getInvoiceByOrder,
} from "@/components/apis/apiOrderInvoices";

import type { ColumnsType } from "antd/es/table";
import PayModal from "./modals/PayModal";
import { useMemo, useState } from "react";
import { useCash } from "../context/CashKioskContext";
import apiAuth from "@/components/apis/apiAuth";
import apiOrderKiosk from "@/components/apis/apiOrderKiosk";
import type { CashOrderItem } from "../hooks/useCashKiosk";

const money = (n: number) =>
  `$${(Math.round((n ?? 0) * 100) / 100).toFixed(2)}`;
type DiscountType = "percent" | "fixed";
type PrintMode = "qr" | "impresion" | "mixto";

// ====== Config nprint (impresión por API) ======

const NPRINT_TEMPLATE_ID = "2";

type NPrintItem = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  importe: number;
};

type NPrintJobData = {
  numero: string;
  fecha: string;
  cliente: {
    nombre: string;
    direccion: string;
    rfc: string;
  };
  items: NPrintItem[];
  subtotal: number;
  iva: number;
  total: number;
};

type NPrintJob = {
  printerName: string;
  templateId: string;
  data: NPrintJobData;
};

// type RefundLine = { paymentMethodId: number; amount: number };

// const PAYMENT_METHOD_OPTIONS = [
//   { label: "Efectivo", value: 1 },
//   { label: "Tarjeta", value: 2 },
//   { label: "Transferencia", value: 3 },
// ];

export default function OrderDetail() {
  const {
    selectedOrder,
    // orders,
    restaurantId,
    stationId,
    setOrders,
    setSelectedOrderId,
    fetchKPIs,
    fetchOrderById,
    stationCurrent,
    openPay,
    setOpenPay,
    printSettings,
  } = useCash() as any;

  // ====== Hooks ======
  // Cancelación (solo motivo + contraseña, sin reembolsos)
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [managerPassword, setManagerPassword] = useState<string>("");

  // facturas states
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceForm] = Form.useForm();

  // ====== Descuentos ======
  const [generalDiscountModalVisible, setGeneralDiscountModalVisible] =
    useState(false);
  const [generalDiscountType, setGeneralDiscountType] =
    useState<DiscountType>("percent");
  const [generalDiscountValue, setGeneralDiscountValue] = useState<number>(0);
  const [generalDiscountReason, setGeneralDiscountReason] =
    useState<string>("");

  const [itemDiscountModalVisible, setItemDiscountModalVisible] =
    useState(false);
  const [itemDiscountTarget, setItemDiscountTarget] =
    useState<CashOrderItem | null>(null);
  const [itemDiscountType, setItemDiscountType] =
    useState<DiscountType>("percent");
  const [itemDiscountValue, setItemDiscountValue] = useState<number>(0);
  const [itemDiscountReason, setItemDiscountReason] = useState<string>("");

  // Imprimir
  const [printApprovalVisible, setPrintApprovalVisible] = useState(false);
  const [printSubmitting, setPrintSubmitting] = useState(false);
  const [printManagerPassword, setPrintManagerPassword] = useState("");

  // Reabrir
  const [reopenApprovalVisible, setReopenApprovalVisible] = useState(false);
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenManagerPassword, setReopenManagerPassword] = useState("");

  // Eliminar productos
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [voidApprovalVisible, setVoidApprovalVisible] = useState(false);
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [voidManagerPassword, setVoidManagerPassword] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [voidItemIds, setVoidItemIds] = useState<number[]>([]);
  // arriba, con los otros useState
  const [deleteApprovalVisible, setDeleteApprovalVisible] = useState(false);
  const [deleteManagerPassword, setDeleteManagerPassword] = useState("");

  // Recibo (email / QR opcional)
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");

  // ====== Datos / columnas / totales ======
  const status: string = (selectedOrder?.status || "").toLowerCase();
  const items: CashOrderItem[] = selectedOrder?.items ?? [];
  const canOpenReceipt =
    !!selectedOrder &&
    (printSettings?.printMode === "qr" ||
      printSettings?.printMode === "mixto" ||
      status === "printed");
  const shouldShowQrReceipt =
    printSettings?.printMode === "qr" || printSettings?.printMode === "mixto";

  const canApplyDiscounts =
    status === "open" || status === "in_progress" || status === "reopened";

  function openGeneralDiscountModal() {
    if (!selectedOrder) return;
    setGeneralDiscountType(
      (selectedOrder.discountType as DiscountType) || "percent",
    );
    setGeneralDiscountValue(Number(selectedOrder.discountValue ?? 0));
    setGeneralDiscountReason(selectedOrder.discountReason ?? "");
    setGeneralDiscountModalVisible(true);
  }

  function openItemDiscountModal(target: CashOrderItem) {
    setItemDiscountTarget(target);
    setItemDiscountType((target.discountType as DiscountType) || "percent");
    setItemDiscountValue(Number(target.discountValue ?? 0));
    setItemDiscountReason(target.discountReason ?? "");
    setItemDiscountModalVisible(true);
  }

  async function applyGeneralDiscount() {
    if (!selectedOrder) return;
    if (!generalDiscountType) {
      message.error("Selecciona un tipo de descuento");
      return;
    }

    // subtotal después de descuentos por ítem (solo con items)
    let subtotalAfterItems = 0;
    for (const it of items) {
      const qty = Number(it.qty ?? 0);
      const unit = Number(it.unitPrice ?? 0);
      const gross = qty * unit;
      const lineDiscount = Number(it.discountAmount ?? 0) || 0;
      subtotalAfterItems += Math.max(gross - lineDiscount, 0);
    }

    if (subtotalAfterItems <= 0) {
      message.error("No hay importe para aplicar descuento");
      return;
    }

    let discountAmount = 0;
    const value = Number(generalDiscountValue ?? 0);

    if (generalDiscountType === "percent") {
      discountAmount =
        Math.round(subtotalAfterItems * (value / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(value, subtotalAfterItems);
    }

    try {
      const res = await apiOrderKiosk.put(
        `/orders/${selectedOrder.id}`,
        {
          discountType: generalDiscountType,
          discountValue: value,
          discountAmount,
          discountReason: generalDiscountReason?.trim() || null,
        },
        { validateStatus: () => true },
      );

      if (!res || res.status < 200 || res.status >= 300) {
        const err =
          (res?.data && res.data.error) ||
          "No se pudo aplicar el descuento general";
        throw new Error(err);
      }

      message.success("Descuento general aplicado");
      setGeneralDiscountModalVisible(false);

      if (typeof fetchOrderById === "function") {
        try {
          await fetchOrderById(selectedOrder.id);
        } catch {}
      }
    } catch (e: any) {
      message.error(String(e?.message || "Error al aplicar descuento"));
    }
  }

  async function applyItemDiscount() {
    if (!selectedOrder || !itemDiscountTarget) return;
    if (!itemDiscountType) {
      message.error("Selecciona un tipo de descuento");
      return;
    }

    const qty = Number(itemDiscountTarget.qty ?? 0);
    const unit = Number(itemDiscountTarget.unitPrice ?? 0);
    const gross = qty * unit;

    if (gross <= 0) {
      message.error("Este producto no tiene importe para descontar");
      return;
    }

    const value = Number(itemDiscountValue ?? 0);
    let discountAmount = 0;

    if (itemDiscountType === "percent") {
      discountAmount = Math.round(gross * (value / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(value, gross);
    }

    try {
      const res = await apiOrderKiosk.put(
        // 👇 ajusta a tu ruta real: '/order-item/:id' o '/order-items/:id'
        `/order-items/${itemDiscountTarget.id}`,
        {
          discountType: itemDiscountType,
          discountValue: value,
          discountAmount,
          discountReason: itemDiscountReason?.trim() || null,
        },
        { validateStatus: () => true },
      );

      if (!res || res.status < 200 || res.status >= 300) {
        const err =
          (res?.data && res.data.error) ||
          "No se pudo aplicar el descuento al producto";
        throw new Error(err);
      }

      message.success("Descuento aplicado al producto");
      setItemDiscountModalVisible(false);
      setItemDiscountTarget(null);

      // 🔄 recarga la orden para que items y totales se refresquen
      if (typeof fetchOrderById === "function") {
        try {
          await fetchOrderById(selectedOrder.id);
        } catch {}
      }
    } catch (e: any) {
      message.error(String(e?.message || "Error al aplicar descuento"));
    }
  }

  const columns: ColumnsType<CashOrderItem> = [
    {
      title: "Producto",
      dataIndex: "name",
      key: "name",
      render: (_, it) =>
        (it as any).name ?? (it as any).product?.name ?? `#${it.id}`,
    },
    {
      title: "Cant.",
      dataIndex: "qty",
      key: "qty",
      align: "right",
      width: 80,
    },
    {
      title: "P. Unit.",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "right",
      render: (v) => `$${Number(v ?? 0).toFixed(2)}`,
      width: 120,
    },
    {
      title: "Desc. aplicado",
      dataIndex: "discountAmount",
      key: "discountAmount",
      align: "right",
      render: (v) => `$${Number(v ?? 0).toFixed(2)}`,
      width: 120,
    },
    {
      title: "Importe",
      key: "importe",
      align: "right",
      render: (_, it: any) => {
        console.log(it);
        const qty = Number(it.qty ?? 0);
        const unit = Number(it.unitPrice ?? 0);
        const gross = qty * unit;
        const disc = Number(it.discountAmount ?? 0) || 0;
        console.log(disc);
        console.log(gross);
        return money(Math.max(gross - disc, 0));
      },
      width: 120,
    },

    {
      title: "Descuento",
      key: "discount",
      align: "center",
      width: 90,
      render: (_, it) => (
        <Button
          size="small"
          onClick={() => openItemDiscountModal(it)}
          disabled={!canApplyDiscounts}
        >
          Aplicar
        </Button>
      ),
    },
  ];

  function openDeleteFlow() {
    setDeleteManagerPassword("");
    setDeleteApprovalVisible(true);
  }
  // reutiliza tu requestApprovalToken(action, password, targetId)

  async function doDeleteOrderOnApi(approvalToken: string) {
    const res = await apiOrderKiosk.delete(`/orders/${selectedOrder?.id}`, {
      headers: { "X-Approval": `Bearer ${approvalToken}` },
      validateStatus: () => true,
    });
    if (!res || res.status < 200 || res.status >= 300) {
      const err = (res?.data && res.data.error) || "No se pudo borrar la orden";
      throw new Error(err);
    }
    return res.data;
  }

  async function handleDeleteApprovalConfirm() {
    if (!deleteManagerPassword) {
      message.error("Ingresa la contraseña del administrador");
      return;
    }
    try {
      const approval = await requestApprovalToken(
        "order.delete",
        deleteManagerPassword,
        selectedOrder?.id ?? 0,
      );
      await doDeleteOrderOnApi(approval);
      message.success("Orden borrada");
      setOrders((prev: any[]) =>
        prev.filter((o) => o.id !== (selectedOrder?.id ?? -1)),
      );
      setSelectedOrderId(null);
      await fetchKPIs();
      setDeleteApprovalVisible(false);
      setDeleteManagerPassword("");
    } catch (e: any) {
      message.error(String(e?.message || "Error al borrar la orden"));
    }
  }

  const { baseSubtotal, taxTotal, grandTotal, orderDiscountAmount } =
    useMemo(() => {
      let base = 0;
      let tax = 0;

      // 1) Aplicamos descuentos por ítem
      for (const it of items) {
        const qty = Number(it.qty ?? 0);
        const basePrice = Number(it.basePrice ?? 0);
        const unitPrice = Number(it.unitPrice ?? 0);

        const grossBase = basePrice * qty;
        const grossTax = (unitPrice - basePrice) * qty;
        const grossTotal = grossBase + grossTax;

        const lineDiscount = Number(it.discountAmount ?? 0) || 0;
        const ratio =
          grossTotal > 0 ? Math.min(lineDiscount / grossTotal, 1) : 0;

        const netBase = grossBase * (1 - ratio);
        const netTax = grossTax * (1 - ratio);

        base += netBase;
        tax += netTax;
      }

      let subtotalAfterItems = base + tax;

      // 2) Descuento general de la orden
      let orderDisc = Number(selectedOrder?.discountAmount ?? 0) || 0;
      const oType = selectedOrder?.discountType as DiscountType | null;
      const oValue = Number(selectedOrder?.discountValue ?? 0);

      if (!orderDisc && oType && subtotalAfterItems > 0) {
        if (oType === "percent") {
          orderDisc =
            Math.round(subtotalAfterItems * (oValue / 100) * 100) / 100;
        } else {
          orderDisc = Math.min(oValue, subtotalAfterItems);
        }
      }

      if (orderDisc > 0 && subtotalAfterItems > 0) {
        const ratio = Math.min(orderDisc / subtotalAfterItems, 1);
        base = base * (1 - ratio);
        tax = tax * (1 - ratio);
        subtotalAfterItems = base + tax;
      }

      base = Math.round(base * 100) / 100;
      tax = Math.round(tax * 100) / 100;
      const total = Math.round(subtotalAfterItems * 100) / 100;

      return {
        baseSubtotal: base,
        taxTotal: tax,
        grandTotal: total,
        orderDiscountAmount: Math.round(orderDisc * 100) / 100,
      };
    }, [items, selectedOrder]);

  // ====== Helpers ticket ======
  // const orderIndex =
  //   (orders?.findIndex((o: any) => o.id === selectedOrder?.id) ?? -1) + 1;

  function lineAmount(x: CashOrderItem): number {
    const qty = Number(x.qty ?? 0);
    const unit = Number(x.unitPrice ?? 0);
    const tot = Number((x as any).total ?? NaN);
    if (!Number.isNaN(tot)) return tot;
    return qty * unit;
  }

  type TicketRow = { qty: number; desc: string; amount: number };
  function buildTicketRows(source: CashOrderItem[]): TicketRow[] {
    const rows: TicketRow[] = [];
    const consumed = new Set<number>();
    const getName = (x: CashOrderItem) =>
      x.product?.name ?? x.name ?? `(Producto #${x.id})`;

    for (const it of source) {
      if (consumed.has(it.id)) continue;

      const isMain = !!it.isCompositeProductMain;
      const isMod = !!it.isModifier;
      const compId = it.compositeProductId ?? null;
      const qty = Number(it.qty ?? 1);

      if (isMain && compId) {
        const modifiers = source.filter(
          (m) =>
            m.id !== it.id &&
            !!m.isModifier &&
            (m.compositeProductId ?? null) === compId,
        );

        consumed.add(it.id);
        modifiers.forEach((m) => consumed.add(m.id));

        rows.push({ qty, desc: getName(it), amount: lineAmount(it) });

        for (const m of modifiers) {
          const modAmt = lineAmount(m);
          if (modAmt > 0)
            rows.push({ qty, desc: `> ${getName(m)}`, amount: modAmt });
        }
        continue;
      }

      if (isMod) {
        const modAmt = lineAmount(it);
        if (modAmt <= 0) {
          consumed.add(it.id);
          continue;
        }
        consumed.add(it.id);
        rows.push({ qty, desc: `> ${getName(it)}`, amount: modAmt });
        continue;
      }

      consumed.add(it.id);
      rows.push({ qty, desc: getName(it), amount: lineAmount(it) });
    }
    return rows;
  }

  // function escapeHtml(s: string) {
  //   return String(s)
  //     .replace("&", "&amp;")
  //     .replace("<", "&lt;")
  //     .replace(">", "&gt;");
  // }

  function formatDate(d: Date | string | number) {
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate(),
    )} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  // function buildTicketHtml() {
  //   const rows = buildTicketRows(items);
  //   const createdAt =
  //     (selectedOrder as any)?.createdAt ||
  //     (selectedOrder as any)?.created_at ||
  //     new Date();

  //   const startStr = formatDate(createdAt);
  //   const endStr = formatDate(Date.now());

  //   const restaurantName =
  //     selectedOrder?.restaurant?.name ?? "Cantina La Llorona";
  //   const restaurantAddress =
  //     selectedOrder?.restaurant?.address_line1 ?? "Dirección del restaurante";
  //   const restaurantRfc = selectedOrder?.restaurant?.rfc ?? "RFC: —";
  //   const restaurantPhone = selectedOrder?.restaurant?.phone ?? "Tel: —";
  //   const waiterName =
  //     (selectedOrder?.waiter as any)?.fullName ??
  //     (selectedOrder?.waiter as any)?.name ??
  //     "-";

  //   return `
  // <!doctype html>
  // <html>
  // <head>
  // <meta charset="utf-8">
  // <title>Ticket Orden #${selectedOrder?.id ?? "-"}</title>
  // <style>
  //   @page { size: 80mm auto; margin: 1mm; }
  //   * { box-sizing: border-box; }
  //   body { font-family: "Courier New"; font-size: 14px; margin: 0; padding: 0; width: 78mm; line-heigh: 1.5 }
  //   .ticket { width: 100%; padding: 2mm 0.5mm; }
  //   .center { text-align: center; }
  //   .bold { font-weight: 700; }
  //   .sep { margin: 4px 0; border-top: 1px dashed #000; }
  //   .row { display: flex; gap: 4px; }
  //   .row .qty { width: 12mm; text-align: left; }
  //   .row .desc { flex: 1; white-space: pre-wrap; }
  //   .row .amt { width: 22mm; text-align: right; }
  //   .mb2 { margin-bottom: 2px; }
  //   .small { font-size: 14px; }
  // </style>
  // </head>
  // <body>
  //   <div class="ticket">
  //     <div class="center bold">${escapeHtml(restaurantName)}</div>
  //     <div class="center small">${escapeHtml(restaurantAddress)}</div>
  //     <div class="center small">${escapeHtml(restaurantRfc)} · ${escapeHtml(restaurantPhone)}</div>

  //     <div class="sep"></div>

  //     <div class="small">
  //       Mesa: <span class="bold">${escapeHtml(String(selectedOrder?.tableName ?? "-"))}</span><br/>
  //       Mesero: <span class="bold">${escapeHtml(String(waiterName))}</span><br/>
  //       Personas: <span class="bold">${escapeHtml(String(selectedOrder?.persons ?? "-"))}</span><br/>
  //       Orden: <span className="bold">${orderIndex > 0 ? orderIndex : "-"}</span> / ${orders?.length ?? "-"}<br/>
  //       Inicio: <span class="bold">${startStr}</span><br/>
  //       Fin: <span class="bold">${endStr}</span>
  //     </div>

  //     <div class="sep"></div>

  //     <div class="row bold mb2">
  //       <div class="qty">Cant</div>
  //       <div class="desc">Descripción</div>
  //       <div class="amt">Importe</div>
  //     </div>

  //     ${rows
  //       .map(
  //         (r) => `
  //       <div class="row">
  //         <div class="qty">${r.qty}</div>
  //         <div class="desc">${escapeHtml(r.desc)}</div>
  //         <div class="amt">${money(r.amount)}</div>
  //       </div>`,
  //       )
  //       .join("")}

  //     <div class="sep"></div>

  //     <div class="row">
  //       <div class="desc bold">Subtotal (base)</div>
  //       <div class="amt">${money(baseSubtotal)}</div>
  //     </div>
  //     <div class="row">
  //       <div class="desc bold">Impuestos</div>
  //       <div class="amt">${money(taxTotal)}</div>
  //     </div>
  //     <div class="row">
  //       <div class="desc bold">Total</div>
  //       <div class="amt">${money(grandTotal)}</div>
  //     </div>

  //     <div class="sep"></div>
  //     <div class="center small">Gracias por su visita</div>
  //   </div>
  //   <script>
  //     window.onload = () => {
  //       window.print();
  //       setTimeout(() => window.close(), 300);
  //     };
  //   </script>
  // </body>
  // </html>
  // `.trim();
  // }

  // 👉 NUEVO: construir payload para nprint usando los mismos datos de la cuenta
  function buildNPrintJobPayload(opts?: {
    folioSeries?: string;
    folioNumber?: number;
  }): NPrintJob[] {
    if (!selectedOrder) {
      throw new Error("No hay orden seleccionada");
    }

    const rows = buildTicketRows(items);

    const numero =
      opts?.folioSeries && typeof opts.folioNumber === "number"
        ? `${opts.folioSeries}-${String(opts.folioNumber).padStart(3, "0")}`
        : `ORD-${selectedOrder.id}`;

    const createdAt =
      (selectedOrder as any)?.createdAt ||
      (selectedOrder as any)?.created_at ||
      new Date();

    const fecha = formatDate(createdAt);

    const clienteNombre =
      (selectedOrder as any)?.customerName ||
      (selectedOrder as any)?.customer?.name ||
      "Público en general";

    const clienteDireccion = (selectedOrder as any)?.customer?.address ?? "";
    const clienteRfc = (selectedOrder as any)?.customer?.rfc ?? "";

    const itemsPayload: NPrintItem[] = rows.map((r, idx) => {
      const importe = Number(r.amount ?? 0);
      const cantidad = Number(r.qty ?? 0) || 1;
      const precio_unitario = Math.round((importe / cantidad) * 100) / 100;

      return {
        codigo: `L${idx + 1}`, // línea simple, puedes cambiarlo a product.code si lo deseas
        descripcion: r.desc,
        cantidad,
        precio_unitario,
        importe,
      };
    });

    return [
      {
        printerName: stationCurrent.printerName,
        templateId: NPRINT_TEMPLATE_ID,
        data: {
          numero,
          fecha,
          cliente: {
            nombre: clienteNombre,
            direccion: clienteDireccion,
            rfc: clienteRfc,
          },
          items: itemsPayload,
          subtotal: baseSubtotal,
          iva: taxTotal,
          total: grandTotal,
        },
      },
    ];
  }

  // 👉 NUEVO: enviar payload a la API de nprint
  async function sendTicketToPrintProxy(opts?: {
    folioSeries?: string;
    folioNumber?: number;
  }) {
    if (selectedOrder.restaurant.localBaseUrl) {
      const payload = buildNPrintJobPayload(opts);
      const cleanBase = selectedOrder.restaurant.localBaseUrl.replace(
        /\/$/,
        "",
      );
      const res = await fetch(`${cleanBase}/nprint/printers/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let detail = "";
        try {
          detail = await res.text();
        } catch (e) {
          console.log(e);
        }
        throw new Error(
          `Error al enviar a impresora (${res.status})${
            detail ? `: ${detail}` : ""
          }`,
        );
      }

      // si tu API responde algo útil, lo puedes usar
      try {
        return await res.json();
      } catch {
        return null;
      }
    } else {
      message.warning(
        "No se pudo imprimir porque no existe tu servidor local de impresion",
      );
    }
  }

  // ⛔ Opcional: si ya NO quieres imprimir en navegador, puedes dejar estos helpers,
  // pero SIN usarlos más abajo. Si quieres, luego los eliminamos.
  // function printViaIframe(html: string) {
  //   const iframe = document.createElement("iframe");
  //   iframe.style.position = "fixed";
  //   iframe.style.right = "0";
  //   iframe.style.bottom = "0";
  //   iframe.style.width = "0";
  //   iframe.style.height = "0";
  //   iframe.style.border = "0";
  //   document.body.appendChild(iframe);
  //   const doc = iframe.contentWindow?.document;
  //   if (doc) {
  //     doc.open();
  //     doc.write(html);
  //     doc.close();
  //     setTimeout(() => {
  //       document.body.removeChild(iframe);
  //     }, 1200);
  //   } else {
  //     document.body.removeChild(iframe);
  //   }
  // }

  // function handlePrintPreview() {
  //   const html = buildTicketHtml();
  //   printViaIframe(html);
  // }

  // ====== Recibo (email / QR opcional) ======
  function buildReceiptUrl(orderId: number, restaurantId: number) {
    const envBase = (import.meta as any).env?.VITE_RECEIPT_BASE_URL as
      | string
      | undefined;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const base = (envBase || origin).replace(/\/$/, "");
    return `${base}/${restaurantId}/qrscan/${orderId}`;
  }

  function openReceiptModal() {
    if (!selectedOrder) return;
    if (!canOpenReceipt) {
      message.warning("Primero imprime la orden para generar el recibo.");
      return;
    }
    const rid = Number(restaurantId || selectedOrder.restaurant?.id || 0);
    const oid = Number(selectedOrder.id || 0);
    if (!rid || !oid) {
      message.error("No hay orden seleccionada.");
      return;
    }
    setReceiptUrl(buildReceiptUrl(oid, rid));
    setReceiptEmail("");
    setReceiptOpen(true);
  }

  async function copyReceiptUrl() {
    if (!receiptUrl) return;
    try {
      await navigator.clipboard.writeText(receiptUrl);
      message.success("Link copiado");
    } catch {
      message.error("No se pudo copiar el link");
    }
  }

  function sendReceiptEmail() {
    if (!receiptUrl) return;
    const email = receiptEmail.trim();
    if (!email) {
      message.warning("Escribe un correo válido");
      return;
    }
    const subject = encodeURIComponent("Tu recibo");
    const body = encodeURIComponent(
      `Gracias por tu visita.\n\nPuedes ver tu recibo aquí:\n${receiptUrl}`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  // ====== Aprobaciones (pos-auth) ======
  async function requestApprovalToken(
    action: string,
    password: string,
    targetId: number,
  ) {
    const rid = Number(restaurantId ?? 0);
    const sid = stationId != null ? Number(stationId) : null;
    if (!rid) throw new Error("restaurantId faltante");

    const res = await apiAuth.post(
      "/approvals/issue-by-password",
      {
        restaurantId: rid,
        stationId: sid,
        password,
        action,
        targetId,
      },
      { validateStatus: () => true },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err = (res?.data && res.data.error) || "Aprobación rechazada";
      throw new Error(err);
    }
    return String(res.data.approval_token || "");
  }

  // ====== Reglas de negocio (habilitar/deshabilitar) ======
  const hasItems = items.length > 0;

  // 👉 nuevo: usa printCount de la orden (acepta snake/camel)
  const printCount = Number(
    (selectedOrder as any)?.printCount ??
      (selectedOrder as any)?.print_count ??
      0,
  );

  const canPrint =
    hasItems &&
    (status === "open" ||
      status === "in_progress" ||
      status === "reopened" ||
      (printCount > 0 && ["printed", "paid", "closed"].includes(status)));
  const canPay = status === "printed"; // debe estar impresa
  const canVoidItems =
    hasItems && !["printed", "closed", "paid"].includes(status);
  // const canCancel =
  //   status === "printed" || status === "paid" || status === "closed";
  const canReopen = status === "printed" || status === "paid";

  // 👉 nuevo: borrar cuenta solo si jamás se imprimió y no hay productos
  const canDeleteOrder = printCount === 0 && !hasItems;
  const hasPrinter = Boolean(stationCurrent?.printerName);
  const configuredPrintMode = (printSettings?.printMode ||
    "mixto") as PrintMode;
  const effectivePrintMode =
    configuredPrintMode !== "qr" && !hasPrinter ? "qr" : configuredPrintMode;

  // ====== Cancelación ======

  // const openCancelFlow = () => {
  //   setReason("");
  //   setManagerPassword("");
  //   setCancelVisible(true);
  // };

  async function doCancelOnOrderApi(approvalToken: string) {
    const res = await apiOrderKiosk.delete(
      `/orders/${selectedOrder?.id}/cancel`,
      {
        data: { refunds: [], reason: reason || "cancel_by_manager" },
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err = (res?.data && res.data.error) || "Cancelación falló";
      throw new Error(err);
    }
    return res.data;
  }

  const handleCancelConfirm = async () => {
    if (!managerPassword) {
      message.error("Ingresa la contraseña del administrador");
      return;
    }
    setCancelSubmitting(true);
    try {
      const approval = await requestApprovalToken(
        "order.cancel",
        managerPassword,
        selectedOrder?.id ?? 0,
      );
      const result = await doCancelOnOrderApi(approval);

      message.success(`Orden cancelada (${result?.status ?? "OK"})`);
      setOrders((prev: any[]) =>
        prev.filter((o) => o.id !== (selectedOrder?.id ?? -1)),
      );
      setSelectedOrderId(null);
      await fetchKPIs();

      setCancelVisible(false);
      setManagerPassword("");
      setReason("");
    } catch (e: any) {
      message.error(String(e?.message || "Error al cancelar"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  // ====== Imprimir ======
  // ====== Imprimir ======
  // Primera impresión (sin contraseña, otro endpoint)
  async function doInitialPrintOnOrderApi() {
    const res = await apiOrderKiosk.post(
      `/orders/${selectedOrder?.id}/firstPrint`,
      {},
      { validateStatus: () => true },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err =
        (res?.data && (res.data.details || res.data.error)) ||
        "Impresión (primera) falló";
      throw new Error(err);
    }
    return res.data as { folioSeries: string; folioNumber: number };
  }

  // Reimpresiones (con contraseña / approvals)
  async function doPrintOnOrderApi(approvalToken: string) {
    const res = await apiOrderKiosk.post(
      `/orders/${selectedOrder?.id}/print`,
      {},
      {
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err =
        (res?.data && (res.data.details || res.data.error)) ||
        "Impresión falló";
      throw new Error(err);
    }
    return res.data as { folioSeries: string; folioNumber: number };
  }

  function friendlyPrintError(err: unknown): string {
    const msg = String((err as any)?.message || err || "");
    if (msg.includes("no_series_for_station")) {
      return "No hay folio asignado a esta caja. Asigna una serie en Admin > Folios.";
    }
    return msg || "Error al imprimir/enviar a impresora";
  }

  const openPrintFlow = () => {
    setPrintManagerPassword("");
    setPrintApprovalVisible(true);
  };

  async function runInitialPrint() {
    setPrintSubmitting(true);
    try {
      const r = await doInitialPrintOnOrderApi();
      message.success(`Folio asignado: ${r.folioSeries}-${r.folioNumber}`);

      if (typeof fetchOrderById === "function") {
        try {
          await fetchOrderById(selectedOrder.id);
        } catch {}
      }

      if (effectivePrintMode !== "qr") {
        await sendTicketToPrintProxy({
          folioSeries: r.folioSeries,
          folioNumber: r.folioNumber,
        });
        message.success("Cuenta enviada a la impresora");
      } else {
        message.info("Cuenta generada sin impresora (modo nube)");
      }
    } catch (e: any) {
      message.error(friendlyPrintError(e));
    } finally {
      setPrintSubmitting(false);
    }
  }

  const handlePrintClick = async () => {
    if (!selectedOrder) return;

    // Si ya se imprimió al menos una vez → reimpresión, pide contraseña
    if (printCount > 0) {
      openPrintFlow();
      return;
    }

    if (printSettings?.confirmPrint) {
      Modal.confirm({
        title: "Imprimir cuenta",
        content: "¿Seguro que deseas imprimir esta cuenta?",
        okText: "Imprimir",
        cancelText: "Cancelar",
        onOk: () => runInitialPrint(),
      });
      return;
    }

    await runInitialPrint();
  };

  const handlePrintApprovalConfirm = async () => {
    if (!printManagerPassword) {
      message.error("Ingresa la contraseña del administrador");
      return;
    }
    setPrintSubmitting(true);
    try {
      const approval = await requestApprovalToken(
        "order.print",
        printManagerPassword,
        selectedOrder?.id ?? 0,
      );
      const r = await doPrintOnOrderApi(approval);
      message.success(`Folio asignado: ${r.folioSeries}-${r.folioNumber}`);

      if (typeof fetchOrderById === "function") {
        try {
          await fetchOrderById(selectedOrder?.id);
        } catch {}
      }

      setPrintApprovalVisible(false);
      setPrintManagerPassword("");

      if (effectivePrintMode !== "qr") {
        // 👉 Reimpresión: también va a nprint
        await sendTicketToPrintProxy({
          folioSeries: r.folioSeries,
          folioNumber: r.folioNumber,
        });
        message.success("Cuenta reimpresa (enviada a la impresora)");
      } else {
        message.info("Cuenta reimpresa sin impresora (modo nube)");
      }
    } catch (e: any) {
      message.error(friendlyPrintError(e));
    } finally {
      setPrintSubmitting(false);
    }
  };

  // ====== Reabrir ======
  const openReopenFlow = () => {
    setReopenManagerPassword("");
    setReopenApprovalVisible(true);
  };

  async function doReopenOnOrderApi(approvalToken: string) {
    const res = await apiOrderKiosk.post(
      `/orders/${selectedOrder?.id}/reopen`,
      {},
      {
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err = (res?.data && res.data.error) || "No se pudo reabrir";
      throw new Error(err);
    }
    return res.data;
  }

  const handleReopenApprovalConfirm = async () => {
    if (!reopenManagerPassword) {
      message.error("Ingresa la contraseña del administrador");
      return;
    }
    setReopenSubmitting(true);
    try {
      const approval = await requestApprovalToken(
        "order.reopen",
        reopenManagerPassword,
        selectedOrder?.id ?? 0,
      );
      await doReopenOnOrderApi(approval);
      message.success("Orden reabierta");

      if (typeof fetchOrderById === "function") {
        try {
          await fetchOrderById(selectedOrder?.id);
        } catch {}
      }

      setReopenApprovalVisible(false);
      setReopenManagerPassword("");
    } catch (e: any) {
      message.error(String(e?.message || "Error al reabrir"));
    } finally {
      setReopenSubmitting(false);
    }
  };

  // ====== Eliminar productos ======
  const openVoidFlow = () => {
    setVoidReason("");
    setVoidItemIds([]);
    setVoidManagerPassword("");
    setVoidModalVisible(true);
  };

  const proceedVoidApproval = () => {
    if (!voidItemIds.length) {
      message.error("Selecciona al menos un producto");
      return;
    }
    if (!voidReason.trim()) {
      message.error("Escribe el motivo");
      return;
    }
    setVoidModalVisible(false);
    setVoidApprovalVisible(true);
  };

  async function doVoidItemsOnOrderApi(approvalToken: string) {
    const res = await apiOrderKiosk.post(
      `/orders/${selectedOrder?.id}/items/void`,
      { itemIds: voidItemIds, reason: voidReason.trim() },
      {
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err =
        (res?.data && res.data.error) ||
        "No se pudieron eliminar los productos";
      throw new Error(err);
    }
    return res.data;
  }

  const handleVoidApprovalConfirm = async () => {
    if (!voidManagerPassword) {
      message.error("Ingresa la contraseña del administrador");
      return;
    }
    setVoidSubmitting(true);
    try {
      const approval = await requestApprovalToken(
        "order.items.void",
        voidManagerPassword,
        selectedOrder?.id ?? 0,
      );
      await doVoidItemsOnOrderApi(approval);
      message.success("Productos eliminados");

      if (typeof fetchOrderById === "function") {
        try {
          await fetchOrderById(selectedOrder?.id);
        } catch {}
      }

      setVoidApprovalVisible(false);
      setVoidManagerPassword("");
      setVoidItemIds([]);
      setVoidReason("");
    } catch (e: any) {
      message.error(String(e?.message || "Error al eliminar productos"));
    } finally {
      setVoidSubmitting(false);
    }
  };

  // ====== Borrar cuenta ======
  // async function handleDeleteOrder() {
  //   Modal.confirm({
  //     title: "Borrar cuenta",
  //     content:
  //       "Esta acción eliminará definitivamente la orden porque nunca fue impresa y no tiene productos. ¿Deseas continuar?",
  //     okText: "Borrar",
  //     okButtonProps: { danger: true },
  //     cancelText: "Cancelar",
  //     onOk: async () => {
  //       try {
  //         const res = await apiOrderKiosk.delete(
  //           `/orders/${selectedOrder?.id}`,
  //           {
  //             validateStatus: () => true,
  //           }
  //         );
  //         if (!res || res.status < 200 || res.status >= 300) {
  //           const err =
  //             (res?.data && res.data.error) || "No se pudo borrar la orden";
  //           throw new Error(err);
  //         }
  //         message.success("Orden borrada");
  //         setOrders((prev: any[]) =>
  //           prev.filter((o) => o.id !== (selectedOrder?.id ?? -1))
  //         );
  //         setSelectedOrderId(null);
  //         await fetchKPIs();
  //       } catch (e: any) {
  //         message.error(String(e?.message || "Error al borrar la orden"));
  //       }
  //     },
  //   });
  // }

  // ====== Render ======
  return (
    <Card
      title={
        selectedOrder
          ? `Orden #${selectedOrder.id} · ${selectedOrder.tableName ?? "-"}`
          : "Detalle de la orden"
      }
    >
      {!selectedOrder ? (
        <Empty description="Selecciona una orden para ver el detalle" />
      ) : (
        <>
          <Space direction="vertical" className="w-full">
            <Descriptions size="small" column={3}>
              <Descriptions.Item label="Área">
                {selectedOrder.area?.name ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Personas">
                {selectedOrder.persons ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag
                  color={
                    status === "printed"
                      ? "blue"
                      : status === "reopened"
                        ? "gold"
                        : status === "paid"
                          ? "green"
                          : status === "closed"
                            ? "default"
                            : status === "void"
                              ? "red"
                              : "processing"
                  }
                >
                  {status || "-"}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Table<CashOrderItem>
              rowKey={(r) => r.id}
              columns={columns}
              dataSource={items}
              size="small"
              pagination={false}
            />

            <Divider style={{ margin: "8px 0" }} />
            <div className="w-full flex justify-between">
              <Descriptions size="small" column={3} bordered>
                <Descriptions.Item label="Subtotal (base)">
                  {money(baseSubtotal)}
                </Descriptions.Item>
                <Descriptions.Item label="Impuestos">
                  {money(taxTotal)}
                </Descriptions.Item>
                <Descriptions.Item label="Dcto orden">
                  {money(orderDiscountAmount)}
                </Descriptions.Item>
              </Descriptions>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Total: </h1>
                <p className="text-2xl font-bold">{money(grandTotal)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <Button onClick={handlePrintClick} disabled={!canPrint}>
                  🖨️ {printCount > 0 ? "Reimprimir Cuenta" : "Imprimir Cuenta"}
                </Button>
                <Button onClick={openReceiptModal} disabled={!canOpenReceipt}>
                  Recibo
                </Button>

                <Button
                  onClick={openGeneralDiscountModal}
                  disabled={!canApplyDiscounts}
                >
                  Dcto general
                </Button>

                <Button
                  title="Emitir factura electrónica"
                  onClick={async () => {
                    if (!selectedOrder) return;

                    // si ya existe, avisa (no bloquea abrir modal)
                    try {
                      await getInvoiceByOrder(selectedOrder.id);
                      message.info(
                        "Esta orden ya tiene una factura local registrada.",
                      );
                    } catch {
                      setInvoiceModalOpen(true);
                    }
                  }}
                >
                  Factura
                </Button>

                {canReopen && (
                  <Button onClick={openReopenFlow}>🔓 Reabrir</Button>
                )}

                <Button onClick={openVoidFlow} disabled={!canVoidItems}>
                  🗑️ Eliminar productos
                </Button>

                <Button
                  onClick={openDeleteFlow}
                  disabled={!canDeleteOrder}
                  danger
                  type="dashed"
                  title="Solo si nunca se imprimió y no tiene productos"
                >
                  🗑️ Borrar cuenta
                </Button>
              </div>

              <Button
                size="large"
                type="primary"
                onClick={() => setOpenPay(true)}
                disabled={!canPay}
                title={!canPay ? "Debes imprimir antes de cobrar" : ""}
              >
                Cobrar
              </Button>
            </div>

            <PayModal open={openPay} onClose={() => setOpenPay(false)} />
          </Space>
          <Modal
            title="Recibo"
            open={receiptOpen}
            onCancel={() => setReceiptOpen(false)}
            footer={null}
          >
            {!receiptUrl ? (
              <div className="text-sm text-gray-500">
                No hay recibo disponible para esta orden.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {shouldShowQrReceipt ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-gray-500">
                      QR disponible (link):
                    </div>
                    <div className="break-all text-sm">{receiptUrl}</div>
                    <Button onClick={copyReceiptUrl}>Copiar link</Button>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3">
                  <Input
                    placeholder="correo@cliente.com"
                    value={receiptEmail}
                    onChange={(e) => setReceiptEmail(e.target.value)}
                  />
                  <Button type="primary" onClick={sendReceiptEmail}>
                    Enviar por email
                  </Button>
                  {shouldShowQrReceipt ? null : (
                    <Button onClick={copyReceiptUrl}>Copiar link</Button>
                  )}
                </div>
              </div>
            )}
          </Modal>
          {/* ========= Descuento general ========= */}
          <Modal
            title="Descuento general de la orden"
            open={generalDiscountModalVisible}
            onCancel={() => setGeneralDiscountModalVisible(false)}
            onOk={applyGeneralDiscount}
            okText="Aplicar descuento"
            destroyOnClose
          >
            <Form layout="vertical">
              <Form.Item label="Tipo de descuento">
                <Radio.Group
                  value={generalDiscountType}
                  onChange={(e) =>
                    setGeneralDiscountType(e.target.value as DiscountType)
                  }
                >
                  <Radio value="percent">% porcentaje</Radio>
                  <Radio value="fixed">Monto fijo</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label={
                  generalDiscountType === "percent"
                    ? "Valor (%)"
                    : "Monto (MXN)"
                }
              >
                <InputNumber
                  min={0}
                  max={generalDiscountType === "percent" ? 100 : undefined}
                  value={generalDiscountValue}
                  onChange={(v) => setGeneralDiscountValue(Number(v ?? 0))}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item label="Motivo (opcional)">
                <Input.TextArea
                  value={generalDiscountReason}
                  onChange={(e) => setGeneralDiscountReason(e.target.value)}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Modal>

          {/* modal para facturar una order */}
          <Modal
            open={invoiceModalOpen}
            title="Emitir factura (por esta orden)"
            okText="Generar"
            confirmLoading={invoiceSubmitting}
            onCancel={() => setInvoiceModalOpen(false)}
            onOk={async () => {
              if (!selectedOrder) return;

              try {
                const v = await invoiceForm.validateFields();
                setInvoiceSubmitting(true);

                const res = await createInvoiceForOrder(selectedOrder.id, {
                  customer: {
                    legalName: v.legalName,
                    taxId: v.taxId,
                    taxSystem: v.taxSystem,
                    email: v.email || undefined,
                    zip: v.zip,
                  },
                  cfdiUse: v.cfdiUse || "G03",
                  paymentForm: v.paymentForm || "03",

                  // snapshot de totales que ya calculas en tu UI
                  amountBase: baseSubtotal,
                  amountTax: taxTotal,
                  amountTotal: grandTotal,
                });

                if (res.data?.alreadyInvoiced) {
                  message.info("Ya existía una factura para esta orden.");
                } else if (res.data?.facturapiError) {
                  message.warning(
                    `Factura local creada, pero NO timbró: ${res.data.facturapiError}`,
                  );
                } else {
                  message.success("Factura creada y timbrada");
                }

                setInvoiceModalOpen(false);
                invoiceForm.resetFields();
              } catch (e: any) {
                console.log(e);
                message.error(
                  e?.response?.data?.error || "No se pudo generar la factura",
                );
              } finally {
                setInvoiceSubmitting(false);
              }
            }}
          >
            <Form
              form={invoiceForm}
              layout="vertical"
              initialValues={{ cfdiUse: "G03", paymentForm: "03" }}
            >
              <Form.Item
                name="legalName"
                label="Razón social"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="taxId" label="RFC" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="taxSystem"
                label="Régimen fiscal (SAT)"
                rules={[{ required: true }]}
              >
                <Input placeholder="Ej. 601" />
              </Form.Item>
              <Form.Item
                name="zip"
                label="CP (SAT)"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email (opcional)">
                <Input type="email" />
              </Form.Item>

              <Space style={{ display: "flex" }} wrap>
                <Form.Item name="paymentForm" label="Forma de pago">
                  <Input style={{ width: 140 }} placeholder="03" />
                </Form.Item>
                <Form.Item name="cfdiUse" label="Uso CFDI">
                  <Input style={{ width: 140 }} placeholder="G03" />
                </Form.Item>
              </Space>

              <Card size="small" title="Totales (snapshot)">
                <Space wrap>
                  <Tag>Base: {money(baseSubtotal)}</Tag>
                  <Tag>IVA: {money(taxTotal)}</Tag>
                  <Tag color="blue">Total: {money(grandTotal)}</Tag>
                </Space>
              </Card>
            </Form>
          </Modal>

          {/* ========= Descuento por producto ========= */}
          <Modal
            title="Descuento por producto"
            open={itemDiscountModalVisible}
            onCancel={() => {
              setItemDiscountModalVisible(false);
              setItemDiscountTarget(null);
            }}
            onOk={applyItemDiscount}
            okText="Aplicar descuento"
            destroyOnClose
          >
            {itemDiscountTarget && (
              <div className="mb-3 text-sm">
                <div>
                  Producto:{" "}
                  <b>
                    {itemDiscountTarget.product?.name ??
                      itemDiscountTarget.name ??
                      `#${itemDiscountTarget.id}`}
                  </b>
                </div>
                <div>
                  Cantidad: <b>{itemDiscountTarget.qty}</b>
                </div>
                <div>
                  Importe bruto:{" "}
                  <b>
                    {money(
                      Number(itemDiscountTarget.qty ?? 0) *
                        Number(itemDiscountTarget.unitPrice ?? 0),
                    )}
                  </b>
                </div>
              </div>
            )}

            <Form layout="vertical">
              <Form.Item label="Tipo de descuento">
                <Radio.Group
                  value={itemDiscountType}
                  onChange={(e) =>
                    setItemDiscountType(e.target.value as DiscountType)
                  }
                >
                  <Radio value="percent">% porcentaje</Radio>
                  <Radio value="fixed">Monto fijo</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                label={
                  itemDiscountType === "percent" ? "Valor (%)" : "Monto (MXN)"
                }
              >
                <InputNumber
                  min={0}
                  max={itemDiscountType === "percent" ? 100 : undefined}
                  value={itemDiscountValue}
                  onChange={(v) => setItemDiscountValue(Number(v ?? 0))}
                  style={{ width: "100%" }}
                />
              </Form.Item>

              <Form.Item label="Motivo (opcional)">
                <Input.TextArea
                  value={itemDiscountReason}
                  onChange={(e) => setItemDiscountReason(e.target.value)}
                  rows={3}
                />
              </Form.Item>
            </Form>
          </Modal>

          {/* ========= Cancelar orden (motivo + contraseña, sin reembolsos) ========= */}
          <Modal
            title="Cancelar orden"
            open={cancelVisible}
            onCancel={() => setCancelVisible(false)}
            onOk={handleCancelConfirm}
            okText="Autorizar y cancelar"
            confirmLoading={cancelSubmitting}
            destroyOnClose
          >
            <Space direction="vertical" className="w-full">
              <Form layout="vertical">
                <Form.Item label="Motivo (opcional)">
                  <Input.TextArea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Escribe el motivo…"
                    rows={3}
                  />
                </Form.Item>
                <Form.Item label="Contraseña del administrador">
                  <Input.Password
                    autoComplete="new-password"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Contraseña de administrador"
                  />
                </Form.Item>
              </Form>
            </Space>
          </Modal>

          {/* borrar cuenta */}
          <Modal
            title="Aprobación — Borrar cuenta"
            open={deleteApprovalVisible}
            onCancel={() => setDeleteApprovalVisible(false)}
            onOk={handleDeleteApprovalConfirm}
            okText="Autorizar y borrar"
            destroyOnClose
          >
            <p className="mb-2">
              Ingresa la <b>contraseña</b> de un usuario <b>admin/owner</b> para
              borrar esta orden (solo permitido si nunca fue impresa y no tiene
              productos).
            </p>
            <Input.Password
              autoComplete="new-password"
              value={deleteManagerPassword}
              onChange={(e) => setDeleteManagerPassword(e.target.value)}
              placeholder="Contraseña de administrador"
            />
          </Modal>

          {/* ========= Imprimir (aprobación) ========= */}
          <Modal
            title="Aprobación — Imprimir cuenta"
            open={printApprovalVisible}
            onCancel={() => setPrintApprovalVisible(false)}
            onOk={handlePrintApprovalConfirm}
            okText="Autorizar e imprimir"
            confirmLoading={printSubmitting}
            destroyOnClose
          >
            <p className="mb-2">
              Ingresa la <b>contraseña</b> de un usuario <b>admin/owner</b> para
              asignar folio e imprimir.
            </p>
            <Input.Password
              autoComplete="new-password"
              value={printManagerPassword}
              onChange={(e) => setPrintManagerPassword(e.target.value)}
              placeholder="Contraseña de administrador"
            />
          </Modal>

          {/* ========= Reabrir (aprobación) ========= */}
          <Modal
            title="Aprobación — Reabrir orden"
            open={reopenApprovalVisible}
            onCancel={() => setReopenApprovalVisible(false)}
            onOk={handleReopenApprovalConfirm}
            okText="Autorizar y reabrir"
            confirmLoading={reopenSubmitting}
            destroyOnClose
          >
            <p className="mb-2">
              Ingresa la <b>contraseña</b> de un usuario <b>admin/owner</b> para
              reabrir esta orden.
            </p>
            <Input.Password
              autoComplete="new-password"
              value={reopenManagerPassword}
              onChange={(e) => setReopenManagerPassword(e.target.value)}
              placeholder="Contraseña de administrador"
            />
          </Modal>

          {/* ========= Eliminar productos (Modal 1: selección) ========= */}
          <Modal
            title="Eliminar productos de la orden"
            open={voidModalVisible}
            onCancel={() => setVoidModalVisible(false)}
            onOk={proceedVoidApproval}
            okText="Continuar"
            confirmLoading={false}
            destroyOnClose
          >
            <Space direction="vertical" className="w-full">
              <div className="max-h-64 overflow-auto border p-2 rounded">
                {items.length === 0 ? (
                  <div className="text-sm text-gray-500">No hay productos</div>
                ) : (
                  items.map((it) => (
                    <label key={it.id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        checked={voidItemIds.includes(it.id)}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setVoidItemIds((prev) =>
                            on
                              ? [...prev, it.id]
                              : prev.filter((x) => x !== it.id),
                          );
                        }}
                        disabled={!canVoidItems}
                      />
                      <span className="text-sm">
                        x{it.qty} — {it.product?.name ?? it.name ?? `#${it.id}`}{" "}
                        — {money(lineAmount(it))}
                      </span>
                    </label>
                  ))
                )}
              </div>

              <Form layout="vertical" className="mt-2">
                <Form.Item label="Motivo">
                  <Input.TextArea
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="Ej. producto enviado por error"
                    rows={3}
                    disabled={!canVoidItems}
                  />
                </Form.Item>
              </Form>
            </Space>
          </Modal>

          {/* ========= Eliminar productos (aprobación) ========= */}
          <Modal
            title="Aprobación — Eliminar productos"
            open={voidApprovalVisible}
            onCancel={() => setVoidApprovalVisible(false)}
            onOk={handleVoidApprovalConfirm}
            okText="Autorizar y eliminar"
            confirmLoading={voidSubmitting}
            destroyOnClose
          >
            <p className="mb-2">
              Ingresa la <b>contraseña</b> de un usuario <b>admin/owner</b> para
              eliminar los productos seleccionados.
            </p>
            <Input.Password
              value={voidManagerPassword}
              autoComplete="new-password"
              onChange={(e) => setVoidManagerPassword(e.target.value)}
              placeholder="Contraseña de administrador"
            />
          </Modal>
        </>
      )}
    </Card>
  );
}
