// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/PurchaseOrderFormDrawer.tsx

import { useEffect, useMemo, useState } from "react";
import { Drawer, Form, Input, DatePicker, Button, message, Select } from "antd";
import dayjs from "dayjs";
import {
  createPurchaseOrder,
  updatePurchaseOrder,
  listSuppliers,
  listWarehouses,
  type PurchaseOrderRow,
  type SupplierRow,
  type WarehouseRow,
} from "@/lib/api_inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: number;
  order: PurchaseOrderRow | null;
  purchaseRunId: number | null;
  defaultApplicationDate?: string | null;
  onOpenItems?: (purchaseOrderId: number) => void; // ✅ abrir capturador de productos
};

export default function PurchaseOrderFormDrawer({
  open,
  onClose,
  onSaved,
  restaurantId,
  order,
  purchaseRunId,
  defaultApplicationDate,
  onOpenItems,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ label: s.name, value: s.id })),
    [suppliers]
  );
  const warehouseOptions = useMemo(
    () => warehouses.map((w) => ({ label: w.name ?? `Almacén #${w.id}`, value: w.id })),
    [warehouses]
  );

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoadingCatalogs(true);
      try {
        const [s, w] = await Promise.all([
          listSuppliers(restaurantId),
          listWarehouses(restaurantId),
        ]);
        setSuppliers(s || []);
        setWarehouses(w || []);
      } catch (e: any) {
        message.error(e?.message ?? "Error cargando catálogos");
      } finally {
        setLoadingCatalogs(false);
      }
    })();

    const isEdit = !!order?.id;

    form.setFieldsValue({
      supplierId: isEdit ? order?.supplierId ?? order?.supplier?.id ?? null : null,
      warehouseId: isEdit ? order?.warehouseId ?? order?.warehouse?.id ?? 1 : 1,
      applicationDate: isEdit
        ? order?.applicationDate
          ? dayjs(order.applicationDate)
          : dayjs()
        : defaultApplicationDate
        ? dayjs(defaultApplicationDate)
        : dayjs(),
      reference: isEdit ? order?.reference ?? "" : "",
    });
  }, [open, order, form, restaurantId, defaultApplicationDate]);

  async function submit({ openItems }: { openItems: boolean }) {
    const v = await form.validateFields();
    setSaving(true);

    const headerPayload = {
      supplierId: v.supplierId,
      warehouseId: v.warehouseId,
      applicationDate: v.applicationDate ? dayjs(v.applicationDate).format("YYYY-MM-DD") : null,
      reference: v.reference || null,
    };

    try {
      if (order?.id) {
        await updatePurchaseOrder(restaurantId, order.id, headerPayload);
        message.success("Compra actualizada");
        onSaved();

        if (openItems && onOpenItems) onOpenItems(order.id);
        return;
      }

      const created = await createPurchaseOrder(restaurantId, {
        ...headerPayload,
        status: "draft",
        createdBy: "admin",
        purchaseRunId: purchaseRunId ?? null,
      });

      message.success("Compra creada");
      onSaved();

      if (openItems && onOpenItems) onOpenItems(created.id);
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando compra");
    } finally {
      setSaving(false);
    }
  }

  const isReceived = order?.status === "received";

  return (
    <Drawer
      title={order?.id ? `Editar compra #${order.id}` : "Nueva compra"}
      open={open}
      onClose={onClose}
      width={520}
      destroyOnClose
      extra={null}
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Proveedor" name="supplierId" rules={[{ required: true }]}>
          <Select
            disabled={isReceived}
            loading={loadingCatalogs}
            options={supplierOptions}
            placeholder="Selecciona proveedor"
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item label="Almacén destino" name="warehouseId" rules={[{ required: true }]}>
          <Select
            disabled={isReceived}
            loading={loadingCatalogs}
            options={warehouseOptions}
            placeholder="Selecciona almacén"
          />
        </Form.Item>

        <Form.Item
          label="Fecha de entrega"
          name="applicationDate"
          rules={[{ required: true }]}
          extra="Cuándo esperas recibir o aplicar la compra en inventario."
        >
          <DatePicker disabled={isReceived} style={{ width: "100%" }} placeholder="Selecciona fecha" />
        </Form.Item>

        <Form.Item
          label="Referencia (opcional)"
          name="reference"
          extra="Llénalo cuando tengas el ticket o la factura."
        >
          <Input disabled={isReceived} placeholder="Ej. A-123 / 9123" />
        </Form.Item>
      </Form>

      <div style={{ opacity: 0.65, marginTop: 12, marginBottom: 12 }}>
        * Siguiente paso: agregar líneas (presentación + cantidad + precio) y luego “Recibir”.
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
