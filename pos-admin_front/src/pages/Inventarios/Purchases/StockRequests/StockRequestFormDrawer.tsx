import { useEffect, useMemo, useState } from "react";
import { Drawer, Form, Input, DatePicker, Button, message, Select } from "antd";
import dayjs from "dayjs";
import {
  createStockRequest,
  updateStockRequest,
  listWarehouses,
  type StockRequestRow,
  type WarehouseRow,
} from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: number;
  request: StockRequestRow | null;
  purchaseRunId: number | null;
  defaultRequestedAt?: string | null;
  onOpenItems?: (stockRequestId: number) => void;
};

export default function StockRequestFormDrawer({
  open,
  onClose,
  onSaved,
  restaurantId,
  request,
  purchaseRunId,
  defaultRequestedAt,
  onOpenItems,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name ?? `Almacén #${w.id}`, value: w.id })),
    [warehouses]
  );

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoadingCatalogs(true);
      try {
        const w = await listWarehouses(restaurantId);
        setWarehouses(w || []);
        if (!isEdit && w?.length) {
          const current = form.getFieldValue("warehouseId");
          if (current === undefined || current === null) {
            form.setFieldsValue({ warehouseId: w[0].id });
          }
        }
      } catch (e: any) {
        message.error(e?.message ?? "Error cargando almacenes");
      } finally {
        setLoadingCatalogs(false);
      }
    })();

    const isEdit = !!request?.id;
    form.setFieldsValue({
      areaLabel: isEdit ? request?.areaLabel ?? "" : "",
      warehouseId: isEdit ? request?.warehouseId ?? undefined : undefined,
      requestedAt: isEdit
        ? request?.requestedAt
          ? dayjs(request.requestedAt)
          : dayjs()
        : defaultRequestedAt
        ? dayjs(defaultRequestedAt)
        : dayjs(),
      notes: isEdit ? request?.notes ?? "" : "",
    });
  }, [open, request, form, restaurantId, defaultRequestedAt]);

  async function submit({ openItems }: { openItems: boolean }) {
    const v = await form.validateFields();
    setSaving(true);

    const payload = {
      areaLabel: v.areaLabel || null,
      warehouseId: v.warehouseId,
      requestedAt: v.requestedAt ? v.requestedAt.toISOString() : null,
      notes: v.notes || null,
      purchaseRunId: purchaseRunId ?? null,
      status: "draft",
      createdBy: "admin",
    };

    try {
      if (request?.id) {
        await updateStockRequest(restaurantId, request.id, payload);
        message.success("Pedido actualizado");
        onSaved();
        if (openItems && onOpenItems) onOpenItems(request.id);
        return;
      }

      const created = await createStockRequest(restaurantId, payload);
      message.success("Pedido creado");
      onSaved();
      if (openItems && onOpenItems) onOpenItems(created.id);
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando pedido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={request?.id ? `Editar pedido #${request.id}` : "Nuevo pedido al almacén"}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      extra={null}
    >
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Área solicitante"
          name="areaLabel"
          rules={[{ required: true, message: "Indica el área solicitante" }]}
        >
          <Select
            options={[
              { label: "Cocina", value: "Cocina" },
              { label: "Barra", value: "Barra" },
              { label: "Piso", value: "Piso" },
              { label: "Otro", value: "Otro" },
            ]}
          />
        </Form.Item>

        <Form.Item label="Almacén destino" name="warehouseId" rules={[{ required: true }]}>
          <Select
            loading={loadingCatalogs}
            options={warehouseOptions}
            placeholder="Selecciona almacén"
          />
        </Form.Item>

        <Form.Item
          label="Fecha/Hora solicitada"
          name="requestedAt"
          rules={[{ required: true }]}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Notas" name="notes">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>

      <div style={{ opacity: 0.65, marginTop: 12, marginBottom: 12 }}>
        * Siguiente paso: agregar líneas (presentación + cantidad) y luego registrar la salida.
      </div>
      <div className="flex justify-end flex-nowrap items-center">
        <Button onClick={onClose}>Cancelar</Button>

        <Button className="ml-6" loading={saving} onClick={() => submit({ openItems: false })}>
          Guardar
        </Button>

        <Button
          type="primary"
          className="ml-6 whitespace-nowrap"
          loading={saving}
          onClick={() => submit({ openItems: true })}
        >
          Guardar y agregar productos
        </Button>
      </div>
    </Drawer>
  );
}
