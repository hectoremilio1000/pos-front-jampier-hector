import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Select,
  Segmented,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import apiOrder from "@/components/apis/apiOrder";
import apiCash from "@/components/apis/apiCash";
import { useAuth } from "@/components/Auth/AuthContext";

type Mode = "current" | "closed";
type StatusFilter = "closed" | "void" | "all";

type Station = {
  id: number;
  code?: string | null;
  name?: string | null;
};

type OrderRow = {
  id: number;
  folioSeries?: string | null;
  folioNumber?: number | null;
  tableName?: string | null;
  tableCode?: string | null;
  waiterName?: string | null;
  serviceName?: string | null;
  cashStationId?: number | null;
  status: string;
  total: number;
  openedAt?: string | null;
  closedAt?: string | null;
};

type OrderItem = {
  id: number;
  qty: number;
  unitPrice: number;
  total?: number | null;
  product?: { id: number; name?: string | null } | null;
  modifiers?: { id: number; name?: string | null }[] | null;
};

type OrderDetail = OrderRow & {
  items?: OrderItem[];
  payments?: Array<{ id: number; amount: number; status?: string }>;
};

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

const STATUS_META: Record<string, { label: string; color: string }> = {
  closed: { label: "Cerrada", color: "green" },
  void: { label: "Cancelada", color: "red" },
  open: { label: "Abierta", color: "blue" },
  paid: { label: "Pagada", color: "gold" },
  settled: { label: "Liquidada", color: "geekblue" },
  refunded: { label: "Reembolsada", color: "orange" },
  partial_refund: { label: "Parcial", color: "orange" },
};

export default function AccountsConsultationPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?.id ?? null;
  const [mode, setMode] = useState<Mode>("current");
  const [status, setStatus] = useState<StatusFilter>("closed");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [
    dayjs(),
    dayjs(),
  ]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<Record<number, Station>>({});

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const totals = useMemo(() => {
    let totalCerradas = 0;
    let totalCanceladas = 0;
    let countCerradas = 0;
    let countCanceladas = 0;

    for (const r of rows) {
      if (r.status === "closed") {
        totalCerradas += Number(r.total || 0);
        countCerradas += 1;
      }
      if (r.status === "void") {
        totalCanceladas += Number(r.total || 0);
        countCanceladas += 1;
      }
    }

    return {
      totalCerradas,
      totalCanceladas,
      countCerradas,
      countCanceladas,
    };
  }, [rows]);

  async function loadStations() {
    try {
      const { data } = await apiCash.get<Station[]>("/cash_stations", {
        params: restaurantId ? { restaurantId } : undefined,
      });
      const map: Record<number, Station> = {};
      for (const s of data || []) map[s.id] = s;
      setStations(map);
    } catch {
      // silencioso: seguimos con IDs
    }
  }

  async function fetchRows() {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        mode,
        status,
      };

      if (q.trim()) params.q = q.trim();
      if (mode === "closed") {
        params.dateStart = range?.[0]?.format("YYYY-MM-DD") || "";
        params.dateEnd = range?.[1]?.format("YYYY-MM-DD") || "";
      }

      const { data } = await apiOrder.get<OrderRow[]>(
        "/admin/orders/consult",
        { params }
      );
      setRows(data || []);
    } catch (e: any) {
      message.error(
        e?.response?.data?.error ?? "No se pudieron cargar las cuentas"
      );
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(row: OrderRow) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await apiOrder.get<OrderDetail>(
        `/admin/orders/${row.id}`
      );
      setDetail(data);
    } catch (e: any) {
      message.error(
        e?.response?.data?.error ?? "No se pudo cargar el detalle"
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (mode === "closed" && (!range?.[0] || !range?.[1])) return;
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, range?.[0]?.format("YYYY-MM-DD"), range?.[1]?.format("YYYY-MM-DD")]);

  const columns: ColumnsType<OrderRow> = [
    {
      title: "Folio",
      dataIndex: "folioNumber",
      render: (_, r) =>
        r.folioSeries && r.folioNumber
          ? `${r.folioSeries}-${r.folioNumber}`
          : `#${r.id}`,
    },
    {
      title: "Mesa / Alias",
      render: (_, r) => r.tableName || r.tableCode || "Sin mesa",
    },
    {
      title: "Mesero",
      dataIndex: "waiterName",
      render: (v) => v || "-",
    },
    {
      title: "Total",
      dataIndex: "total",
      align: "right",
      render: (v) => money.format(Number(v || 0)),
    },
    {
      title: "Estatus",
      dataIndex: "status",
      render: (v: string) => {
        const meta = STATUS_META[v] || { label: v, color: "default" };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "Fecha",
      render: (_, r) => {
        const when = r.closedAt || r.openedAt;
        return when ? dayjs(when).format("YYYY-MM-DD HH:mm") : "-";
      },
    },
    {
      title: "Caja",
      render: (_, r) => {
        const station = r.cashStationId ? stations[r.cashStationId] : null;
        if (!r.cashStationId) return "-";
        if (!station) return `Caja #${r.cashStationId}`;
        return station.code ? `${station.code} - ${station.name}` : station.name;
      },
    },
    {
      title: "Servicio",
      dataIndex: "serviceName",
      render: (v) => v || "-",
    },
    {
      title: "Acciones",
      render: (_, r) => (
        <Button size="small" onClick={() => openDetail(r)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Consulta de cuentas
          </Title>
          <Text type="secondary">
            Revisa las cuentas por turno con filtros rapidos tipo SoftRestaurant.
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchRows}>
          Actualizar
        </Button>
      </div>

      <Card>
        <Space wrap size="middle">
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: "current", label: "Turno actual" },
              { value: "closed", label: "Turnos cerrados" },
            ]}
          />

          {mode === "closed" && (
            <RangePicker
              value={range}
              onChange={(v) =>
                setRange((v as [Dayjs, Dayjs]) || [dayjs(), dayjs()])
              }
              format="YYYY-MM-DD"
              allowClear={false}
            />
          )}

          <Select
            value={status}
            onChange={(v) => setStatus(v)}
            style={{ width: 200 }}
            options={[
              { value: "closed", label: "Cerradas" },
              { value: "void", label: "Canceladas" },
              { value: "all", label: "Todas" },
            ]}
          />

          <Input
            placeholder="Folio, mesa o mesero..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPressEnter={fetchRows}
            suffix={<SearchOutlined />}
            style={{ width: 260 }}
          />

          <Button type="primary" onClick={fetchRows}>
            Buscar
          </Button>
        </Space>
      </Card>

      <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <Card>
            <Statistic
              title="Ventas cerradas"
              value={totals.totalCerradas}
              formatter={(v) => money.format(Number(v || 0))}
            />
            <Text type="secondary">
              {totals.countCerradas} cuentas cerradas
            </Text>
          </Card>
          <Card>
            <Statistic
              title="Canceladas"
              value={totals.totalCanceladas}
              formatter={(v) => money.format(Number(v || 0))}
            />
            <Text type="secondary">
              {totals.countCanceladas} cuentas canceladas
            </Text>
          </Card>
          <Card>
            <Statistic title="Total cuentas" value={rows.length} />
            <Text type="secondary">Resultado del filtro actual</Text>
          </Card>
        </div>

        <Card>
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        </Card>
      </div>

      <Drawer
        title="Detalle de cuenta"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={720}
      >
        {detailLoading ? (
          <div style={{ padding: 24 }}>Cargando detalle...</div>
        ) : detail ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Folio">
                {detail.folioSeries && detail.folioNumber
                  ? `${detail.folioSeries}-${detail.folioNumber}`
                  : `#${detail.id}`}
              </Descriptions.Item>
              <Descriptions.Item label="Mesa / Alias">
                {detail.tableName || detail.tableCode || "Sin mesa"}
              </Descriptions.Item>
              <Descriptions.Item label="Mesero">
                {detail.waiterName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Caja">
                {detail.cashStationId
                  ? stations[detail.cashStationId]?.name ||
                    `Caja #${detail.cashStationId}`
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Servicio">
                {detail.serviceName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Estatus">
                {STATUS_META[detail.status]?.label || detail.status}
              </Descriptions.Item>
              <Descriptions.Item label="Abierta">
                {detail.openedAt
                  ? dayjs(detail.openedAt).format("YYYY-MM-DD HH:mm")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Cerrada">
                {detail.closedAt
                  ? dayjs(detail.closedAt).format("YYYY-MM-DD HH:mm")
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                {money.format(Number(detail.total || 0))}
              </Descriptions.Item>
            </Descriptions>

            <Card title="Items" size="small">
              <Table
                rowKey="id"
                dataSource={detail.items || []}
                pagination={false}
                columns={[
                  { title: "Cant.", dataIndex: "qty", width: 80 },
                  {
                    title: "Producto",
                    render: (_, it: OrderItem) =>
                      it.product?.name || `Item #${it.id}`,
                  },
                  {
                    title: "Modificadores",
                    render: (_, it: OrderItem) =>
                      (it.modifiers || [])
                        .map((m) => m.name)
                        .filter(Boolean)
                        .join(", ") || "-",
                  },
                  {
                    title: "Precio",
                    dataIndex: "unitPrice",
                    align: "right",
                    render: (v) => money.format(Number(v || 0)),
                  },
                  {
                    title: "Total",
                    dataIndex: "total",
                    align: "right",
                    render: (v) => money.format(Number(v || 0)),
                  },
                ]}
              />
            </Card>
          </div>
        ) : (
          <div style={{ padding: 24 }}>Sin detalle.</div>
        )}
      </Drawer>
    </div>
  );
}
