import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AutoComplete } from "antd";
import dayjs from "dayjs";
import {
  InventoryPresentationRow,
  StockCountDetail,
  StockCountItemRow,
  addStockCountItem,
  closeStockCount,
  deleteStockCountItem,
  getStockCount,
  searchInventoryPresentations,
  updateStockCountItem,
} from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  restaurantId: number;
  countId: number | null;
};

export default function StockCountDetailDrawer({
  open,
  onClose,
  onUpdated,
  restaurantId,
  countId,
}: Props) {
  const [detail, setDetail] = useState<StockCountDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // búsqueda de presentaciones para agregar
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<InventoryPresentationRow[]>(
    [],
  );
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // modal agregar item
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPresentation, setSelectedPresentation] =
    useState<InventoryPresentationRow | null>(null);
  const [addQtyPresentations, setAddQtyPresentations] = useState<number>(1);
  const [addNotes, setAddNotes] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // modal editar item
  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockCountItemRow | null>(
    null,
  );
  const [editForm] = Form.useForm();
  const [editSaving, setEditSaving] = useState(false);

  async function load() {
    if (!countId) return;
    setLoading(true);
    try {
      const d = await getStockCount(restaurantId, countId);
      setDetail(d);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando conteo");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, countId, restaurantId]);

  // Sugerencias: si search vacío, el backend puede devolver un "top 10" (o lo que tenga).
  useEffect(() => {
    if (!open || !countId) return;
    const handle = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const res = await searchInventoryPresentations(
          restaurantId,
          search || undefined,
        );
        setSuggestions(res.slice(0, 10));
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [open, countId, restaurantId, search]);

  const isClosed =
    detail?.status === "closed" || detail?.status === "cancelled";
  const canClose = !isClosed;

  // const totalDiffCost = useMemo(() => {
  //   const items = detail?.items ?? [];
  //   return items.reduce((acc, it) => acc + (Number(it.differenceTotalCost ?? 0) || 0), 0);
  // }, [detail]);

  const itemColumns: ColumnsType<StockCountItemRow> = [
    {
      title: "Presentación",
      width: 240,
      render: (_, r) => {
        const pres = r.presentation?.name ?? String(r.presentationId);
        const refItem = r.item ?? r.inventoryItem;
        const item = refItem
          ? `Insumo: ${refItem.code} — ${refItem.name}`
          : `Insumo: #${r.inventoryItemId}`;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{pres}</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>{item}</div>
          </div>
        );
      },
    },
    {
      title: "Cantidad contada",
      dataIndex: "countedQtyBase",
      width: 140,
    },
    {
      title: "Notas",
      dataIndex: "notes",
      width: 200,
      render: (v) => (v ? String(v) : "—"),
    },
    {
      title: "Acciones",
      width: 200,
      render: (_, r) => (
        <Space>
          <Tooltip title={isClosed ? "Conteo cerrado" : ""}>
            <Button
              size="small"
              disabled={isClosed}
              onClick={() => {
                setEditingItem(r);
                editForm.setFieldsValue({
                  countedQtyBase: r.countedQtyBase ?? 0,
                  notes: r.notes ?? "",
                });
                setEditOpen(true);
              }}
            >
              Editar
            </Button>
          </Tooltip>
          <Tooltip title={isClosed ? "Conteo cerrado" : ""}>
            <Button
              size="small"
              danger
              disabled={isClosed}
              onClick={() => {
                Modal.confirm({
                  title: "Eliminar item del conteo",
                  content: "Esto lo quita del conteo físico. ¿Continuar?",
                  okText: "Eliminar",
                  okButtonProps: { danger: true },
                  cancelText: "Cancelar",
                  onOk: async () => {
                    try {
                      if (!countId) {
                        message.error("Conteo inválido");
                        return;
                      }
                      await deleteStockCountItem(restaurantId, countId, r.id);
                      message.success("Eliminado");
                      load();
                      onUpdated();
                    } catch (e: any) {
                      message.error(e?.message ?? "Error eliminando");
                    }
                  },
                });
              }}
            >
              Eliminar
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const autocompleteOptions = suggestions.map((r) => ({
    value: r.name,
    presentation: r,
    label: (
      <div>
        <div style={{ fontWeight: 600 }}>{r.name}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          {r.item
            ? `${r.item.code} — ${r.item.name}`
            : String(r.inventoryItemId)}
        </div>
      </div>
    ),
  }));

  async function doClose() {
    if (!countId) return;
    setClosing(true);
    try {
      await closeStockCount(restaurantId, countId);
      message.success("Conteo cerrado");
      await load();
      onUpdated();
    } catch (e: any) {
      message.error(e?.message ?? "Error cerrando conteo");
    } finally {
      setClosing(false);
    }
  }

  async function doAdd() {
    if (!countId || !selectedPresentation) return;
    const qtyBase =
      (Number(addQtyPresentations) || 0) *
      (Number(selectedPresentation.contentInBaseUnit) || 0);
    if (!Number.isFinite(qtyBase) || qtyBase < 0) {
      message.error("Cantidad inválida");
      return;
    }
    setAdding(true);
    try {
      await addStockCountItem(restaurantId, countId, {
        inventoryItemId: selectedPresentation.inventoryItemId,
        presentationId: selectedPresentation.id,
        countedQtyBase: qtyBase,
        notes: addNotes || undefined,
      });
      message.success("Agregado al conteo");
      setAddOpen(false);
      setSelectedPresentation(null);
      await load();
      onUpdated();
    } catch (e: any) {
      message.error(e?.message ?? "Error agregando item");
    } finally {
      setAdding(false);
    }
  }

  async function doEdit() {
    if (!countId || !editingItem?.id) return;
    const v = await editForm.validateFields();
    setEditSaving(true);
    try {
      await updateStockCountItem(restaurantId, countId, editingItem.id, {
        countedQtyBase: v.countedQtyBase,
        notes: v.notes ?? "",
      });
      message.success("Actualizado");
      setEditOpen(false);
      setEditingItem(null);
      await load();
      onUpdated();
    } catch (e: any) {
      message.error(e?.message ?? "Error actualizando");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <Drawer
      title={
        detail
          ? `${detail.name ?? detail.notes ?? `Conteo #${detail.id}`}`
          : "Conteo"
      }
      open={open}
      onClose={onClose}
      width={980}
      destroyOnClose
      extra={
        <Space>
          {detail && <Tag>{detail.status}</Tag>}
          <Button onClick={load} loading={loading}>
            Refrescar
          </Button>
          <Tooltip title={isClosed ? "Conteo cerrado" : ""}>
            <Button
              type="primary"
              disabled={!canClose}
              loading={closing}
              onClick={doClose}
            >
              Cerrar conteo
            </Button>
          </Tooltip>
        </Space>
      }
    >
      {!detail ? (
        <div style={{ padding: 12, opacity: 0.7 }}>
          {loading ? "Cargando…" : "Selecciona un conteo."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Typography.Text type="secondary">
              Almacén: {detail.warehouse?.name ?? detail.warehouseId} · Fecha de
              conteo:{" "}
              {detail.startedAt
                ? dayjs(detail.startedAt).format("YYYY-MM-DD HH:mm")
                : "—"}{" "}
              · Status:{" "}
              {(() => {
                const s = String(detail.status ?? "");
                if (s === "in_progress") return "En progreso";
                if (s === "closed") return "Cerrado";
                if (s === "cancelled") return "Cancelado";
                return s || "—";
              })()}
            </Typography.Text>
            <div style={{ marginTop: 4 }}>
              <Typography.Text type="secondary">
                Responsable: {detail.countedBy ?? "—"}
                {detail.finishedAt
                  ? ` · Cerrado: ${dayjs(detail.finishedAt).format("YYYY-MM-DD HH:mm")}`
                  : ""}
                {detail.closedBy ? ` · Cerrado por: ${detail.closedBy}` : ""}
              </Typography.Text>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Agregar item
            </Typography.Title>
            <Space style={{ width: "100%" }}>
              <AutoComplete
                style={{ width: 420 }}
                value={search}
                onChange={(value) => setSearch(value)}
                options={autocompleteOptions}
                placeholder="Busca una presentación"
                onSelect={(_, option) => {
                  const match = (option as any)?.presentation as
                    | InventoryPresentationRow
                    | undefined;
                  if (!match) return;
                  setSelectedPresentation(match);
                  setAddQtyPresentations(1);
                  setAddNotes("");
                  setAddOpen(true);
                }}
                notFoundContent={
                  suggestionsLoading ? "Cargando..." : "Sin resultados"
                }
                disabled={isClosed}
              />
            </Space>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              Items del conteo
            </Typography.Title>
            <Table
              rowKey="id"
              loading={loading}
              dataSource={detail.items ?? []}
              columns={itemColumns}
              pagination={{ pageSize: 20 }}
            />
          </div>
        </div>
      )}

      <Modal
        title="Agregar al conteo"
        open={addOpen}
        onOk={doAdd}
        confirmLoading={adding}
        onCancel={() => setAddOpen(false)}
        okText="Agregar"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ opacity: 0.8 }}>
            {selectedPresentation?.item
              ? `${selectedPresentation.item.code} — ${selectedPresentation.item.name}`
              : ""}
          </div>
          <div>
            <b>{selectedPresentation?.name}</b>{" "}
            <span style={{ opacity: 0.7 }}>
              (contenido base: {selectedPresentation?.contentInBaseUnit})
            </span>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Cantidad (en presentaciones)</div>
            <InputNumber
              min={0}
              value={addQtyPresentations}
              onChange={(v) => setAddQtyPresentations(Number(v ?? 0))}
              style={{ width: "100%" }}
            />
            <div style={{ marginTop: 6, opacity: 0.75 }}>
              Esto se guardará como base = cantidad × contenido ={" "}
              <b>
                {(
                  Number(addQtyPresentations || 0) *
                  Number(selectedPresentation?.contentInBaseUnit || 0)
                ).toFixed(4)}
              </b>
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Notas (opcional)</div>
            <Input.TextArea
              rows={3}
              value={addNotes}
              onChange={(e) => setAddNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="Editar item"
        open={editOpen}
        onOk={doEdit}
        confirmLoading={editSaving}
        onCancel={() => setEditOpen(false)}
        okText="Guardar"
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item
            label="Contado (base)"
            name="countedQtyBase"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Notas" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
