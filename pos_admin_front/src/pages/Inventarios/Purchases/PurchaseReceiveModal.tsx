// /Users/hectorvelasquez/proyectos/vite/impulso_admin_front_page/src/pages/admin/Restaurantes/Inventarios/Purchases/PurchaseReceiveModal.tsx

import { Modal, DatePicker, Form, message, Table, InputNumber } from "antd";
import dayjs from "dayjs";
import type { PurchaseOrderItemRow, PurchaseOrderRow } from "@/lib/api_inventory";
import { getPurchaseOrder, receivePurchaseOrder } from "@/lib/api_inventory";
import { useEffect, useState } from "react";
import { getOrderOrigin } from "./purchaseUi";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: number;
  order: PurchaseOrderRow | null;
};

export default function PurchaseReceiveModal({
  open,
  onClose,
  onSaved,
  restaurantId,
  order,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<PurchaseOrderItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [receivedQty, setReceivedQty] = useState<Record<number, number>>({});
  const [receivedPrice, setReceivedPrice] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ receivedAt: dayjs() });
  }, [open, form]);

  useEffect(() => {
    if (!open || !order?.id) return;
    setItemsLoading(true);
    (async () => {
      try {
        const detail = await getPurchaseOrder(restaurantId, order.id);
        const rows = detail.items ?? [];
        const map: Record<number, number> = {};
        const priceMap: Record<number, number> = {};
        rows.forEach((it) => {
          map[it.id] = Number(it.receivedQty ?? it.quantity ?? 0);
          priceMap[it.id] = Number(it.unitPrice ?? 0);
        });
        setItems(rows);
        setReceivedQty(map);
        setReceivedPrice(priceMap);
      } catch (e: any) {
        message.error(e?.message ?? "Error cargando productos");
      } finally {
        setItemsLoading(false);
      }
    })();
  }, [open, order?.id, restaurantId]);

  async function submit() {
    if (!order?.id) return;
    const v = await form.validateFields();
    setSaving(true);
    const origin = getOrderOrigin(order);
    const isComisariato = origin.key === "comisariato";
    try {
      await receivePurchaseOrder(restaurantId, order.id, {
        receivedAt: v.receivedAt.toISOString(),
        items: items.map((it) => ({
          id: it.id,
          receivedQty: Number(receivedQty[it.id] ?? it.quantity ?? 0),
          unitPrice: isComisariato
            ? undefined
            : Number(receivedPrice[it.id] ?? it.unitPrice ?? 0),
        })),
      });
      message.success(
        origin.key === "comisariato" ? "Salida de comisariato registrada" : "Compra recibida"
      );
      onSaved();
    } catch (e: any) {
      message.error(e?.message ?? "Error recibiendo compra");
    } finally {
      setSaving(false);
    }
  }

  const origin = getOrderOrigin(order);
  const isComisariato = origin.key === "comisariato";

  return (
    <Modal
      title={
        order?.id
          ? isComisariato
            ? `Registrar salida de comisariato #${order.id}`
            : `Recibir compra #${order.id}`
          : isComisariato
          ? "Registrar salida de comisariato"
          : "Recibir compra"
      }
      open={open}
      onOk={submit}
      confirmLoading={saving}
      onCancel={onClose}
      okText={isComisariato ? "Registrar salida" : "Recibir compra"}
    >
      <Form form={form} layout="vertical">
        <Form.Item label="Fecha de recibido" name="receivedAt" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
      </Form>

      <Table
        size="small"
        rowKey="id"
        loading={itemsLoading}
        pagination={false}
        dataSource={items}
        columns={[
          {
            title: "Presentación",
            render: (_, r) => r.presentation?.name ?? `#${r.presentationId}`,
          },
          {
            title: "Solicitado",
            dataIndex: "quantity",
            width: 120,
          },
          {
            title: "Recibido real",
            width: 140,
            render: (_, r) => (
              <InputNumber
                min={0}
                value={receivedQty[r.id]}
                onChange={(v) =>
                  setReceivedQty((prev) => ({ ...prev, [r.id]: Number(v ?? 0) }))
                }
                style={{ width: 120 }}
              />
            ),
          },
          ...(isComisariato
            ? []
            : [
                {
                  title: "Precio real",
                  width: 140,
                  render: (_: unknown, r: PurchaseOrderItemRow) => (
                    <InputNumber
                      min={0}
                      value={receivedPrice[r.id]}
                      onChange={(v) =>
                        setReceivedPrice((prev) => ({ ...prev, [r.id]: Number(v ?? 0) }))
                      }
                      style={{ width: 120 }}
                    />
                  ),
                },
              ]),
        ]}
      />
    </Modal>
  );
}
