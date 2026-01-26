import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Popconfirm,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import {
  InventoryItemRow,
  InventoryWasteRow,
  WarehouseRow,
  applyInventoryWaste,
  createInventoryWaste,
  listInventoryItems,
  listInventoryWastes,
  listWarehouses,
  updateInventoryWaste,
} from "@/lib/api_inventory";

const REASONS = [
  "Caducidad",
  "Error de cocina",
  "Preparación fallida",
  "Daño o mal manejo",
  "Devolución de cliente",
  "Robo o pérdida",
  "Sobrante de producción",
  "Otro",
];

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  applied: "Aplicada",
  void: "Anulada",
};

function formatQty(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

type WasteFormProps = {
  open: boolean;
  restaurantId: number;
  warehouses: WarehouseRow[];
  items: InventoryItemRow[];
  itemsLoading: boolean;
  initialValues?: Partial<InventoryWasteRow> | null;
  initialItemOption?: InventoryItemRow | null;
  onSearchItems: (q?: string) => void;
  onClose: () => void;
  onCreated: () => void;
};

function WasteFormModal({
  open,
  restaurantId,
  warehouses,
  items,
  itemsLoading,
  initialValues,
  initialItemOption,
  onSearchItems,
  onClose,
  onCreated,
}: WasteFormProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const selectedItemId = Form.useWatch("inventoryItemId", form);
  const selectedItem =
    items.find((it) => it.id === selectedItemId) ??
    (initialItemOption && initialItemOption.id === selectedItemId
      ? initialItemOption
      : undefined);
  const unitLabel =
    selectedItem?.unit?.symbol || selectedItem?.unit?.code || selectedItem?.unit?.name || "";

  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      form.setFieldsValue({
        warehouseId: initialValues.warehouseId,
        inventoryItemId: initialValues.inventoryItemId,
        qtyBase: initialValues.qtyBase,
        reasonText: initialValues.reasonText,
        notes: initialValues.notes ?? null,
      });
    } else {
      form.resetFields();
    }
  }, [open, form, initialValues]);

  const itemOptions = useMemo(() => {
    const base = items.map((it) => ({
      value: it.id,
      label: `${it.code ? `${it.code} — ` : ""}${it.name}`,
    }));
    if (
      initialItemOption &&
      !base.some((opt) => opt.value === initialItemOption.id)
    ) {
      base.unshift({
        value: initialItemOption.id,
        label: `${initialItemOption.code ? `${initialItemOption.code} — ` : ""}${initialItemOption.name}`,
      });
    }
    return base;
  }, [items, initialItemOption]);

  return (
    <Modal
      title={initialValues ? "Editar merma" : "Registrar merma"}
      open={open}
      onCancel={onClose}
      okText={initialValues ? "Actualizar" : "Guardar"}
      cancelText="Cancelar"
      confirmLoading={saving}
      onOk={async () => {
        try {
          const values = await form.validateFields();
          setSaving(true);
          if (initialValues?.id) {
            await updateInventoryWaste(restaurantId, initialValues.id, {
              warehouseId: values.warehouseId,
              inventoryItemId: values.inventoryItemId,
              qtyBase: Number(values.qtyBase),
              reasonText: values.reasonText,
              notes: values.notes ?? null,
            });
            message.success("Merma actualizada");
          } else {
            await createInventoryWaste(restaurantId, {
              warehouseId: values.warehouseId,
              inventoryItemId: values.inventoryItemId,
              qtyBase: Number(values.qtyBase),
              reasonText: values.reasonText,
              notes: values.notes ?? null,
            });
            message.success("Merma registrada");
          }
          onCreated();
          form.resetFields();
        } catch (err: any) {
          if (err?.errorFields) return;
          message.error(err?.message ?? "Error registrando merma");
        } finally {
          setSaving(false);
        }
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="warehouseId"
          label="Almacén"
          rules={[{ required: true, message: "Selecciona un almacén" }]}
        >
          <Select
            placeholder="Selecciona un almacén"
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          />
        </Form.Item>

        <Form.Item
          name="inventoryItemId"
          label="Insumo"
          rules={[{ required: true, message: "Selecciona un insumo" }]}
        >
          <Select
            showSearch
            placeholder="Busca un insumo"
            filterOption={false}
            onSearch={(q) => onSearchItems(q)}
            loading={itemsLoading}
            options={itemOptions}
          />
        </Form.Item>

        <Form.Item
          name="qtyBase"
          label="Cantidad"
          extra={
            unitLabel
              ? `Unidad base: ${unitLabel}`
              : "Selecciona un insumo para ver la unidad base."
          }
          rules={[{ required: true, message: "Ingresa la cantidad" }]}
        >
          <InputNumber min={0.0001} step={0.01} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="reasonText"
          label="Motivo"
          rules={[{ required: true, message: "Selecciona un motivo" }]}
        >
          <Select
            placeholder="Selecciona un motivo"
            options={REASONS.map((r) => ({ value: r, label: r }))}
          />
        </Form.Item>

        <Form.Item name="notes" label="Notas">
          <Input.TextArea rows={3} placeholder="Detalles opcionales" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function WastesPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;
  const nav = useNavigate();

  const [rows, setRows] = useState<InventoryWasteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryWasteRow | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  async function loadRows() {
    setLoading(true);
    try {
      const r = await listInventoryWastes(restaurantId);
      setRows(r || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando mermas");
    } finally {
      setLoading(false);
    }
  }

  async function loadWarehouses() {
    try {
      const r = await listWarehouses(restaurantId);
      setWarehouses(r || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando almacenes");
    }
  }

  async function loadItems(q?: string) {
    setItemsLoading(true);
    try {
      const r = await listInventoryItems(restaurantId, q);
      setItems(r || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando insumos");
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
    loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const columns: ColumnsType<InventoryWasteRow> = [
    {
      title: "Fecha",
      dataIndex: "reportedAt",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Insumo",
      dataIndex: "item",
      width: 220,
      render: (_, r) =>
        r.item?.name ?? (r.inventoryItemId ? `#${r.inventoryItemId}` : "—"),
    },
    {
      title: "Almacén",
      dataIndex: "warehouse",
      width: 160,
      render: (_, r) => r.warehouse?.name ?? (r.warehouseId ? `#${r.warehouseId}` : "—"),
    },
    {
      title: "Cantidad",
      dataIndex: "qtyBase",
      width: 130,
      render: (v, r) => {
        const unit = r.item?.unit?.symbol || r.item?.unit?.code || "";
        return `${formatQty(v)}${unit ? ` ${unit}` : ""}`;
      },
    },
    {
      title: "Motivo",
      dataIndex: "reasonText",
      width: 200,
      render: (v) => v || "—",
    },
    {
      title: "Estado",
      dataIndex: "status",
      width: 110,
      render: (v) => <Tag>{statusLabels[String(v)] || v || "—"}</Tag>,
    },
    {
      title: "Notas",
      dataIndex: "notes",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Acciones",
      width: 180,
      render: (_, r) => (
        <Space>
          {String(r.status) === "pending" ? (
            <Popconfirm
              title="¿Aplicar merma?"
              okText="Aplicar"
              cancelText="Cancelar"
              onConfirm={async () => {
                try {
                  setApplyingId(r.id);
                  await applyInventoryWaste(restaurantId, r.id);
                  message.success("Merma aplicada");
                  loadRows();
                } catch (e: any) {
                  message.error(e?.message ?? "Error aplicando merma");
                } finally {
                  setApplyingId(null);
                }
              }}
            >
              <Button size="small" type="primary" loading={applyingId === r.id}>
                Aplicar
              </Button>
            </Popconfirm>
          ) : null}
          {String(r.status) === "pending" ? (
            <Button
              size="small"
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
                loadItems();
              }}
            >
              Editar
            </Button>
          ) : null}
          {r.appliedMovementId ? (
            <Button
              size="small"
              onClick={() => nav(`/inventario/movimientos?movementId=${r.appliedMovementId}`)}
            >
              Ver movimiento
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
            loadItems();
          }}
        >
          Registrar merma
        </Button>
        <Button onClick={loadRows}>Refrescar</Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
      />

      <WasteFormModal
        open={formOpen}
        restaurantId={restaurantId}
        warehouses={warehouses}
        items={items}
        itemsLoading={itemsLoading}
        initialValues={editing}
        initialItemOption={editing?.item ?? null}
        onSearchItems={(q) => loadItems(q)}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onCreated={() => {
          setFormOpen(false);
          setEditing(null);
          loadRows();
        }}
      />
    </div>
  );
}
