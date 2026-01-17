import { Button, Input, InputNumber, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import type { StockRequestItemRow } from "@/lib/api_inventory";

type Props = {
  rows: StockRequestItemRow[];
  loading?: boolean;
  onUpdate?: (itemId: number, payload: { quantity?: number; notes?: string | null }) => void;
  onDelete?: (itemId: number) => void;
  savingItemId?: number | null;
  deletingItemId?: number | null;
  disabledActions?: boolean;
};

export default function StockRequestItemsTable({
  rows,
  loading,
  onUpdate,
  onDelete,
  savingItemId,
  deletingItemId,
  disabledActions = false,
}: Props) {
  const [draftQty, setDraftQty] = useState<Record<number, number>>({});
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [savedQty, setSavedQty] = useState<Record<number, number>>({});
  const [savedNotes, setSavedNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    const qtyMap: Record<number, number> = {};
    const notesMap: Record<number, string> = {};
    rows.forEach((r) => {
      qtyMap[r.id] = Number(r.quantity ?? 0);
      notesMap[r.id] = r.notes ? String(r.notes) : "";
    });
    setDraftQty(qtyMap);
    setDraftNotes(notesMap);
    setSavedQty(qtyMap);
    setSavedNotes(notesMap);
  }, [rows]);

  function maybeSave(itemId: number) {
    if (!onUpdate) return;
    if (disabledActions) return;
    if (savingItemId === itemId) return;

    const qty = Number(draftQty[itemId] ?? 0);
    const notes = draftNotes[itemId] ? String(draftNotes[itemId]) : "";
    const lastQty = Number(savedQty[itemId] ?? 0);
    const lastNotes = savedNotes[itemId] ? String(savedNotes[itemId]) : "";

    if (qty === lastQty && notes === lastNotes) return;

    onUpdate(itemId, {
      quantity: qty,
      notes: notes.trim() ? notes : null,
    });
  }

  const columns: ColumnsType<StockRequestItemRow> = [
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
      title: "Qty",
      dataIndex: "quantity",
      width: 120,
      render: (_, r) => (
        <InputNumber
          min={0.0001}
          value={draftQty[r.id]}
          onChange={(v) => setDraftQty((prev) => ({ ...prev, [r.id]: Number(v ?? 0) }))}
          onBlur={() => maybeSave(r.id)}
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
      title: "Notas",
      dataIndex: "notes",
      render: (_, r) => (
        <Input
          value={draftNotes[r.id]}
          onChange={(e) =>
            setDraftNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
          }
          onBlur={() => maybeSave(r.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          placeholder="Notas"
          disabled={disabledActions || savingItemId === r.id}
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
