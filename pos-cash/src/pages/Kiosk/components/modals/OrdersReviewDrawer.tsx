import {
  Drawer,
  List,
  Tag,
  Space,
  Button,
  Table,
  Modal,
  Input,
  message,
} from "antd";
import { useEffect, useState } from "react";
import apiOrderKiosk from "@/components/apis/apiOrderKiosk";
import apiAuth from "@/components/apis/apiAuth";
import type { ColumnsType } from "antd/es/table";

type Props = { open: boolean; onClose: () => void };

type PM = { id: number; name: string };
type Item = {
  id: number;
  qty: number;
  unitPrice: number;
  total?: number;
  product?: { id: number; name: string } | null;
  name?: string | null;
};
type OrderLite = {
  id: number;
  status: string; // 'closed' | 'void'
  tableName?: string | null;
  folioSeries?: string | null;
  folioNumber?: number | null;
  items: Item[];
  subtotal?: number;
  tax?: number;
  total?: number;
};

export default function OrdersReviewDrawer({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [sel, setSel] = useState<OrderLite | null>(null);

  // approval modal (password)
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        // usa X-Shift-Id del interceptor; endpoint nuevo abajo
        const { data } = await apiOrderKiosk.get("/shift/orders/review", {
          validateStatus: () => true,
        });
        if (!Array.isArray(data)) throw new Error("Sin datos");
        setOrders(data);
        setSel(data[0] ?? null);
      } catch (e: any) {
        message.error(
          String(e?.message || "No fue posible cargar cuentas del turno")
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);
  const cols: ColumnsType<Item> = [
    {
      title: "Producto",
      dataIndex: "name" as const, // literal
      key: "name",
      render: (_: any, it: Item) => it.name ?? it.product?.name ?? `#${it.id}`,
    },
    {
      title: "Cant.",
      dataIndex: "qty" as const,
      key: "qty",
      align: "right" as const, // ⬅️ literal, no string suelto
      width: 80,
    },
    {
      title: "P. Unit.",
      dataIndex: "unitPrice" as const,
      key: "unitPrice",
      align: "right" as const,
      width: 120,
      render: (v: number) => `$${Number(v ?? 0).toFixed(2)}`,
    },
    {
      title: "Total",
      dataIndex: "total" as const,
      key: "total",
      align: "right" as const,
      width: 120,
      render: (_: any, it: Item) =>
        `$${Number((it.total ?? it.qty * it.unitPrice) || 0).toFixed(2)}`,
    },
  ];

  function statusTag(s: string) {
    const v = s.toLowerCase();
    const color = v === "closed" ? "green" : v === "void" ? "red" : "default";
    return <Tag color={color}>{v}</Tag>;
  }

  async function requestApprovalToken(
    action: string,
    password: string,
    targetId: number
  ) {
    const { data, status } = await apiAuth.post(
      "/approvals/issue-by-password",
      {
        restaurantId: Number(sessionStorage.getItem("restaurantId") || 0),
        stationId:
          Number(sessionStorage.getItem("cash_station_id") || 0) || null,
        password,
        action,
        targetId,
      },
      { validateStatus: () => true }
    );
    if (status < 200 || status >= 300)
      throw new Error(data?.error || "Aprobación rechazada");
    return String(data.approval_token);
  }

  async function cancelFolio() {
    if (!sel) return;
    if (sel.status.toLowerCase() !== "closed") return;
    setPwOpen(true);
  }

  async function onConfirmCancel() {
    try {
      if (!sel) return;
      if (!pw) return message.error("Ingresa la contraseña");
      const approval = await requestApprovalToken("order.cancel", pw, sel.id);
      const { status, data } = await apiOrderKiosk.delete(
        `/orders/${sel.id}/cancel`,
        {
          data: { refunds: [], reason: "cancel_from_review" }, // ajusta si harás reembolso
          headers: { "X-Approval": `Bearer ${approval}` },
          validateStatus: () => true,
        }
      );
      if (status < 200 || status >= 300)
        throw new Error(data?.error || "No fue posible cancelar");
      message.success("Folio cancelado");
      // refresca selección
      setOrders((prev) =>
        prev.map((o) => (o.id === sel.id ? { ...o, status: "void" } : o))
      );
      setSel({ ...sel, status: "void" });
    } catch (e: any) {
      message.error(String(e?.message || "Error al cancelar folio"));
    } finally {
      setPw("");
      setPwOpen(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={980}
      title="Consultar cuentas (turno activo)"
    >
      <Space className="w-full" align="start">
        {/* IZQUIERDA: listado */}
        <div style={{ width: 360 }}>
          <List
            loading={loading}
            dataSource={orders}
            renderItem={(o) => (
              <List.Item
                onClick={() => setSel(o)}
                style={{
                  cursor: "pointer",
                  background: sel?.id === o.id ? "#f5f5f5" : undefined,
                }}
              >
                <Space direction="vertical" size={0}>
                  <Space>
                    <span>Orden #{o.id}</span>
                    {statusTag(o.status)}
                  </Space>
                  <small>
                    {o.folioSeries && o.folioNumber
                      ? `${o.folioSeries}-${o.folioNumber} · `
                      : ""}
                    {o.tableName ?? "-"}
                  </small>
                </Space>
              </List.Item>
            )}
          />
        </div>

        {/* DERECHA: detalle */}
        <div style={{ flex: 1, paddingLeft: 12 }}>
          {sel ? (
            <>
              <Space
                className="w-full"
                align="center"
                style={{ justifyContent: "space-between", marginBottom: 8 }}
              >
                <Space>
                  <strong>Orden #{sel.id}</strong>
                  {statusTag(sel.status)}
                  {sel.folioSeries && sel.folioNumber ? (
                    <span>
                      {sel.folioSeries}-{sel.folioNumber}
                    </span>
                  ) : null}
                </Space>
                <Button
                  danger
                  onClick={cancelFolio}
                  disabled={sel.status.toLowerCase() !== "closed"}
                >
                  Cancelar folio
                </Button>
              </Space>

              <Table
                rowKey={(r) => r.id}
                size="small"
                columns={cols}
                dataSource={sel.items}
                pagination={false}
              />
              <Space
                style={{
                  marginTop: 8,
                  justifyContent: "flex-end",
                  width: "100%",
                }}
              >
                <div>
                  <strong>Subtotal:</strong> $
                  {Number(sel.subtotal || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Impuestos:</strong> ${Number(sel.tax || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Total:</strong> ${Number(sel.total || 0).toFixed(2)}
                </div>
              </Space>

              {/* Marca visual si está cancelada */}
              {sel.status.toLowerCase() === "void" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#d4380d",
                  }}
                >
                  FOLIO CANCELADO
                </div>
              )}

              <Modal
                open={pwOpen}
                onCancel={() => {
                  setPw("");
                  setPwOpen(false);
                }}
                onOk={onConfirmCancel}
                okText="Autorizar y cancelar"
                title="Aprobación — Cancelar folio"
              >
                <p>
                  Ingresa la contraseña de un admin/owner para cancelar el
                  folio.
                </p>
                <Input.Password
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Contraseña"
                />
              </Modal>
            </>
          ) : (
            <div>Selecciona una orden para ver su detalle</div>
          )}
        </div>
      </Space>
    </Drawer>
  );
}
