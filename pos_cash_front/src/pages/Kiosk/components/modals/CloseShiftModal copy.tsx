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

type PreviewRow = {
  paymentMethodId: number;
  paymentMethodName: string;
  isCash: boolean;
  expected: number;
};

export default function CloseShiftModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { shiftId, setShiftId } = useCash();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState<number>(0);
  const [cashMovNet, setCashMovNet] = useState<number>(0);
  const [expectedCash, setExpectedCash] = useState<number>(0);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const sid = useMemo(
    () => Number(sessionStorage.getItem("cash_shift_id") || shiftId || 0),
    [shiftId]
  );

  // preview
  useEffect(() => {
    if (!open || !sid) return;
    (async () => {
      try {
        setLoading(true);
        const p = await apiCashKiosk.get(`/shifts/${sid}/close/preview`, {
          validateStatus: () => true,
        });
        const data = p?.data || {};
        setOpeningCash(Number(data.openingCash || 0));
        setCashMovNet(Number(data.cashMovNet || 0));
        setExpectedCash(Number(data.expectedCash || 0));
        const arr: PreviewRow[] = (data.methods || []).map((m: any) => ({
          paymentMethodId: Number(m.paymentMethodId),
          paymentMethodName: String(m.paymentMethodName),
          isCash: !!m.isCash,
          expected: Number(m.expected || 0),
        }));
        setRows(arr);

        // initial declared = expected
        const declaredInit: Record<string, number> = {};
        arr.forEach(
          (r) => (declaredInit[`decl_${r.paymentMethodId}`] = r.expected)
        );
        form.setFieldsValue(declaredInit);
      } catch (e) {
        message.error("No se pudo cargar el pre-cierre");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, sid, form]);

  const columns: ColumnsType<PreviewRow> = [
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
      title: "Esperado",
      dataIndex: "expected",
      key: "expected",
      align: "right",
      render: (v) => `$${Number(v || 0).toFixed(2)}`,
      width: 140,
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
    {
      title: "Diferencia",
      key: "diff",
      align: "right",
      width: 160,
      render: (_, r) => {
        const val =
          Number(form.getFieldValue(`decl_${r.paymentMethodId}`) || 0) -
          Number(r.expected || 0);
        const color =
          Math.abs(val) < 0.01 ? "green" : val >= 0 ? "blue" : "red";
        return (
          <Tag color={color}>
            {val >= 0 ? "+" : ""}
            {val.toFixed(2)}
          </Tag>
        );
      },
    },
  ];

  const declaredCash = useMemo(() => {
    return rows
      .filter((r) => r.isCash)
      .reduce(
        (a, r) =>
          a + Number(form.getFieldValue(`decl_${r.paymentMethodId}`) || 0),
        0
      );
  }, [rows, form]);

  const differenceCash = useMemo(
    () => Number(declaredCash || 0) - Number(expectedCash || 0),
    [declaredCash, expectedCash]
  );

  const handleClose = async () => {
    if (!sid) return message.error("No hay turno activo");
    try {
      const vals = await form.validateFields();
      const declarations = rows.map((r) => ({
        paymentMethodId: r.paymentMethodId,
        declared: Number(vals[`decl_${r.paymentMethodId}`] || 0),
      }));
      setLoading(true);
      await apiCashKiosk.post(
        `/shifts/${sid}/close`,
        { declarations },
        { validateStatus: () => true }
      );
      message.success("Turno cerrado");
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
      title="Cerrar turno — Declaración por método"
      footer={null}
      confirmLoading={loading}
      destroyOnClose
      width={800}
    >
      <Descriptions size="small" column={1} bordered className="mb-2">
        <Descriptions.Item label="Fondo inicial">
          ${Number(openingCash || 0).toFixed(2)}
        </Descriptions.Item>
        <Descriptions.Item label="Mov. efectivo (neto)">
          ${Number(cashMovNet || 0).toFixed(2)}
        </Descriptions.Item>
        <Descriptions.Item label="Esperado efectivo">
          <b>${Number(expectedCash || 0).toFixed(2)}</b>
        </Descriptions.Item>
        <Descriptions.Item label="Declarado efectivo">
          <b>${Number(declaredCash || 0).toFixed(2)}</b>
        </Descriptions.Item>
        <Descriptions.Item label="Diferencia efectivo">
          <b
            style={{
              color:
                Math.abs(differenceCash) < 0.01
                  ? "green"
                  : differenceCash >= 0
                    ? "#1677ff"
                    : "red",
            }}
          >
            {differenceCash >= 0 ? "+" : ""}
            {differenceCash.toFixed(2)}
          </b>
        </Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical">
        <Table<PreviewRow>
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
