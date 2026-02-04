import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Modal,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  message,
  Alert,
  Tabs,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import type { InventariosOutletContext } from "../index";
import {
  InventoryCutRequest,
  InventoryCutResponse,
  InventoryCutSummaryRow,
  InventoryCutDetailResponse,
  InventoryItemRow,
  StockCountRow,
  createInventoryCut,
  getInventoryCutDetail,
  listInventoryCuts,
  listInventoryItems,
  listStockCounts,
} from "@/lib/api_inventory";

type CompareMode = "theoretical" | "count";
type WizardError = {
  title: string;
  description: string;
  details?: string;
};

const movementOptions = [
  {
    label: "Compras",
    value: "purchase",
    help: "Entradas por compras recibidas.",
  },
  {
    label: "Ventas",
    value: "sale_consumption",
    help: "Salidas por consumo de recetas.",
  },
  {
    label: "Ajustes",
    value: "manual_adjustment",
    help: "Ajustes manuales de inventario.",
  },
  { label: "Mermas", value: "waste", help: "Salidas por mermas aplicadas." },
];

const movementLabelMap: Record<string, string> = {
  purchase: "Compras",
  sale_consumption: "Ventas",
  manual_adjustment: "Ajustes",
  waste: "Mermas",
};
const recommendedMovementValues = ["purchase", "sale_consumption"];

function formatQty(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, {
    style: "currency",
    currency: "MXN",
  });
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD") : "—";
}

function buildCountLabel(
  id?: number | null,
  name?: string | null,
  finishedAt?: string | null,
) {
  if (!id) return "—";
  const dateText = formatDate(finishedAt);
  const title = name ? `${name} · ${dateText}` : dateText;
  return `#${id} · ${title}`;
}

export default function DiffsWizard() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [counts, setCounts] = useState<StockCountRow[]>([]);
  const [countsLoading, setCountsLoading] = useState(false);

  const [history, setHistory] = useState<InventoryCutSummaryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardError, setWizardError] = useState<WizardError | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const [initialCountId, setInitialCountId] = useState<number | null>(null);
  const [finalCountId, setFinalCountId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("theoretical");
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [movementTypes, setMovementTypes] = useState<string[]>(
    movementOptions.map((o) => o.value),
  );

  const [scope, setScope] = useState<"all" | "selected">("all");
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  const [pendingCut, setPendingCut] = useState<InventoryCutResponse | null>(
    null,
  );
  const [calcLoading, setCalcLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] =
    useState<InventoryCutDetailResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailCut, setDetailCut] = useState<InventoryCutSummaryRow | null>(
    null,
  );

  async function loadCounts() {
    setCountsLoading(true);
    try {
      const r = await listStockCounts(restaurantId);
      const closed = r.filter(
        (c) => String(c.status).toLowerCase() === "closed",
      );
      const sorted = closed.slice().sort((a, b) => {
        const aTime = a.finishedAt
          ? dayjs(a.finishedAt).valueOf()
          : dayjs(a.startedAt).valueOf();
        const bTime = b.finishedAt
          ? dayjs(b.finishedAt).valueOf()
          : dayjs(b.startedAt).valueOf();
        return bTime - aTime;
      });
      setCounts(sorted);
      if (!initialCountId && sorted.length) setInitialCountId(sorted[0].id);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando conteos cerrados");
    } finally {
      setCountsLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const r = await listInventoryCuts(restaurantId);
      setHistory(r || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando historial de cortes");
    } finally {
      setHistoryLoading(false);
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

  function clearWizardError() {
    setWizardError(null);
    setShowErrorDetails(false);
  }

  function buildErrorDetails(err: any) {
    const raw = err?.response?.data
      ? JSON.stringify(err.response.data, null, 2)
      : err?.message
      ? String(err.message)
      : err
      ? String(err)
      : "";
    if (!raw) return undefined;
    return raw.length > 2000 ? `${raw.slice(0, 2000)}…` : raw;
  }

  function setFriendlyError(action: "calcular" | "guardar", err: any) {
    const details = buildErrorDetails(err);
    const lower = String(details || "").toLowerCase();
    let title =
      action === "calcular"
        ? "No se pudo calcular el inventario"
        : "No se pudo guardar el inventario";
    let description = "Revisa los datos y vuelve a intentar.";

    if (lower.includes("missing") || lower.includes("required")) {
      description = "Faltan datos requeridos para continuar.";
    } else if (lower.includes("timeout")) {
      description = "La operación tardó demasiado. Intenta de nuevo.";
    } else if (
      lower.includes("unauthorized") ||
      lower.includes("forbidden") ||
      lower.includes("permission")
    ) {
      description = "Tu sesión no tiene permisos o expiró.";
    } else if (
      lower.includes("syntax") ||
      lower.includes("select") ||
      lower.includes("column") ||
      lower.includes("sql")
    ) {
      description = "Hay un problema interno al consultar la base.";
    }

    setWizardError({ title, description, details });
    setShowErrorDetails(false);
    message.error(title);
  }

  function openWizard() {
    setWizardStep(0);
    setPendingCut(null);
    clearWizardError();
    setWizardOpen(true);
  }

  function closeWizard() {
    setWizardOpen(false);
    setWizardStep(0);
    setPendingCut(null);
    clearWizardError();
  }

  function buildPayload(): InventoryCutRequest {
    return {
      // requerido por el tipo => aquí NO puede ser undefined
      // ya lo validas en validateAllSteps(), entonces es seguro
      initialCountId: initialCountId!,

      // estos 2: ponlos como undefined SOLO si el tipo los permite
      // si InventoryCutRequest los define como opcionales (?:), esto compila.
      finalCountId: compareMode === "count" ? finalCountId! : undefined,
      endDate:
        compareMode === "theoretical"
          ? endDate!.format("YYYY-MM-DD")
          : undefined,

      movementTypes,

      // igual: opcional
      itemIds: scope === "selected" ? selectedItemIds : undefined,
    };
  }

  function validateStep(step: number) {
    if (step === 0) {
      if (scope === "selected" && selectedItemIds.length === 0) {
        return "Selecciona al menos un insumo.";
      }
    }
    if (step === 1) {
      if (!initialCountId) return "Selecciona un conteo inicial.";
    }
    if (step === 2) {
      if (compareMode === "theoretical" && !endDate) {
        return "Selecciona la fecha final.";
      }
      if (compareMode === "count" && !finalCountId) {
        return "Selecciona el conteo final.";
      }
      if (compareMode === "count" && finalCountId === initialCountId) {
        return "El conteo final debe ser distinto al inicial.";
      }
    }
    if (step === 3) {
      if (!movementTypes.length) return "Selecciona al menos un movimiento.";
    }
    return null;
  }

  function validateAllSteps() {
    for (let i = 0; i <= 3; i += 1) {
      const err = validateStep(i);
      if (err) return err;
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(wizardStep);
    if (err) {
      message.error(err);
      return;
    }
    setWizardStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    setWizardStep((s) => Math.max(s - 1, 0));
  }

  async function handleCalcAndSave() {
    const err = validateAllSteps();
    if (err) {
      message.error(err);
      return;
    }

    setCalcLoading(true);
    try {
      const res = await createInventoryCut(restaurantId, buildPayload());
      setPendingCut(res);
      message.success("Corte guardado. No se modificaron existencias.");
      loadHistory();
      clearWizardError();
    } catch (e: any) {
      setFriendlyError("guardar", e);
    } finally {
      setCalcLoading(false);
    }
  }

  useEffect(() => {
    loadCounts();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    setFinalCountId(null);
    setPendingCut(null);
    clearWizardError();
  }, [compareMode, initialCountId]);

  useEffect(() => {
    setPendingCut(null);
    clearWizardError();
  }, [endDate, movementTypes, scope, selectedItemIds, finalCountId]);

  useEffect(() => {
    if (wizardOpen && scope === "selected" && items.length === 0) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardOpen, scope]);

  const openDetail = useCallback(
    async (row: InventoryCutSummaryRow) => {
      setDetailCut(row);
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      try {
        const data = await getInventoryCutDetail(restaurantId, row.id);
        setDetailData(data);
      } catch (e: any) {
        setDetailError(e?.message ?? "No se pudo cargar el desglose.");
        setDetailData(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [restaurantId]
  );

  function closeDetail() {
    setDetailOpen(false);
    setDetailData(null);
    setDetailError(null);
    setDetailCut(null);
  }

  const countOptions = useMemo(
    () =>
      counts.map((c) => {
        const date = c.finishedAt ?? c.startedAt;
        const dateText = date ? dayjs(date).format("YYYY-MM-DD") : "sin fecha";
        const label = `#${c.id} · ${c.name ?? c.notes ?? "Conteo"} · ${dateText}`;
        return { value: c.id, label };
      }),
    [counts],
  );

  const historyColumns = useMemo<ColumnsType<InventoryCutSummaryRow>>(
    () => [
      {
        title: "Fecha inicial",
        width: 140,
        render: (_, r) => formatDate(r.rangeStart || null),
      },
      {
        title: "Fecha final",
        width: 140,
        render: (_, r) =>
          formatDate(r.rangeEnd || r.endAt || r.createdAt || null),
      },
      {
        title: "Inicio (cantidad)",
        width: 140,
        render: (_, r) => formatQty(r.totals.initialQtyBase),
      },
      {
        title: "Movimientos (neto)",
        width: 150,
        render: (_, r) => formatQty(r.totals.movementQtyBase),
      },
      {
        title: "Teórico (esperado)",
        width: 160,
        render: (_, r) => formatQty(r.totals.theoreticalQtyBase),
      },
      {
        title: "Final (físico)",
        width: 140,
        render: (_, r) =>
          String(r.compareMode) === "count"
            ? formatQty(r.totals.finalQtyBase)
            : "—",
      },
      {
        title: "Diferencia vs conteo",
        width: 120,
        render: (_, r) =>
          String(r.compareMode) === "count"
            ? formatQty(r.totals.diffQtyBase)
            : "—",
      },
      {
        title: "Costo diferencia",
        width: 140,
        render: (_, r) =>
          String(r.compareMode) === "count"
            ? formatMoney(r.totals.diffCost)
            : "—",
      },
      {
        title: "Estado",
        width: 120,
        render: (_, r) => (
          <Tag color={String(r.compareMode) === "count" ? "green" : "blue"}>
            {String(r.compareMode) === "count" ? "Fisico" : "Teorico"}
          </Tag>
        ),
      },
      {
        title: "Acciones",
        width: 140,
        render: (_, r) => (
          <Button size="small" onClick={() => openDetail(r)}>
            Ver desglose
          </Button>
        ),
      },
    ],
    [openDetail],
  );

  const renderItemCell = (row: any) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span>{row.itemName || "-"}</span>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {row.itemCode || "sin codigo"}
      </Typography.Text>
    </div>
  );

  const salesColumns: ColumnsType<any> = [
    {
      title: "Fecha",
      width: 120,
      render: (_, row) => formatDate(row.movementAt || null),
    },
    {
      title: "Orden",
      width: 120,
      render: (_, row) =>
        row.orderId ? `#${row.orderId}` : row.orderItemId ? `Item #${row.orderItemId}` : "—",
    },
    {
      title: "Producto vendido",
      render: (_, row) =>
        row.productName ||
        row.productCode ||
        (row.productId ? `#${row.productId}` : "—"),
    },
    {
      title: "Insumo",
      render: (_, row) => renderItemCell(row),
    },
    {
      title: "Cantidad consumida",
      width: 160,
      render: (_, row) => formatQty(row.qtyBase),
    },
    {
      title: "Costo",
      width: 140,
      render: (_, row) => formatMoney(row.costTotal),
    },
  ];

  const purchaseColumns: ColumnsType<any> = [
    {
      title: "Fecha",
      width: 120,
      render: (_, row) => formatDate(row.purchaseReceivedAt || row.movementAt || null),
    },
    {
      title: "Compra",
      width: 140,
      render: (_, row) =>
        row.purchaseOrderNumber
          ? `PO #${row.purchaseOrderNumber}`
          : row.purchaseOrderId
          ? `#${row.purchaseOrderId}`
          : "—",
    },
    {
      title: "Proveedor",
      render: (_, row) => row.supplierName || "—",
    },
    {
      title: "Insumo",
      render: (_, row) => renderItemCell(row),
    },
    {
      title: "Cantidad recibida",
      width: 160,
      render: (_, row) => formatQty(row.qtyBase),
    },
    {
      title: "Costo",
      width: 140,
      render: (_, row) => formatMoney(row.costTotal),
    },
  ];

  const wasteColumns: ColumnsType<any> = [
    {
      title: "Fecha",
      width: 120,
      render: (_, row) => formatDate(row.wasteReportedAt || row.movementAt || null),
    },
    {
      title: "Merma",
      width: 120,
      render: (_, row) => (row.wasteId ? `#${row.wasteId}` : "—"),
    },
    {
      title: "Motivo",
      render: (_, row) => row.wasteReason || row.notes || "—",
    },
    {
      title: "Insumo",
      render: (_, row) => renderItemCell(row),
    },
    {
      title: "Cantidad",
      width: 120,
      render: (_, row) => formatQty(row.qtyBase),
    },
    {
      title: "Costo",
      width: 140,
      render: (_, row) => formatMoney(row.costTotal),
    },
  ];

  const adjustmentColumns: ColumnsType<any> = [
    {
      title: "Fecha",
      width: 120,
      render: (_, row) => formatDate(row.movementAt || null),
    },
    {
      title: "Motivo / Nota",
      render: (_, row) => row.notes || "—",
    },
    {
      title: "Insumo",
      render: (_, row) => renderItemCell(row),
    },
    {
      title: "Cantidad",
      width: 120,
      render: (_, row) => formatQty(row.qtyBase),
    },
    {
      title: "Costo",
      width: 140,
      render: (_, row) => formatMoney(row.costTotal),
    },
  ];

  const detailTabs = useMemo(() => {
    if (!detailData) return [];

    const order = ["sale_consumption", "purchase", "waste", "manual_adjustment"];
    const types = detailData.movementTypes.length
      ? detailData.movementTypes
      : Object.keys(detailData.rowsByType || {});
    const orderedTypes = [
      ...order.filter((t) => types.includes(t)),
      ...types.filter((t) => !order.includes(t)),
    ];

    const emptyTextByType: Record<string, string> = {
      sale_consumption: "No hubo ventas en este periodo.",
      purchase: "No hubo compras recibidas en este periodo.",
      waste: "No hubo mermas aplicadas en este periodo.",
      manual_adjustment: "No hubo ajustes manuales en este periodo.",
    };

    const columnsByType: Record<string, ColumnsType<any>> = {
      sale_consumption: salesColumns,
      purchase: purchaseColumns,
      waste: wasteColumns,
      manual_adjustment: adjustmentColumns,
    };

    return orderedTypes.map((type) => {
      const rows = detailData.rowsByType?.[type] || [];
      const totals = detailData.totalsByType?.[type];
      const title = movementLabelMap[type] || type;
      const totalText = totals
        ? `Totales: ${formatQty(totals.qtyBase)} · ${formatMoney(
            totals.costTotal
          )}`
        : "";
      return {
        key: type,
        label: title,
        children: (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {totalText ? (
              <Typography.Text type="secondary">{totalText}</Typography.Text>
            ) : null}
            {rows.length === 0 ? (
              <Typography.Text type="secondary">
                {emptyTextByType[type] || "No hubo movimientos en este periodo."}
              </Typography.Text>
            ) : (
              <Table
                rowKey={(r) => `${type}-${r.movementId || r.inventoryItemId}`}
                columns={columnsByType[type] || salesColumns}
                dataSource={rows}
                pagination={{ pageSize: 8 }}
              />
            )}
          </Space>
        ),
      };
    });
  }, [detailData, salesColumns, purchaseColumns, wasteColumns, adjustmentColumns]);

  const selectedItemsCount = selectedItemIds.length;
  const movementSummary =
    movementTypes.map((m) => movementLabelMap[m] || m).join(", ") || "—";

  function toggleMovement(value: string) {
    setMovementTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function selectRecommendedMovements() {
    setMovementTypes([...recommendedMovementValues]);
  }

  function selectAllMovements() {
    setMovementTypes(movementOptions.map((o) => o.value));
  }

  function clearMovements() {
    setMovementTypes([]);
  }

  const steps = [
    {
      title: "Insumos",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Define si quieres todos los insumos o solo algunos.
          </Typography.Text>
          <Space wrap>
            <Card
              size="small"
              onClick={() => setScope("all")}
              style={{
                width: 240,
                cursor: "pointer",
                borderColor: scope === "all" ? "#1677ff" : undefined,
                background: scope === "all" ? "#f0f6ff" : undefined,
              }}
            >
              <Space direction="vertical" size={4}>
                <Typography.Text strong>Todos los insumos</Typography.Text>
                <Typography.Text type="secondary">
                  Incluye todo el inventario.
                </Typography.Text>
              </Space>
            </Card>
            <Card
              size="small"
              onClick={() => setScope("selected")}
              style={{
                width: 240,
                cursor: "pointer",
                borderColor: scope === "selected" ? "#1677ff" : undefined,
                background: scope === "selected" ? "#f0f6ff" : undefined,
              }}
            >
              <Space direction="vertical" size={4}>
                <Typography.Text strong>Seleccionados</Typography.Text>
                <Typography.Text type="secondary">
                  Elige uno o varios insumos.
                </Typography.Text>
              </Space>
            </Card>
          </Space>
          {scope === "selected" ? (
            <Select
              mode="multiple"
              showSearch
              placeholder="Buscar insumos"
              style={{ width: "100%" }}
              loading={itemsLoading}
              value={selectedItemIds}
              filterOption={false}
              onSearch={(q) => loadItems(q)}
              onChange={(vals) => setSelectedItemIds(vals as number[])}
              options={items.map((it) => ({
                value: it.id,
                label: `${it.code} — ${it.name}`,
              }))}
            />
          ) : (
            <Typography.Text type="secondary">
              Se incluiran todos los insumos.
            </Typography.Text>
          )}
          {scope === "selected" ? (
            <Typography.Text type="secondary">
              {selectedItemsCount
                ? `${selectedItemsCount} insumo(s) seleccionados.`
                : "Aún no has seleccionado insumos."}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Conteo inicial",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Selecciona el conteo fisico inicial.
          </Typography.Text>
          <Select
            style={{ minWidth: 280 }}
            placeholder="Selecciona conteo inicial"
            options={countOptions}
            value={initialCountId ?? undefined}
            loading={countsLoading}
            onChange={(v) => setInitialCountId(Number(v))}
          />
        </Space>
      ),
    },
    {
      title: "Comparar",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Define contra que quieres comparar el inventario final.
          </Typography.Text>
          <Radio.Group
            value={compareMode}
            onChange={(e) => setCompareMode(e.target.value)}
          >
            <Radio value="theoretical">Solo teorico</Radio>
            <Radio value="count">Conteo fisico</Radio>
          </Radio.Group>
          {compareMode === "theoretical" ? (
            <DatePicker
              value={endDate}
              onChange={(v) => setEndDate(v)}
              format="YYYY-MM-DD"
            />
          ) : (
            <Select
              style={{ minWidth: 280 }}
              placeholder="Selecciona conteo final"
              options={countOptions.filter((c) => c.value !== initialCountId)}
              value={finalCountId ?? undefined}
              loading={countsLoading}
              onChange={(v) => setFinalCountId(Number(v))}
            />
          )}
        </Space>
      ),
    },
    {
      title: "Movimientos",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Elige que movimientos se consideran en el corte.
          </Typography.Text>
          <Space wrap>
            <Button size="small" onClick={selectRecommendedMovements}>
              Recomendado
            </Button>
            <Button size="small" onClick={selectAllMovements}>
              Todos
            </Button>
            <Button
              size="small"
              onClick={clearMovements}
              disabled={!movementTypes.length}
            >
              Ninguno
            </Button>
          </Space>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {movementOptions.map((opt) => {
              const selected = movementTypes.includes(opt.value);
              const recommended = recommendedMovementValues.includes(
                opt.value,
              );
              return (
                <Card
                  key={opt.value}
                  size="small"
                  onClick={() => toggleMovement(opt.value)}
                  style={{
                    cursor: "pointer",
                    borderColor: selected ? "#1677ff" : undefined,
                    background: selected ? "#f0f6ff" : undefined,
                  }}
                >
                  <Space direction="vertical" size={4}>
                    <Space align="center" wrap>
                      <Typography.Text strong>{opt.label}</Typography.Text>
                      {recommended ? (
                        <Tag color="blue">Recomendado</Tag>
                      ) : null}
                      <Tag color={selected ? "blue" : "default"}>
                        {selected ? "Incluido" : "Opcional"}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      {opt.help}
                    </Typography.Text>
                  </Space>
                </Card>
              );
            })}
          </div>
          <Typography.Text type="secondary">
            Incluyendo: <b>{movementSummary}</b>
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Resumen",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>
            Conteo inicial:{" "}
            <b>
              {buildCountLabel(
                initialCountId,
                counts.find((c) => c.id === initialCountId)?.name ?? null,
                counts.find((c) => c.id === initialCountId)?.finishedAt ?? null,
              )}
            </b>
          </Typography.Text>
          <Typography.Text>
            Comparacion:{" "}
            <b>{compareMode === "count" ? "Conteo fisico" : "Solo teorico"}</b>
          </Typography.Text>
          {compareMode === "theoretical" ? (
            <Typography.Text>
              Fecha final: <b>{endDate ? endDate.format("YYYY-MM-DD") : "—"}</b>
            </Typography.Text>
          ) : (
            <Typography.Text>
              Conteo final:{" "}
              <b>
                {buildCountLabel(
                  finalCountId,
                  counts.find((c) => c.id === finalCountId)?.name ?? null,
                  counts.find((c) => c.id === finalCountId)?.finishedAt ?? null,
                )}
              </b>
            </Typography.Text>
          )}
          <Typography.Text>
            Movimientos:{" "}
            <b>{movementSummary}</b>
          </Typography.Text>
          <Typography.Text>
            Alcance:{" "}
            <b>
              {scope === "all"
                ? "Todos los insumos"
                : `${selectedItemsCount} insumo(s) seleccionados`}
            </b>
          </Typography.Text>

          <Space>
            <Button type="primary" onClick={handleCalcAndSave} loading={calcLoading}>
              Calcular y guardar
            </Button>
          </Space>

          {pendingCut ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Typography.Text type="secondary">
                Rango: {formatDate(pendingCut.range.start)} →{" "}
                {formatDate(pendingCut.range.end)}
              </Typography.Text>
              <Space wrap>
                <Typography.Text>
                  Inicial: <b>{formatQty(pendingCut.totals.initialQtyBase)}</b>
                </Typography.Text>
                <Typography.Text>
                  Movimientos:{" "}
                  <b>{formatQty(pendingCut.totals.movementQtyBase)}</b>
                </Typography.Text>
                <Typography.Text>
                  Teorico:{" "}
                  <b>{formatQty(pendingCut.totals.theoreticalQtyBase)}</b>
                </Typography.Text>
                {pendingCut.finalCount ? (
                  <>
                    <Typography.Text>
                      Final fisico:{" "}
                      <b>{formatQty(pendingCut.totals.finalQtyBase)}</b>
                    </Typography.Text>
                    <Typography.Text>
                      Diferencia:{" "}
                      <b>{formatQty(pendingCut.totals.diffQtyBase)}</b>
                    </Typography.Text>
                    <Typography.Text>
                      Costo dif.:{" "}
                      <b>{formatMoney(pendingCut.totals.diffCost)}</b>
                    </Typography.Text>
                  </>
                ) : null}
              </Space>
            </Space>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Space>
        <Button type="primary" onClick={openWizard}>
          Realizar inventario
        </Button>
        <Button onClick={loadHistory} loading={historyLoading}>
          Refrescar
        </Button>
      </Space>

      <Typography.Title level={5} style={{ margin: 0 }}>
        Historial de inventarios
      </Typography.Title>

      <Table
        rowKey="id"
        loading={historyLoading}
        columns={historyColumns}
        dataSource={history}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        open={wizardOpen}
        title="Realizar inventario"
        onCancel={closeWizard}
        footer={null}
        width={760}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {wizardError ? (
            <Alert
              type="error"
              showIcon
              message={wizardError.title}
              description={
                <div>
                  <div>{wizardError.description}</div>
                  {wizardError.details ? (
                    <div style={{ marginTop: 8 }}>
                      <Typography.Link
                        onClick={() => setShowErrorDetails((v) => !v)}
                      >
                        {showErrorDetails
                          ? "Ocultar detalles técnicos"
                          : "Ver detalles técnicos"}
                      </Typography.Link>
                      {showErrorDetails ? (
                        <pre
                          style={{
                            marginTop: 8,
                            padding: 12,
                            background: "#fafafa",
                            border: "1px solid #f0f0f0",
                            borderRadius: 6,
                            maxHeight: 200,
                            overflow: "auto",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {wizardError.details}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              }
            />
          ) : null}
          <Steps
            current={wizardStep}
            items={steps.map((s) => ({ title: s.title }))}
          />
          <div>{steps[wizardStep]?.content}</div>
          <Space>
            <Button onClick={closeWizard}>Cerrar</Button>
            <Button disabled={wizardStep === 0} onClick={prevStep}>
              Atras
            </Button>
            {wizardStep < steps.length - 1 ? (
              <Button type="primary" onClick={nextStep}>
                Siguiente
              </Button>
            ) : null}
          </Space>
        </Space>
      </Modal>

      <Modal
        open={detailOpen}
        title={
          detailCut
            ? `Desglose del corte #${detailCut.id}`
            : "Desglose del corte"
        }
        onCancel={closeDetail}
        footer={null}
        width={860}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {detailCut ? (
            <Typography.Text type="secondary">
              Periodo: {formatDate(detailCut.rangeStart)} →{" "}
              {formatDate(detailCut.rangeEnd || detailCut.endAt || detailCut.createdAt)}
            </Typography.Text>
          ) : null}

          {detailLoading ? (
            <Typography.Text type="secondary">
              Cargando desglose...
            </Typography.Text>
          ) : detailError ? (
            <Alert type="error" showIcon message={detailError} />
          ) : detailData ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Text type="secondary">
                Movimientos:{" "}
                {detailData.movementTypes
                  .map((m) => movementLabelMap[m] || m)
                  .join(", ") || "—"}
              </Typography.Text>
              <Typography.Text type="secondary">
                Alcance:{" "}
                {detailData.itemScope === "selected"
                  ? "Insumos seleccionados"
                  : "Todos los insumos"}
              </Typography.Text>
              <Tabs items={detailTabs} />
            </Space>
          ) : (
            <Typography.Text type="secondary">
              Sin datos para mostrar.
            </Typography.Text>
          )}
        </Space>
      </Modal>
    </div>
  );
}
