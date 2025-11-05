import { Card, Descriptions, Empty, Space, Table, Button, Divider } from "antd";
import type { ColumnsType } from "antd/es/table";
import PayModal from "./modals/PayModal";
import { useMemo, useState } from "react";
import { useCash } from "../context/CashKioskContext";
import type { CashOrderItem } from "../hooks/useCashKiosk";

const money = (n: number) =>
  `$${(Math.round((n ?? 0) * 100) / 100).toFixed(2)}`;

export default function OrderDetail() {
  const { selectedOrder, orders } = useCash(); // debe existir orders en tu contexto
  const [open, setOpen] = useState(false);

  // Usa directamente CashOrderItem (ya tiene flags y product)
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

  if (!selectedOrder) {
    return (
      <Card>
        <Empty description="Selecciona una orden para ver el detalle" />
      </Card>
    );
  }

  // ===== Helpers (definidos ANTES del uso) =====
  const orderIndex =
    (orders?.findIndex((o: any) => o.id === selectedOrder.id) ?? -1) + 1;
  // Calcula el importe de una línea: total si existe, si no qty * unitPrice
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

        // principal siempre
        rows.push({ qty, desc: getName(it), amount: lineAmount(it) });

        // Solo mods con importe > 0
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
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(
      dt.getHours()
    )}:${pad(dt.getMinutes())}`;
  }

  function buildTicketHtml() {
    const rows = buildTicketRows(items);
    console.log(rows);

    const createdAt =
      (selectedOrder as any).createdAt ||
      (selectedOrder as any).created_at ||
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

    // <<< OJO: aquí ya NO hay ${money(${baseSubtotal})}, sino ${money(baseSubtotal)} >>>
    return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Ticket Orden #${selectedOrder?.id}</title>
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
      Orden: <span class="bold">${orderIndex > 0 ? orderIndex : "-"}</span> / ${orders?.length ?? "-"}<br/>
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

  // Opción A (recomendada): imprimir por iframe oculto (más estable que window.open)
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
      // el onload del ticket llama window.print()
      // y luego se cierra el window interno; aquí removemos el iframe un poco después
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1200);
    } else {
      document.body.removeChild(iframe);
    }
  }

  // Opción B: abrir en nueva pestaña (puede ser bloqueado por popup blocker)
  function printViaPopup(html: string) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(
      url,
      "_blank",
      "noopener,noreferrer,width=480,height=800"
    );
    if (!win) URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const html = buildTicketHtml();
    // Usa 1 de las dos opciones. La A es más confiable:
    printViaIframe(html);
    // printViaPopup(html);
  }

  // ======= UI =======
  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>{`Orden #${selectedOrder.id} · ${selectedOrder.tableName ?? "-"}`}</span>
          <Button onClick={handlePrint}>🖨️ Imprimir Cuenta</Button>
        </div>
      }
    >
      <Space direction="vertical" className="w-full">
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="Área">
            {selectedOrder.area?.name ?? "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Personas">
            {selectedOrder.persons ?? "-"}
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

        <Descriptions size="small" column={3} bordered>
          <Descriptions.Item label="Subtotal (base)">
            {money(baseSubtotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Impuestos">
            {money(taxTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Total">
            {money(grandTotal)}
          </Descriptions.Item>
        </Descriptions>

        <div className="flex gap-2">
          <Button type="primary" size="large" onClick={() => setOpen(true)}>
            Cobrar
          </Button>
        </div>

        <PayModal open={open} onClose={() => setOpen(false)} />
      </Space>
    </Card>
  );
}
