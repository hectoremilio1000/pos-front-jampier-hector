import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Space,
  Button,
  message,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiCashKiosk from "@/components/apis/apiCashKiosk";
import { useCash } from "../../context/CashKioskContext";

type Row = {
  paymentMethodId: number;
  paymentMethodName: string;
  isCash: boolean;
};

export default function CloseShiftModal({
  open,
  onClose,
  onClosed,
}: {
  open: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  const { shiftId, setShiftId, setSessionId } = useCash();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [rows, setRows] = useState<Row[]>([]);
  const sid = useMemo(
    () => Number(sessionStorage.getItem("cash_shift_id") || shiftId || 0),
    [shiftId]
  );

  // Carga apertura y métodos (sin mostrar “esperado”)
  useEffect(() => {
    if (!open || !sid) return;
    (async () => {
      try {
        setLoading(true);
        // Fondo inicial
        const s = await apiCashKiosk.get(`/shifts/${sid}`, {
          validateStatus: () => true,
        });
        const oc = Number(s?.data?.openingCash ?? s?.data?.opening_cash ?? 0);
        setOpeningCash(oc);

        // Métodos de pago (para declarar por cada uno)
        const pm = await apiCashKiosk.get("/payment-methods", {
          validateStatus: () => true,
        });
        const list: Row[] = (pm?.data || []).map((m: any) => ({
          paymentMethodId: Number(m.id),
          paymentMethodName: String(m.name),
          isCash: !!m.isCash,
        }));
        setRows(list);

        // Inicializa “declarado” en 0 para cada método
        const init: Record<string, number> = {};
        list.forEach((r) => (init[`decl_${r.paymentMethodId}`] = 0));
        form.setFieldsValue(init);
      } catch (e) {
        message.error("No se pudo preparar el cierre");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, sid, form]);

  const columns: ColumnsType<Row> = [
    {
      title: "Método",
      dataIndex: "paymentMethodName",
      key: "pm",
      render: (v, r) => (
        <Space>
          {v} {r.isCash ? <Tag color="gold">EFECTIVO</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Declarado",
      key: "declared",
      align: "right",
      width: 220,
      render: (_, r) => (
        <Form.Item
          name={`decl_${r.paymentMethodId}`}
          noStyle
          rules={[{ required: true, message: "Obligatorio" }]}
        >
          <InputNumber
            min={0}
            step={0.1}
            precision={2}
            style={{ width: 200 }}
          />
        </Form.Item>
      ),
    },
  ];

  const handleClose = async () => {
    if (!sid) return message.error("No hay turno activo");
    try {
      const vals = await form.validateFields();
      const declarations = rows.map((r) => ({
        paymentMethodId: r.paymentMethodId,
        declared: Number(vals[`decl_${r.paymentMethodId}`] || 0),
      }));
      setLoading(true);
      const res = await apiCashKiosk.post(
        `/shifts/${sid}/close`,
        { declarations },
        { validateStatus: () => true }
      );
      const data = res.data;
      console.log(data);
      if (res.status === 500) {
        message.error("Ocurrio un erro en el servidor reintentarlo mas tarde");
      } else {
        if (data.error) {
          message.warning(data.error);
        } else {
          message.success("Turno cerrado");
          try {
            sessionStorage.removeItem("cash_shift_id");
            sessionStorage.removeItem("cash_session_id");
            setShiftId(null);
            setSessionId(null);
          } catch {}
          setShiftId(null);
          onClose();
          onClosed();
        }
      }
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
      title="Cerrar turno — Declaración por método"
      footer={null}
      confirmLoading={loading}
      destroyOnClose
      width={700}
    >
      <Descriptions size="small" column={1} bordered className="mb-2">
        <Descriptions.Item label="Fondo inicial (se declara como efectivo tambien)">
          ${Number(openingCash || 0).toFixed(2)}
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Table<Row>
          rowKey={(r) => r.paymentMethodId}
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          pagination={false}
        />
      </Form>

      <Space className="w-full justify-end mt-3">
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="primary" onClick={handleClose} loading={loading}>
          Cerrar turno
        </Button>
      </Space>
    </Modal>
  );
}
