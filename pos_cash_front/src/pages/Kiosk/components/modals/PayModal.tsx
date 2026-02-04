import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Divider,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Radio,
} from "antd";
import { CloseOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useCash } from "../../context/CashKioskContext";
import apiCashKiosk from "@/components/apis/apiCashKiosk";

type PaymentLine = {
  key: string;
  methodId: number | null;
  amount: number | null;
  auto?: boolean;
};
type PaymentMethod = { id: number; name: string };

interface Props {
  open: boolean;
  onClose: () => void;
}

// const DEFAULT_METHODS: PaymentMethod[] = [
//   { id: 1, name: "Efectivo" },
//   { id: 2, name: "Tarjeta" },
//   // { id: 3, name: "Transferencia" },
// ];

const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 0.009;
const CURRENCY = (n: number) => `$${money(n).toFixed(2)}`;

export default function PayModal({ open, onClose }: Props) {
  const { selectedOrder, payOrder } = useCash(); // :contentReference[oaicite:3]{index=3}

  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  // Líneas de pago (consumo)
  const [saleLines, setSaleLines] = useState<PaymentLine[]>([]);

  // Propina UI
  const [tipMode, setTipMode] = useState<"none" | "fixed" | "percent">("none");
  const [tipValue, setTipValue] = useState<number>(0); // si percent: 10 = 10%
  // Líneas de pago (propina)
  const [tipLines, setTipLines] = useState<PaymentLine[]>([]);

  useEffect(() => {
    (async () => {
      const pm = await apiCashKiosk.get("/payment-methods", {
        validateStatus: () => true,
      });
      setMethods(
        (pm?.data || []).map((m: any) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          isCash: !!m.isCash,
        }))
      );
    })();
  }, []);

  const orderSubtotal = useMemo(() => {
    if (!selectedOrder) return 0;

    let subtotalAfterItems = 0;

    for (const it of selectedOrder.items as any[]) {
      const qty = Number(it.qty ?? 0);
      const unitPrice = Number(it.unitPrice ?? 0);

      // total bruto de la línea (con o sin "total" precalculado)
      const grossLine = Number(
        typeof it.total === "number" ? it.total : qty * unitPrice
      );

      // descuento por ítem (monto total, no %)
      const lineDiscount = Number(it.discountAmount ?? 0) || 0;

      const netLine = Math.max(grossLine - lineDiscount, 0);
      subtotalAfterItems += netLine;
    }

    // descuento general de la orden (monto total)
    const orderDiscountAmount =
      Number((selectedOrder as any).discountAmount ?? 0) || 0;

    const net = subtotalAfterItems - orderDiscountAmount;

    // redondeamos a 2 decimales
    return money(Math.max(net, 0));
  }, [selectedOrder]);

  const tipAmount = useMemo(() => {
    if (tipMode === "none") return 0;
    const base = Math.max(orderSubtotal, 0);
    const t =
      tipMode === "percent"
        ? money((base * (Number(tipValue) || 0)) / 100)
        : money(Number(tipValue) || 0);
    return Math.max(t, 0);
  }, [orderSubtotal, tipMode, tipValue]);

  const saleTarget = useMemo(() => {
    const base = Math.max(orderSubtotal, 0);
    return money(base);
  }, [orderSubtotal]);

  const sumSale = useMemo(
    () => money(saleLines.reduce((a, l) => a + (Number(l.amount) || 0), 0)),
    [saleLines]
  );
  const sumTip = useMemo(
    () => money(tipLines.reduce((a, l) => a + (Number(l.amount) || 0), 0)),
    [tipLines]
  );

  const saleDiff = money(saleTarget - sumSale);
  const tipDiff = money(tipAmount - sumTip);

  const isZeroClose = saleTarget <= 0 && tipAmount <= 0;
  const saleBalanced = isZeroClose
    ? true
    : Math.abs(saleDiff) <= EPS && saleTarget > 0;
  const tipBalanced = Math.abs(tipDiff) <= EPS || tipAmount === 0; // tip puede ser 0
  const totalDue = money(saleTarget + tipAmount);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;

    // Sale line por defecto = todo el consumo
    setSaleLines([
      {
        key: crypto.randomUUID(),
        methodId: methods[0]?.id ?? null,
        amount: saleTarget || null,
      },
    ]);

    // Tip por defecto: sin líneas (hasta que elijan propina)
    setTipLines([]);
    setTipMode("none");
    setTipValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderSubtotal]);

  // Auto-crear/ajustar línea de propina cuando exista monto
  useEffect(() => {
    if (!open) return;
    setTipLines((prev) => {
      if (tipAmount <= 0) return [];
      if (prev.length === 0) {
        return [
          {
            key: crypto.randomUUID(),
            methodId: methods[0]?.id ?? null,
            amount: tipAmount,
            auto: true,
          },
        ];
      }
      if (prev.length === 1 && prev[0].auto) {
        return [
          {
            ...prev[0],
            methodId: prev[0].methodId ?? methods[0]?.id ?? null,
            amount: tipAmount,
            auto: true,
          },
        ];
      }
      return prev;
    });
  }, [open, tipAmount, methods]);

  const addSaleLine = () => {
    const rest = money(Math.max(saleTarget - sumSale, 0));
    setSaleLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        methodId: methods[0]?.id ?? null,
        amount: rest || null,
      },
    ]);
  };
  const addTipLine = () => {
    const rest = money(Math.max(tipAmount - sumTip, 0));
    setTipLines((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        methodId: methods[0]?.id ?? null,
        amount: rest || null,
        auto: false,
      },
    ]);
  };

  const removeLine = (key: string, type: "sale" | "tip") => {
    (type === "sale" ? setSaleLines : setTipLines)((prev) =>
      prev.filter((l) => l.key !== key)
    );
  };
  const setLine = (
    key: string,
    patch: Partial<PaymentLine>,
    type: "sale" | "tip"
  ) => {
    const nextPatch =
      type === "tip" && (patch.amount !== undefined || patch.methodId !== undefined)
        ? { ...patch, auto: false }
        : patch;
    (type === "sale" ? setSaleLines : setTipLines)((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...nextPatch } : l))
    );
  };

  const renderStatusTag = (type: "sale" | "tip") => {
    if (type === "tip" && tipAmount <= 0) return <Tag>Sin propina</Tag>;
    const balanced = type === "sale" ? saleBalanced : tipBalanced;
    const diff = type === "sale" ? saleDiff : tipDiff;
    if (balanced) return <Tag color="green">Cuadrado</Tag>;
    if (diff > EPS) return <Tag color="red">Faltante</Tag>;
    return <Tag color="red">Sobra</Tag>;
  };

  const columns = (type: "sale" | "tip"): ColumnsType<PaymentLine> => [
    {
      title: "Método",
      dataIndex: "methodId",
      key: "methodId",
      width: 160,
      render: (_v, r) => (
        <Select
          size="small"
          style={{ width: "100%" }}
          value={r.methodId ?? undefined}
          onChange={(val) => setLine(r.key, { methodId: val }, type)}
          options={methods.map((m) => ({ value: m.id, label: m.name }))}
          placeholder="Método"
        />
      ),
    },
    {
      title: type === "sale" ? "Importe" : "Propina",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 140,
      render: (_v, r) => (
        <InputNumber
          min={0}
          step={0.1}
          precision={2}
          value={r.amount ?? undefined}
          onChange={(val) => {
            const n = typeof val === "number" ? money(val) : null;
            setLine(r.key, { amount: n }, type);
          }}
          addonBefore="$"
          style={{ width: "100%" }}
          size="small"
        />
      ),
    },
    {
      title: "Estado",
      key: "status",
      align: "center",
      width: 120,
      render: () => renderStatusTag(type),
    },
    {
      title: "",
      key: "actions",
      width: 48,
      align: "center",
      render: (_v, r) => (
        <Button
          type="text"
          danger
          icon={<CloseOutlined />}
          onClick={() => removeLine(r.key, type)}
          title="Quitar"
        />
      ),
    },
  ];

  const tagSale = () => {
    if (saleTarget <= 0) return <Tag color="green">Sin saldo</Tag>;
    if (saleBalanced) return <Tag color="green">Consumo: cuadrado</Tag>;
    if (saleDiff > EPS)
      return <Tag color="red">Consumo: faltan {CURRENCY(saleDiff)}</Tag>;
    return (
      <Tag color="red">Consumo: sobra {CURRENCY(Math.abs(saleDiff))}</Tag>
    );
  };
  const tagTip = () => {
    if (tipAmount <= 0) return <Tag>Propina: $0.00</Tag>;
    if (tipBalanced) return <Tag color="green">Propina: cuadrado</Tag>;
    if (tipDiff > EPS)
      return <Tag color="red">Propina: faltan {CURRENCY(tipDiff)}</Tag>;
    return <Tag color="red">Propina: sobra {CURRENCY(Math.abs(tipDiff))}</Tag>;
  };

  const onConfirm = async () => {
    if (!selectedOrder) return;

    if (isZeroClose) {
      try {
        setLoading(true);
        await payOrder(selectedOrder.id, { payments: [] });
        message.success("Pago registrado y orden cerrada.");
        onClose();
      } catch (e: any) {
        console.error(e);
        const msg = e?.response?.data?.error || "No se pudo registrar el pago";
        message.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validaciones
    if (saleTarget > 0 && saleLines.length === 0) {
      message.warning("Agrega al menos una línea de consumo.");
      return;
    }
    if (
      saleLines.some((l) => !l.methodId || !Number.isFinite(Number(l.methodId)))
    ) {
      message.warning("Selecciona el método en todas las líneas de consumo.");
      return;
    }
    if (
      saleLines.some(
        (l) => !Number.isFinite(Number(l.amount)) || Number(l.amount) <= 0
      )
    ) {
      message.warning("Ingresa montos válidos en consumo.");
      return;
    }
    if (!saleBalanced) {
      message.warning(
        saleDiff > EPS
          ? "Falta consumo por cubrir."
          : "El consumo excede el total."
      );
      return;
    }

    // Propina (si aplica)
    if (tipAmount > 0) {
      if (tipLines.length === 0) {
        message.warning("Agrega al menos una línea para la propina.");
        return;
      }
      if (
        tipLines.some(
          (l) => !l.methodId || !Number.isFinite(Number(l.methodId))
        )
      ) {
        message.warning("Selecciona el método en todas las líneas de propina.");
        return;
      }
      if (
        tipLines.some(
          (l) => !Number.isFinite(Number(l.amount)) || Number(l.amount) <= 0
        )
      ) {
        message.warning("Ingresa montos válidos en propina.");
        return;
      }
      if (!tipBalanced) {
        message.warning(
          tipDiff > EPS
            ? "Falta propina por cubrir."
            : "La propina excede el total."
        );
        return;
      }
    }

    const payments = [
      // consumo como SALE
      ...saleLines.map((l) => ({
        methodId: Number(l.methodId),
        kind: "SALE",
        amount: Number(l.amount),
      })),
      // propina como TIP
      ...(tipAmount > 0
        ? tipLines.map((l) => ({
            methodId: Number(l.methodId),
            kind: "TIP",
            amount: Number(l.amount),
          }))
        : []),
    ];

    try {
      setLoading(true);
      await payOrder(selectedOrder.id, { payments }); // 👈 backend ya acepta kind
      message.success("Pago registrado y orden cerrada.");
      onClose();
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.error || "No se pudo registrar el pago";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={`Cobro — Orden #${selectedOrder?.id ?? ""}`}
      destroyOnClose
      maskClosable={!loading}
      width={"100%"}
      footer={null}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            Consumo: <b>{CURRENCY(saleTarget)}</b> · Propina:{" "}
            <b>{CURRENCY(tipAmount)}</b> · Total: <b>{CURRENCY(totalDue)}</b>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagSale()}
            {tagTip()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {/* Consumo */}
            <Typography.Title
              level={5}
              style={{ marginTop: 0, fontSize: 28, fontWeight: "bold" }}
            >
              Consumo
            </Typography.Title>
            <Space style={{ marginBottom: 8 }}>
              <span>
                Objetivo consumo: <b>{CURRENCY(saleTarget)}</b>
              </span>
            </Space>
            <Table<PaymentLine>
              rowKey={(r) => r.key}
              dataSource={saleLines}
              columns={columns("sale")}
              pagination={false}
              size="small"
            />
            <Space style={{ marginTop: 8, marginBottom: 16 }}>
              <Button onClick={addSaleLine}>Agregar método de pago</Button>
            </Space>
          </div>
          <div>
            {/* Propina */}

            <Typography.Title
              level={5}
              style={{ fontSize: 28, fontWeight: "bold" }}
            >
              Propina
            </Typography.Title>
            <Space style={{ marginBottom: 8 }} align="center">
              <span>Tipo:</span>
              <Radio.Group
                value={tipMode}
                onChange={(e) => setTipMode(e.target.value)}
                options={[
                  { label: "Sin propina", value: "none" },
                  { label: "Propina fija", value: "fixed" },
                  { label: "Propina %", value: "percent" },
                ]}
                optionType="button"
              />
            </Space>
            <Space style={{ marginBottom: 8 }} align="center">
              <span>
                Propina objetivo: <b>{CURRENCY(tipAmount)}</b>
              </span>
              <Tag color="purple">
                Propina calc: <b>{CURRENCY(tipAmount)}</b>
              </Tag>
            </Space>
            {tipMode !== "none" && (
              <Space style={{ marginBottom: 8 }} align="center">
                <span>Monto:</span>
                <InputNumber
                  min={0}
                  step={tipMode === "percent" ? 0.5 : 0.1}
                  precision={2}
                  value={tipValue}
                  onChange={(v) => setTipValue(typeof v === "number" ? v : 0)}
                  addonAfter={tipMode === "percent" ? "%" : "$"}
                  style={{ width: 140 }}
                />
              </Space>
            )}
            {tipAmount > 0 ? (
              <>
                <Table<PaymentLine>
                  rowKey={(r) => r.key}
                  dataSource={tipLines}
                  columns={columns("tip")}
                  pagination={false}
                  size="small"
                />
                <Space style={{ marginTop: 8 }}>
                  <Button onClick={addTipLine} disabled={tipAmount <= 0}>
                    Agregar otro método
                  </Button>
                </Space>
              </>
            ) : (
              <div className="text-sm text-slate-500">Sin propina</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="text" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={onConfirm}
            disabled={loading || (!isZeroClose && (!saleBalanced || !tipBalanced))}
            loading={loading}
          >
            Cobrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
