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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import PayModal from "./modals/PayModal";
import { useMemo, useState } from "react";
import { useCash } from "../context/CashKioskContext";
import apiAuth from "@/components/apis/apiAuth";
import apiOrderKiosk from "@/components/apis/apiOrderKiosk";
import type { CashOrderItem } from "../hooks/useCashKiosk";

const money = (n: number) =>
  `$${(Math.round((n ?? 0) * 100) / 100).toFixed(2)}`;

// type RefundLine = { paymentMethodId: number; amount: number };

// const PAYMENT_METHOD_OPTIONS = [
//   { label: "Efectivo", value: 1 },
//   { label: "Tarjeta", value: 2 },
//   { label: "Transferencia", value: 3 },
// ];

export default function OrderDetail() {
  const {
    selectedOrder,
    orders,
    restaurantId,
    stationId,
    setOrders,
    setSelectedOrderId,
    fetchKPIs,
    fetchOrderById,
  } = useCash() as any;

  // ====== Hooks ======
  const [openPay, setOpenPay] = useState(false);

  // Cancelación (solo motivo + contraseña, sin reembolsos)
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [managerPassword, setManagerPassword] = useState<string>("");

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

  // ====== Datos / columnas / totales ======
  const status: string = (selectedOrder?.status || "").toLowerCase();
  const items: CashOrderItem[] = selectedOrder?.items ?? [];

  const columns: ColumnsType<CashOrderItem> = [
    {
      title: "Producto",
      dataIndex: "name",
      key: "name",
      render: (_, it) =>
        (it as any).name ?? (it as any).product?.name ?? `#${it.id}`,
    },
    { title: "Cant.", dataIndex: "qty", key: "qty", align: "right", width: 80 },
    {
      title: "P. Unit.",
      dataIndex: "unitPrice",
      key: "unitPrice",
      align: "right",
      render: (v) => `$${Number(v ?? 0).toFixed(2)}`,
      width: 120,
    },
    {
      title: "Importe",
      key: "importe",
      align: "right",
      render: (_, it: any) => {
        const unit = Number(it.unitPrice ?? 0);
        const disc = Number(it.discountValue ?? 0);
        return money(unit - disc);
      },
      width: 120,
    },
    {
      title: "Total",
      key: "total",
      align: "right",
      render: (_, it: any) =>
        `$${Number(
          it.total ?? Number(it.qty ?? 0) * Number(it.unitPrice ?? 0)
        ).toFixed(2)}`,
      width: 120,
    },
  ];
  // function openDeleteFlow() {
  //   setDeleteManagerPassword("");
  //   setDeleteApprovalVisible(true);
  // }
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
        selectedOrder?.id ?? 0
      );
      await doDeleteOrderOnApi(approval);
      message.success("Orden borrada");
      setOrders((prev: any[]) =>
        prev.filter((o) => o.id !== (selectedOrder?.id ?? -1))
      );
      setSelectedOrderId(null);
      await fetchKPIs();
      setDeleteApprovalVisible(false);
      setDeleteManagerPassword("");
    } catch (e: any) {
      message.error(String(e?.message || "Error al borrar la orden"));
    }
  }

  const { baseSubtotal, taxTotal, grandTotal } = useMemo(() => {
    let base = 0,
      tax = 0,
      total = 0;
    for (const it of items) {
      const qty = Number(it.qty ?? 0);
      const basePrice = Number(it.basePrice ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);
      base += basePrice * qty;
      tax += (unitPrice - basePrice) * qty;
      total += unitPrice * qty;
    }
    base = Math.round(base * 100) / 100;
    tax = Math.round(tax * 100) / 100;
    total = Math.round(total * 100) / 100;
    return { baseSubtotal: base, taxTotal: tax, grandTotal: total };
  }, [items]);

  // ====== Helpers ticket ======
  const orderIndex =
    (orders?.findIndex((o: any) => o.id === selectedOrder?.id) ?? -1) + 1;

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
            (m.compositeProductId ?? null) === compId
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

  function escapeHtml(s: string) {
    return String(s)
      .replace("&", "&amp;")
      .replace("<", "&lt;")
      .replace(">", "&gt;");
  }

  function formatDate(d: Date | string | number) {
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
      dt.getDate()
    )} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  function buildTicketHtml() {
    const rows = buildTicketRows(items);
    const createdAt =
      (selectedOrder as any)?.createdAt ||
      (selectedOrder as any)?.created_at ||
      new Date();

    const startStr = formatDate(createdAt);
    const endStr = formatDate(Date.now());

    const restaurantName =
      selectedOrder?.restaurant?.name ?? "Cantina La Llorona";
    const restaurantAddress =
      selectedOrder?.restaurant?.address_line1 ?? "Dirección del restaurante";
    const restaurantRfc = selectedOrder?.restaurant?.rfc ?? "RFC: —";
    const restaurantPhone = selectedOrder?.restaurant?.phone ?? "Tel: —";
    const waiterName =
      (selectedOrder?.waiter as any)?.fullName ??
      (selectedOrder?.waiter as any)?.name ??
      "-";

    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket Orden #${selectedOrder?.id ?? "-"}</title>
<style>
  @page { size: 80mm auto; margin: 1mm; }
  * { box-sizing: border-box; }
  body { font-family: "Courier New"; font-size: 14px; margin: 0; padding: 0; width: 78mm; line-heigh: 1.5 }
  .ticket { width: 100%; padding: 2mm 0.5mm; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .sep { margin: 4px 0; border-top: 1px dashed #000; }
  .row { display: flex; gap: 4px; }
  .row .qty { width: 12mm; text-align: left; }
  .row .desc { flex: 1; white-space: pre-wrap; }
  .row .amt { width: 22mm; text-align: right; }
  .mb2 { margin-bottom: 2px; }
  .small { font-size: 14px; }
</style>
</head>
<body>
  <div class="ticket">
    <div class="center bold">${escapeHtml(restaurantName)}</div>
    <div class="center small">${escapeHtml(restaurantAddress)}</div>
    <div class="center small">${escapeHtml(restaurantRfc)} · ${escapeHtml(restaurantPhone)}</div>

    <div class="sep"></div>

    <div class="small">
      Mesa: <span class="bold">${escapeHtml(String(selectedOrder?.tableName ?? "-"))}</span><br/>
      Mesero: <span class="bold">${escapeHtml(String(waiterName))}</span><br/>
      Personas: <span class="bold">${escapeHtml(String(selectedOrder?.persons ?? "-"))}</span><br/>
      Orden: <span className="bold">${orderIndex > 0 ? orderIndex : "-"}</span> / ${orders?.length ?? "-"}<br/>
      Inicio: <span class="bold">${startStr}</span><br/>
      Fin: <span class="bold">${endStr}</span>
    </div>

    <div class="sep"></div>

    <div class="row bold mb2">
      <div class="qty">Cant</div>
      <div class="desc">Descripción</div>
      <div class="amt">Importe</div>
    </div>

    ${rows
      .map(
        (r) => `
      <div class="row">
        <div class="qty">${r.qty}</div>
        <div class="desc">${escapeHtml(r.desc)}</div>
        <div class="amt">${money(r.amount)}</div>
      </div>`
      )
      .join("")}

    <div class="sep"></div>

    <div class="row">
      <div class="desc bold">Subtotal (base)</div>
      <div class="amt">${money(baseSubtotal)}</div>
    </div>
    <div class="row">
      <div class="desc bold">Impuestos</div>
      <div class="amt">${money(taxTotal)}</div>
    </div>
    <div class="row">
      <div class="desc bold">Total</div>
      <div class="amt">${money(grandTotal)}</div>
    </div>

    <div class="sep"></div>
    <div class="center small">Gracias por su visita</div>
  </div>
  <script>
    window.onload = () => {
      window.print();
      setTimeout(() => window.close(), 300);
    };
  </script>
</body>
</html>
`.trim();
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
        document.body.removeChild(iframe);
      }, 1200);
    } else {
      document.body.removeChild(iframe);
    }
  }

  function handlePrintPreview() {
    const html = buildTicketHtml();
    printViaIframe(html);
  }

  // ====== Aprobaciones (pos-auth) ======
  async function requestApprovalToken(
    action: string,
    password: string,
    targetId: number
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
      { validateStatus: () => true }
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
  // const printCount = Number(
  //   (selectedOrder as any)?.printCount ??
  //     (selectedOrder as any)?.print_count ??
  //     0
  // );

  const canPrint =
    hasItems &&
    (status === "open" || status === "in_progress" || status === "reopened");
  const canPay = status === "printed"; // debe estar impresa
  const canVoidItems = hasItems && status !== "printed";
  const canCancel =
    status === "printed" || status === "paid" || status === "closed";
  const canReopen = status === "printed" || status === "paid";

  // 👉 nuevo: borrar cuenta solo si jamás se imprimió y no hay productos
  // const canDeleteOrder = printCount === 0 && !hasItems;

  // ====== Cancelación ======

  const openCancelFlow = () => {
    setReason("");
    setManagerPassword("");
    setCancelVisible(true);
  };

  async function doCancelOnOrderApi(approvalToken: string) {
    const res = await apiOrderKiosk.delete(
      `/orders/${selectedOrder?.id}/cancel`,
      {
        data: { refunds: [], reason: reason || "cancel_by_manager" },
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      }
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
        selectedOrder?.id ?? 0
      );
      const result = await doCancelOnOrderApi(approval);

      message.success(`Orden cancelada (${result?.status ?? "OK"})`);
      setOrders((prev: any[]) =>
        prev.filter((o) => o.id !== (selectedOrder?.id ?? -1))
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
  async function doPrintOnOrderApi(approvalToken: string) {
    const res = await apiOrderKiosk.post(
      `/orders/${selectedOrder?.id}/print`,
      {},
      {
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      }
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err = (res?.data && res.data.error) || "Impresión falló";
      throw new Error(err);
    }
    return res.data as { folioSeries: string; folioNumber: number };
  }

  const openPrintFlow = () => {
    setPrintManagerPassword("");
    setPrintApprovalVisible(true);
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
        selectedOrder?.id ?? 0
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
      // previsualización; la asignación real es tras aprobación
      handlePrintPreview();
    } catch (e: any) {
      message.error(String(e?.message || "Error al imprimir"));
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
      }
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
        selectedOrder?.id ?? 0
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
      }
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
        selectedOrder?.id ?? 0
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
        <div className="flex items-center justify-between">
          <span>
            {selectedOrder
              ? `Orden #${selectedOrder.id} · ${selectedOrder.tableName ?? "-"}`
              : "Detalle de la orden"}
          </span>
          <div className="flex gap-2">
            {selectedOrder && (
              <>
                <Button onClick={openPrintFlow} disabled={!canPrint}>
                  🖨️ Imprimir Cuenta
                </Button>
                {canReopen && (
                  <Button onClick={openReopenFlow}>🔓 Reabrir</Button>
                )}
                <Button danger onClick={openCancelFlow} disabled={!canCancel}>
                  ⛔ Cancelar folio
                </Button>
                <Button onClick={openVoidFlow} disabled={!canVoidItems}>
                  🗑️ Eliminar productos
                </Button>
                {/* 👉 nuevo botón: borrar cuenta */}

                {/* <Button
                  onClick={openDeleteFlow}
                  disabled={!canDeleteOrder}
                  danger
                  type="dashed"
                  title="Solo si nunca se imprimió y no tiene productos"
                >
                  🗑️ Borrar cuenta
                </Button> */}
              </>
            )}
          </div>
        </div>
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
              </Descriptions>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Total: </h1>
                <p className="text-2xl font-bold">{money(grandTotal)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="primary"
                size="large"
                onClick={() => setOpenPay(true)}
                disabled={!canPay}
                title={!canPay ? "Debes imprimir antes de cobrar" : ""}
              >
                Cobrar
              </Button>
            </div>

            <PayModal open={openPay} onClose={() => setOpenPay(false)} />
          </Space>

          {/* ========= Cancelar (Modal 1: config) ========= */}
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
                              : prev.filter((x) => x !== it.id)
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
              onChange={(e) => setVoidManagerPassword(e.target.value)}
              placeholder="Contraseña de administrador"
            />
          </Modal>
        </>
      )}
    </Card>
  );
}
