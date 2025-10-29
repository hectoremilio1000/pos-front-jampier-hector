import React, { useMemo, useRef, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Modal,
  Tabs,
  Space,
  Typography,
  Divider,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  PrinterOutlined,
  CommentOutlined,
} from "@ant-design/icons";

/************************************
 * Tipos
 ************************************/

type Half = 0 | 1 | 2 | 3; // 0: N/A, 1: Todo, 2: 1 mitad, 3: 2da mitad

const HALF_LABEL: Record<Half, string> = {
  0: "",
  1: "Todo",
  2: "1 mitad",
  3: "2da mitad",
};
type Grupo = {
  id: number;
  name: string;
  isEnabled: boolean;
};
type AreaImpresion = {
  id: number;
  restaurantId: number;
  name: string;
};
type ProductModifierGroups = {
  productId: number;
  modifierGroupId: number;
  includedQty: number;
  maxQty: number;
  isForced: boolean;
  captureIncluded: boolean;
  priority: number;
  modifierGroup: ModifierGroups;
};
type ModifierGroups = {
  id: number;
  code: string;
  name: string;
  modifiers: Modifiers[];
};
type Modifiers = {
  id: number;
  isInabled: boolean;
  modifierGroupId: number;
  modifierId: number;
  priceDelta: number;
  productId: number;
  modifier: Producto;
};
export interface Producto {
  id: number;
  name: string;
  group: Grupo;
  subgrupo?: string;
  categoria: "alimentos" | "bebidas" | "otros";
  unidad: string;
  basePrice: number;
  contieneIVA: boolean;
  printArea: number;
  areaImpresion: AreaImpresion;
  suspendido: boolean;
  isEnabled: boolean;
  modifierGroups: ModifierGroups[];
  modifiers: Modifiers[];
  productModifierGroups: ProductModifierGroups[];
}

export interface OrderItem {
  orderId: number | null;
  productId: number;
  qty: number;
  unitPrice: number;
  total: number;
  notes: string | null;
  course: number;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number | null;
  discountAppliedBy: number | null;
  discountReason: string | null;
  product: Producto;
  status: string | null;
  // NUEVOS CAMPOS:
  compositeProductId: number | null; // id del producto principal al que pertenece el item
  isModifier: boolean; // true si es una línea de modifier
  isCompositeProductMain: boolean; // true si es la línea principal del compuesto
  half: Half; // 0/1/2/3 (ver arriba)
}

export interface TiempoOption {
  label: string;
  value: number;
}

/************************************
 * Utilidades
 ************************************/

const formatCurrency = (n: number | string) => {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
};

const formatQty = (n?: number) => (typeof n === "number" ? n : "");

const getAreaId = (item: OrderItem) =>
  item.product?.areaImpresion?.id ?? item.product?.printArea ?? null;
const getAreaName = (item: OrderItem) =>
  item.product?.areaImpresion?.name ??
  (getAreaId(item) ? `Área ${getAreaId(item)}` : "Sin área");

/************************************
 * Estructura de tabla (árbol)
 ************************************/

type RowType = "item" | "halfGroup";

interface BaseRow {
  key: string;
  rowType: RowType;
  children?: TableRow[];
}

interface ItemRow extends BaseRow {
  rowType: "item";
  original: OrderItem & { originalIndex: number };
}

interface HalfGroupRow extends BaseRow {
  rowType: "halfGroup";
  half: Half; // 1|2|3
  parentCompositeId: number; // product.id del main
}

type TableRow = ItemRow | HalfGroupRow;

/**
 * Transforma detalle_cheque a un tree para AntD sin mutar el array original.
 * - El producto compuesto (main) aparece como fila padre.
 * - Sus modifiers se agrupan por `half` bajo etiquetas (1 mitad, 2da mitad, Todo).
 * - Ítems sueltos (no compuestos) quedan como filas raíz.
 */
function buildTree(detalle_cheque: OrderItem[]): TableRow[] {
  type WithIndex = OrderItem & { originalIndex: number };
  const items: WithIndex[] = detalle_cheque.map((it, i) => ({
    ...it,
    originalIndex: i,
  }));

  // Detectar mains reales o ítems sueltos
  const mains: WithIndex[] = [];
  const standalone: WithIndex[] = [];

  // Map { compositeProductId -> modifiers[] }
  const modifiersByComposite = new Map<number, WithIndex[]>();

  for (const it of items) {
    if (it.isModifier && it.compositeProductId) {
      const arr = modifiersByComposite.get(it.compositeProductId) ?? [];
      arr.push(it);
      modifiersByComposite.set(it.compositeProductId, arr);
    } else if (it.isCompositeProductMain) {
      mains.push(it);
    } else if (!it.isModifier && !it.compositeProductId) {
      // Producto normal (no compuesto)
      standalone.push(it);
    } else {
      // En caso de que venga un main sin flag o datos atípicos
      mains.push(it);
    }
  }

  // Mantener el orden de aparición: por índice del main o del primer miembro del grupo
  const orderKey = (w: WithIndex) => w.originalIndex;

  // Construir filas raíz: mains + standalone
  const roots: TableRow[] = [];

  // Primero los sueltos respetando orden
  standalone
    .sort((a, b) => orderKey(a) - orderKey(b))
    .forEach((it) => {
      roots.push({
        key: `solo-${it.originalIndex}`,
        rowType: "item",
        original: it,
      });
    });

  // Luego cada main con sus modifiers agrupados por half
  mains
    .sort((a, b) => orderKey(a) - orderKey(b))
    .forEach((main) => {
      const children: TableRow[] = [];
      const mods = (modifiersByComposite.get(main.product.id) ?? []).slice();

      // Separar por half
      const byHalf = new Map<Half, WithIndex[]>();
      const withoutHalf: WithIndex[] = [];
      for (const m of mods) {
        if (m.half !== 0) {
          const arr = byHalf.get(m.half) ?? [];
          arr.push(m);
          byHalf.set(m.half, arr);
        } else {
          withoutHalf.push(m);
        }
      }

      // Orden deseado: 2 -> 3 -> 1 (y luego sin half al final)
      const halfOrder: Half[] = [2, 3, 1];
      for (const h of halfOrder) {
        const list = byHalf.get(h);
        if (!list || list.length === 0) continue;
        const halfRow: HalfGroupRow = {
          key: `half-${main.product.id}-${h}`,
          rowType: "halfGroup",
          half: h,
          parentCompositeId: main.product.id,
          children: list.map((mm) => ({
            key: `mod-${mm.originalIndex}`,
            rowType: "item",
            original: mm,
          })),
        };
        children.push(halfRow);
      }

      // Si hay modifiers sin half (0), se agregan como hijos directos
      for (const mm of withoutHalf) {
        children.push({
          key: `mod-${mm.originalIndex}`,
          rowType: "item",
          original: mm,
        });
      }

      const mainRow: ItemRow = {
        key: `main-${main.originalIndex}`,
        rowType: "item",
        original: main,
        children,
      };
      roots.push(mainRow);
    });

  return roots;
}

/************************************
 * Tickets (agrupación por área de impresión)
 ************************************/

interface TicketGroup {
  areaId: number | null;
  areaName: string;
  items: OrderItem[];
}

function groupByArea(detalle_cheque: OrderItem[]): TicketGroup[] {
  const map = new Map<number | null, TicketGroup>();
  for (const it of detalle_cheque) {
    const areaId = getAreaId(it);
    const areaName = getAreaName(it);
    const g = map.get(areaId) ?? { areaId, areaName, items: [] };
    g.items.push(it);
    map.set(areaId, g);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.areaName > b.areaName ? 1 : -1
  );
}

function buildTicketTree(items: OrderItem[]): TableRow[] {
  return buildTree(items);
}

/************************************
 * Componente Ticket (HTML 80mm)
 ************************************/

const Ticket: React.FC<{
  title: string;
  items: OrderItem[];
  tiempos: TiempoOption[];
  orderId?: number | null;
}> = ({ title, items, tiempos, orderId }) => {
  const data = useMemo(() => buildTicketTree(items), [items]);
  const now = new Date();
  const fmtDate = now.toLocaleDateString("es-MX");
  const fmtTime = now.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="ticket80">
      <div className="hdr">
        <div className="ttl">{title}</div>
        <div className="meta">
          <div>ID Pedido: {orderId ?? "-"}</div>
          <div>
            {fmtDate} {fmtTime}
          </div>
        </div>
      </div>
      <Divider className="divider" />

      {/* Encabezados */}
      <div className="row head">
        <div className="col desc">Producto</div>
        <div className="col qty">Cant</div>
        <div className="col price">P.Unit</div>
        <div className="col total">Total</div>
      </div>

      {data.map((r) => (
        <TicketRow key={r.key} row={r} tiempos={tiempos} depth={0} />
      ))}

      <Divider className="divider" />
      <div className="foot">
        <div>Impreso por POS Web</div>
      </div>

      {/* Estilos inline para asegurar consistencia en ventana de impresión */}
      <style>{ticketStyles}</style>
    </div>
  );
};

const TicketRow: React.FC<{
  row: TableRow;
  tiempos: TiempoOption[];
  depth: number;
}> = ({ row, tiempos, depth }) => {
  if (row.rowType === "halfGroup") {
    return (
      <>
        <div className="row half">
          <div className="col desc" style={{ paddingLeft: 4 + depth * 8 }}>
            ─ {HALF_LABEL[row.half]}
          </div>
          <div className="col qty" />
          <div className="col price" />
          <div className="col total" />
        </div>
        {row.children?.map((c) => (
          <TicketRow key={c.key} row={c} tiempos={tiempos} depth={depth + 1} />
        ))}
      </>
    );
  }

  const it = row.original;
  const isMod = it.isModifier;
  const tiempo = tiempos.find((t) => t.value === it.course)?.label ?? "";
  return (
    <>
      <div className={`row item ${isMod ? "mod" : ""}`}>
        <div className="col desc" style={{ paddingLeft: 4 + depth * 8 }}>
          {isMod ? "↳ " : ""}
          {it.product.name}
          {tiempo ? <span className="chip">{tiempo}</span> : null}
          {it.notes ? <span className="chip note">Nota</span> : null}
        </div>
        <div className="col qty">{formatQty(it.qty)}</div>
        <div className="col price">{formatCurrency(it.unitPrice)}</div>
        <div className="col total">{formatCurrency(it.total)}</div>
      </div>
      {row.children?.map((c) => (
        <TicketRow key={c.key} row={c} tiempos={tiempos} depth={depth + 1} />
      ))}
    </>
  );
};

const ticketStyles = `
.ticket80 { width: 80mm; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color: #000; }
.ticket80 .hdr { text-align: center; }
.ticket80 .ttl { font-weight: 700; font-size: 14px; }
.ticket80 .meta { margin-top: 4px; }
.ticket80 .divider { margin: 8px 0; border-color: #000; }
.ticket80 .row { display: grid; grid-template-columns: 1fr 40px 64px 72px; gap: 4px; align-items: start; }
.ticket80 .row.head { border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; font-weight: 700; }
.ticket80 .row.half { font-style: italic; opacity: 0.9; }
.ticket80 .row.item.mod { opacity: 0.95; }
.ticket80 .col { white-space: pre-wrap; word-break: break-word; }
.ticket80 .col.desc { }
.ticket80 .col.qty, .ticket80 .col.price, .ticket80 .col.total { text-align: right; }
.ticket80 .chip { display: inline-block; margin-left: 6px; padding: 1px 4px; border: 1px solid #000; border-radius: 3px; font-size: 10px; }
.ticket80 .chip.note { border-style: dashed; }
@media print {
  @page { size: 80mm auto; margin: 0; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-only { display: block; }
}
`;

/************************************
 * Helper para imprimir solo el contenido del ticket
 ************************************/

function printHtmlFromElement(el: HTMLElement, title = "Comanda") {
  const win = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=400,height=600"
  );
  if (!win) {
    message.error(
      "Bloqueador de ventanas emergentes activo. Permite popups para imprimir."
    );
    return;
  }
  const doc = win.document;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset=\"utf-8\" /><title>${title}</title></head><body>${el.outerHTML}</body></html>`
  );
  doc.close();
  // Dar tiempo a cargar estilos inline
  setTimeout(() => {
    win.focus();
    win.print();
    // win.close(); // opcional, si quieres cerrar automáticamente
  }, 150);
}

/************************************
 * Tabla agrupada + modal de previsualización
 ************************************/

interface Props {
  detalle_cheque: OrderItem[];
  eliminarProducto: (index: number) => void;
  setComentarioIndex: (index: number) => void;
  setModalComentarioVisible: (open: boolean) => void;
  tiempos: TiempoOption[];
}

const ComandaTable: React.FC<Props> = ({
  detalle_cheque,
  eliminarProducto,
  setComentarioIndex,
  setModalComentarioVisible,
  tiempos,
}) => {
  const dataTree = useMemo(() => buildTree(detalle_cheque), [detalle_cheque]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const groups = useMemo(() => groupByArea(detalle_cheque), [detalle_cheque]);
  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const columns: ColumnsType<TableRow> = [
    {
      title: "Acción",
      key: "accion",
      width: 120,
      render: (_, record) => {
        if (record.rowType === "halfGroup") return null;
        const idx = record.original.originalIndex;
        return (
          <Space size="small">
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => eliminarProducto(idx)}
            />
            <Button
              size="small"
              icon={<CommentOutlined />}
              onClick={() => {
                setComentarioIndex(idx);
                setModalComentarioVisible(true);
              }}
            />
          </Space>
        );
      },
    },
    {
      title: "Cant",
      dataIndex: "qty",
      align: "right",
      render: (_, record) =>
        record.rowType === "item" ? record.original.qty : null,
      width: 80,
    },
    {
      title: "Producto",
      key: "producto",
      render: (_, record) => {
        if (record.rowType === "halfGroup") {
          return <Tag color="blue">{HALF_LABEL[record.half]}</Tag>;
        }
        const it = record.original;
        return (
          <span>
            {it.isModifier ? <span style={{ opacity: 0.8 }}>↳ </span> : null}
            {it.product.name}
            {it.notes ? <Tag style={{ marginLeft: 8 }}>Nota</Tag> : null}
          </span>
        );
      },
    },

    {
      title: "Importe",
      align: "right",
      render: (_, record) =>
        record.rowType === "item"
          ? formatCurrency(record.original.unitPrice)
          : null,
      width: 120,
    },
    {
      title: "Total",
      align: "right",
      render: (_, record) =>
        record.rowType === "item"
          ? formatCurrency(record.original.total)
          : null,
      width: 120,
    },
    {
      title: "Tiempo",
      align: "center",
      render: (_, record) => {
        if (record.rowType !== "item") return null;
        const t = tiempos.find((x) => x.value === record.original.course);
        return <Tag>{t?.label ?? "-"}</Tag>;
      },
      width: 120,
    },
  ];

  const itemsTabs = groups.map((g) => ({
    key: String(g.areaId ?? "null"),
    label: g.areaName,
    children: (
      <div>
        <div
          ref={(el) => {
            ticketRefs.current[`${g.areaId ?? "null"}`] = el;
          }}
        >
          <Ticket
            title={`Comanda — ${g.areaName}`}
            items={g.items}
            tiempos={tiempos}
            orderId={g.items[0]?.orderId ?? null}
          />
        </div>
        <div style={{ marginTop: 8, textAlign: "right" }}>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => {
              const el = ticketRefs.current[`${g.areaId ?? "null"}`];
              if (el) printHtmlFromElement(el, `Comanda — ${g.areaName}`);
            }}
          >
            Imprimir esta área
          </Button>
        </div>
      </div>
    ),
  }));

  return (
    <div className="comanda-table">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Typography.Title level={5} style={{ margin: 0 }}>
          Detalle
        </Typography.Title>
        {/* <Space>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => setPreviewOpen(true)}
          >
            Comandar
          </Button>
        </Space> */}
      </div>

      <Table<TableRow>
        className="w-full"
        columns={columns}
        dataSource={dataTree}
        rowKey={(r) => r.key}
        pagination={false}
        expandable={{ defaultExpandAllRows: true, indentSize: 16 }}
        size="small"
      />

      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        title="Previsualizar comanda"
        width={520}
        footer={null}
      >
        <Tabs items={itemsTabs} />
        <Divider />
        <Space
          style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
        >
          <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
        </Space>
      </Modal>

      <style>{`
        .comanda-table .ant-table-row .ant-tag {
          line-height: 18px;
        }
        .comanda-table .ant-table-row-level-1 {
          background: #fafafa;
        }
      `}</style>
    </div>
  );
};

export default ComandaTable;
