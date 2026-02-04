// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/OrderItems/OrderItemsTable.tsx
import { Button, Input, InputNumber, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import type { PurchaseOrderItemRow } from "@/lib/api_inventory";

type Props = {
  rows: PurchaseOrderItemRow[];
  loading?: boolean;
  onUpdate?: (itemId: number, payload: { quantity?: number; unitPrice?: number; notes?: string | null }) => void;
  onDelete?: (itemId: number) => void;
  savingItemId?: number | null;
  deletingItemId?: number | null;
  disabledActions?: boolean;
};

function money(n: any) {
  const x = Number(n ?? 0);
  return x.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default function OrderItemsTable({
  rows,
  loading,
  onUpdate,
  onDelete,
  savingItemId = null,
  deletingItemId = null,
  disabledActions = false,
}: Props) {
  const [draftQty, setDraftQty] = useState<Record<number, number>>({});
  const [draftUnitPrice, setDraftUnitPrice] = useState<Record<number, number>>({});
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [savedQty, setSavedQty] = useState<Record<number, number>>({});
  const [savedUnitPrice, setSavedUnitPrice] = useState<Record<number, number>>({});
  const [savedNotes, setSavedNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    const qtyMap: Record<number, number> = {};
    const unitMap: Record<number, number> = {};
    const notesMap: Record<number, string> = {};
    rows.forEach((r) => {
      qtyMap[r.id] = Number(r.quantity ?? 0);
      unitMap[r.id] = Number(r.unitPrice ?? 0);
      notesMap[r.id] = r.notes ? String(r.notes) : "";
    });
    setDraftQty(qtyMap);
    setDraftUnitPrice(unitMap);
    setDraftNotes(notesMap);
    setSavedQty(qtyMap);
    setSavedUnitPrice(unitMap);
    setSavedNotes(notesMap);
  }, [rows]);

  function maybeSave(
    itemId: number,
    opts: {
      onUpdate?: (itemId: number, payload: { quantity?: number; unitPrice?: number; notes?: string | null }) => void;
      disabledActions?: boolean;
      savingItemId?: number | null;
    }
  ) {
    if (!opts.onUpdate) return;
    if (opts.disabledActions) return;
    if (opts.savingItemId === itemId) return;

    const qty = Number(draftQty[itemId] ?? 0);
    const unitPrice = Number(draftUnitPrice[itemId] ?? 0);
    const notes = draftNotes[itemId] ? String(draftNotes[itemId]) : "";
    const lastQty = Number(savedQty[itemId] ?? 0);
    const lastUnit = Number(savedUnitPrice[itemId] ?? 0);
    const lastNotes = savedNotes[itemId] ? String(savedNotes[itemId]) : "";

    if (qty === lastQty && unitPrice === lastUnit && notes === lastNotes) return;

    opts.onUpdate(itemId, {
      quantity: qty,
      unitPrice,
      notes: notes.trim() ? notes : null,
    });
  }

  const columns: ColumnsType<PurchaseOrderItemRow> = [
    {
      title: "Presentación",
      render: (_, r) => {
        const pres = r.presentation;
        if (!pres) return <Tag>#{r.presentationId}</Tag>;
        const item = pres.item?.name ? ` — ${pres.item.name}` : "";
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{pres.name}</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>{item}</div>
          </div>
        );
      },
    },
    {
      title: "Cantidad",
      dataIndex: "quantity",
      width: 110,
      render: (_, r) => (
        <InputNumber
          min={0.0001}
          value={draftQty[r.id]}
          onChange={(v) => setDraftQty((prev) => ({ ...prev, [r.id]: Number(v ?? 0) }))}
          onBlur={() => maybeSave(r.id, { onUpdate, disabledActions, savingItemId })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          disabled={disabledActions || savingItemId === r.id}
          style={{ width: 100 }}
        />
      ),
    },
    {
      title: "Precio",
      dataIndex: "unitPrice",
      width: 140,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={draftUnitPrice[r.id]}
          onChange={(v) => setDraftUnitPrice((prev) => ({ ...prev, [r.id]: Number(v ?? 0) }))}
          onBlur={() => maybeSave(r.id, { onUpdate, disabledActions, savingItemId })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          disabled={disabledActions || savingItemId === r.id}
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: "Total",
      dataIndex: "lineTotal",
      width: 140,
      render: (_, r) =>
        money(
          Number(draftQty[r.id] ?? r.quantity) * Number(draftUnitPrice[r.id] ?? r.unitPrice)
        ),
    },
    {
      title: "Notas",
      dataIndex: "notes",
      width: 240,
      render: (_, r) => (
        <Input
          value={draftNotes[r.id]}
          onChange={(e) => setDraftNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
          onBlur={() => maybeSave(r.id, { onUpdate, disabledActions, savingItemId })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder="Notas"
          disabled={disabledActions || savingItemId === r.id}
          style={{ width: "100%", minWidth: 180 }}
        />
      ),
    },
    {
      title: "Acciones",
      width: 140,
      render: (_, r) => (
        <Space>
          <Popconfirm
            title="¿Eliminar línea?"
            okText="Eliminar"
            cancelText="Cancelar"
            onConfirm={() => onDelete?.(r.id)}
            disabled={disabledActions}
          >
            <Button
              size="small"
              danger
              disabled={disabledActions}
              loading={deletingItemId === r.id}
            >
              Quitar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      size="small"
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={rows}
      pagination={false}
    />
  );
}
