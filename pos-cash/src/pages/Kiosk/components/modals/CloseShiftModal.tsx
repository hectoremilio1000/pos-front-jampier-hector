import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Space,
  Button,
  message,
} from "antd";
import apiCashKiosk from "@/components/apis/apiCashKiosk";
import { useCash } from "../../context/CashKioskContext";

type ShiftMetrics = {
  sales?: { cash?: number; card?: number; total?: number };
  movements?: { in?: number; out?: number; net?: number };
};

export default function CloseShiftModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { shiftId, setShiftId } = useCash();
  const [form] = Form.useForm<{ declared?: number }>();
  const [loading, setLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [metrics, setMetrics] = useState<ShiftMetrics>({});
  const sid = useMemo(
    () => Number(sessionStorage.getItem("cash_shift_id") || shiftId || 0),
    [shiftId]
  );

  const expected = useMemo(() => {
    const open = Number(openingCash || 0);
    const salesCash = Number(metrics?.sales?.cash || 0);
    const movNet = Number(metrics?.movements?.net || 0);
    return open + salesCash + movNet;
  }, [openingCash, metrics]);

  const declared = Form.useWatch("declared", form) || 0;
  const difference = useMemo(
    () => Number(declared || 0) - Number(expected || 0),
    [declared, expected]
  );

  useEffect(() => {
    if (!open || !sid) return;
    (async () => {
      try {
        setLoading(true);
        // openingCash
        const s = await apiCashKiosk.get(`/shifts/${sid}`, {
          validateStatus: () => true,
        });
        const oc = Number(s?.data?.openingCash ?? s?.data?.opening_cash ?? 0);
        setOpeningCash(oc);

        // metrics (ventas + movimientos)
        const m = await apiCashKiosk.get(`/metrics/shift/${sid}`, {
          validateStatus: () => true,
        });
        setMetrics(m?.data || {});
      } catch (e) {
        message.error("No se pudo cargar información del turno");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, sid]);

  const handleClose = async () => {
    if (!sid) return message.error("No hay turno activo");
    try {
      const declaredVal = Number(form.getFieldValue("declared") || 0);
      setLoading(true);
      await apiCashKiosk.post(`/shifts/${sid}/close`, {
        closingCash: declaredVal,
        expectedCash: Number(expected.toFixed(2)),
        difference: Number(difference.toFixed(2)),
      });
      message.success("Turno cerrado");
      // limpiar estado de turno
      try {
        sessionStorage.removeItem("cash_shift_id");
      } catch {}
      setShiftId(null);
      onClose();
    } catch (e: any) {
      message.error(
        String(e?.response?.data?.error || "No se pudo cerrar el turno")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Cerrar turno"
      footer={null}
      confirmLoading={loading}
      destroyOnClose
    >
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Fondo inicial">
          ${Number(openingCash || 0).toFixed(2)}
        </Descriptions.Item>
        <Descriptions.Item label="Ventas (efectivo)">
          ${Number(metrics?.sales?.cash || 0).toFixed(2)}
        </Descriptions.Item>
        <Descriptions.Item label="Mov. efectivo (neto)">
          ${Number(metrics?.movements?.net || 0).toFixed(2)}
        </Descriptions.Item>
        <Descriptions.Item label="Esperado en caja">
          <strong>${Number(expected || 0).toFixed(2)}</strong>
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={form}
        layout="vertical"
        className="mt-3"
        initialValues={{ declared: expected }}
      >
        <Form.Item
          name="declared"
          label="Efectivo declarado"
          rules={[{ required: true, message: "Ingresa el efectivo contado" }]}
        >
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
      </Form>

      <Space className="w-full justify-between">
        <div>
          {" "}
          Diferencia: <strong>${difference.toFixed(2)}</strong>
        </div>
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleClose} loading={loading}>
            Cerrar turno
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}
