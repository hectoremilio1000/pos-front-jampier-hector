import { useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
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
import dayjs, { Dayjs } from "dayjs";
import { useOutletContext, useSearchParams } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import {
  InventoryItemRow,
  InventoryMovementRow,
  WarehouseRow,
  createInventoryAdjustment,
  listInventoryItems,
  listInventoryMovements,
  listWarehouses,
} from "@/lib/api_inventory";

const movementTypes = [
  { label: "Compras", value: "purchase" },
  { label: "Ventas", value: "sale_consumption" },
  { label: "Ajuste manual", value: "manual_adjustment" },
  { label: "Mermas", value: "waste" },
];

const movementLabels: Record<string, string> = {
  purchase: "Compras",
  sale_consumption: "Ventas",
  manual_adjustment: "Ajuste manual",
  stock_count_adjustment: "Ajuste por conteo",
  waste: "Mermas",
};

function formatQty(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, { style: "currency", currency: "MXN" });
}

type AdjustmentFormProps = {
  open: boolean;
  restaurantId: number;
  warehouses: WarehouseRow[];
  items: InventoryItemRow[];
  itemsLoading: boolean;
  onSearchItems: (q?: string) => void;
  onClose: () => void;
  onCreated: () => void;
};

function AdjustmentFormModal({
  open,
  restaurantId,
  warehouses,
  items,
  itemsLoading,
  onSearchItems,
  onClose,
  onCreated,
}: AdjustmentFormProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const selectedItemId = Form.useWatch("inventoryItemId", form);
  const selectedItem = items.find((it) => it.id === selectedItemId);
  const unitLabel =
    selectedItem?.unit?.symbol || selectedItem?.unit?.code || selectedItem?.unit?.name || "";

  const itemOptions = useMemo(
    () =>
      items.map((it) => ({
        value: it.id,
        label: `${it.code ? `${it.code} — ` : ""}${it.name}`,
      })),
    [items]
  );

  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, form]);

  return (
    <Modal
      title="Crear ajuste manual"
      open={open}
      onCancel={onClose}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={saving}
      onOk={async () => {
        try {
          const values = await form.validateFields();
          setSaving(true);
          await createInventoryAdjustment(restaurantId, {
            warehouseId: values.warehouseId,
            inventoryItemId: values.inventoryItemId,
            qtyBase: Number(values.qtyBase),
            direction: values.direction,
            reasonText: values.reasonText,
            notes: values.notes ?? null,
          });
          message.success("Ajuste creado");
          onCreated();
          form.resetFields();
        } catch (err: any) {
          if (err?.errorFields) return;
          message.error(err?.message ?? "Error creando ajuste");
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
          name="direction"
          label="Tipo de ajuste"
          rules={[{ required: true, message: "Selecciona entrada o salida" }]}
        >
          <Select
            placeholder="Entrada o salida"
            options={[
              { value: "in", label: "Entrada (+)" },
              { value: "out", label: "Salida (-)" },
            ]}
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
          rules={[{ required: true, message: "Escribe el motivo" }]}
        >
          <Input placeholder="Ej. Ajuste por inventario físico" />
        </Form.Item>

        <Form.Item name="notes" label="Notas">
          <Input.TextArea rows={3} placeholder="Detalles opcionales" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function MovementsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<InventoryMovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [movementId, setMovementId] = useState<string>(searchParams.get("movementId") || "");
  const [movementType, setMovementType] = useState<string | undefined>(
    searchParams.get("movementType") || undefined
  );
  const [warehouseId, setWarehouseId] = useState<number | undefined>(() => {
    const raw = searchParams.get("warehouseId");
    return raw ? Number(raw) : undefined;
  });
  const [inventoryItemId, setInventoryItemId] = useState<number | undefined>(() => {
    const raw = searchParams.get("inventoryItemId");
    return raw ? Number(raw) : undefined;
  });
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const headerTitle = useMemo(() => {
    if (movementId) return `Movimiento #${movementId}`;
    return "Movimientos de inventario";
  }, [movementId]);

  async function loadRows() {
    setLoading(true);
    try {
      const data = await listInventoryMovements(restaurantId, {
        movementId: movementId ? Number(movementId) : undefined,
        movementType,
        warehouseId,
        inventoryItemId,
        startAt: range?.[0] ? range[0].toISOString() : undefined,
        endAt: range?.[1] ? range[1].toISOString() : undefined,
        limit: 200,
      });
      setRows(data || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando movimientos");
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
    loadWarehouses();
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const columns: ColumnsType<InventoryMovementRow> = [
    {
      title: "Fecha",
      dataIndex: "movementAt",
      width: 170,
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: "Tipo",
      dataIndex: "movementType",
      width: 130,
      render: (v) => <Tag>{movementLabels[String(v)] || v || "—"}</Tag>,
    },
    {
      title: "Insumo",
      dataIndex: "item",
      width: 220,
      render: (_, r) => r.item?.name ?? (r.inventoryItemId ? `#${r.inventoryItemId}` : "—"),
    },
    {
      title: "Almacén",
      dataIndex: "warehouse",
      width: 160,
      render: (_, r) => r.warehouse?.name ?? (r.warehouseId ? `#${r.warehouseId}` : "—"),
    },
    {
      title: "Cantidad",
      dataIndex: "quantityBase",
      width: 130,
      render: (v, r) => {
        const unit = r.item?.unit?.symbol || r.item?.unit?.code || "";
        return `${formatQty(v)}${unit ? ` ${unit}` : ""}`;
      },
    },
    {
      title: "Costo",
      dataIndex: "totalCost",
      width: 130,
      render: (v) => formatMoney(v),
    },
    {
      title: "Referencia",
      dataIndex: "referenceType",
      width: 180,
      render: (_, r) =>
        r.referenceType ? `${r.referenceType}${r.referenceId ? ` #${r.referenceId}` : ""}` : "—",
    },
    {
      title: "Notas",
      dataIndex: "notes",
      ellipsis: true,
      render: (v) => v || "—",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Space wrap>
        <Button
          type="primary"
          onClick={() => {
            setAdjustOpen(true);
            loadItems();
          }}
        >
          Crear ajuste
        </Button>
        <Input
          placeholder="Movimiento #"
          style={{ width: 150 }}
          value={movementId}
          onChange={(e) => setMovementId(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Tipo"
          style={{ width: 160 }}
          options={movementTypes}
          value={movementType}
          onChange={(value) => setMovementType(value)}
        />
        <Select
          allowClear
          placeholder="Almacén"
          style={{ width: 180 }}
          options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          value={warehouseId}
          onChange={(value) => setWarehouseId(value)}
        />
        <Select
          showSearch
          allowClear
          placeholder="Insumo"
          style={{ width: 240 }}
          filterOption={false}
          onSearch={(q) => loadItems(q)}
          loading={itemsLoading}
          options={items.map((it) => ({
            value: it.id,
            label: `${it.code ? `${it.code} — ` : ""}${it.name}`,
          }))}
          value={inventoryItemId}
          onChange={(value) => setInventoryItemId(value)}
        />
        <DatePicker.RangePicker
          value={range ?? undefined}
          onChange={(next) => setRange(next)}
        />
        <Button type="primary" onClick={loadRows}>
          Buscar
        </Button>
        <Button
          onClick={() => {
            setMovementId("");
            setMovementType(undefined);
            setWarehouseId(undefined);
            setInventoryItemId(undefined);
            setRange(null);
            loadRows();
          }}
        >
          Limpiar
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
        title={() => headerTitle}
      />

      <AdjustmentFormModal
        open={adjustOpen}
        restaurantId={restaurantId}
        warehouses={warehouses}
        items={items}
        itemsLoading={itemsLoading}
        onSearchItems={(q) => loadItems(q)}
        onClose={() => setAdjustOpen(false)}
        onCreated={() => {
          setAdjustOpen(false);
          loadRows();
        }}
      />
    </div>
  );
}
