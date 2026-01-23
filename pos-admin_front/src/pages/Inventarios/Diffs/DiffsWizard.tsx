import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import type { InventariosOutletContext } from "../index";
import {
  InventoryCutResponse,
  InventoryCutSummaryRow,
  InventoryItemRow,
  StockCountRow,
  calcInventoryCut,
  createInventoryCut,
  listInventoryCuts,
  listInventoryItems,
  listStockCounts,
} from "@/lib/api_inventory";

type CompareMode = "theoretical" | "count";

const movementOptions = [
  { label: "Compras", value: "purchase", help: "Entradas por compras recibidas." },
  { label: "Ventas", value: "sale_consumption", help: "Salidas por consumo de recetas." },
  { label: "Ajustes", value: "stock_count_adjustment", help: "Ajustes por conteo fisico." },
];

const movementLabelMap: Record<string, string> = {
  purchase: "Compras",
  sale_consumption: "Ventas",
  stock_count_adjustment: "Ajustes",
};

function formatQty(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString(undefined, { style: "currency", currency: "MXN" });
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format("YYYY-MM-DD") : "—";
}

function buildCountLabel(
  id?: number | null,
  name?: string | null,
  finishedAt?: string | null
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

  const [initialCountId, setInitialCountId] = useState<number | null>(null);
  const [finalCountId, setFinalCountId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("theoretical");
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [movementTypes, setMovementTypes] = useState<string[]>(
    movementOptions.map((o) => o.value)
  );

  const [scope, setScope] = useState<"all" | "selected">("all");
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  const [pendingCut, setPendingCut] = useState<InventoryCutResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  async function loadCounts() {
    setCountsLoading(true);
    try {
      const r = await listStockCounts(restaurantId);
      const closed = r.filter((c) => String(c.status).toLowerCase() === "closed");
      const sorted = closed.slice().sort((a, b) => {
        const aTime = a.finishedAt ? dayjs(a.finishedAt).valueOf() : dayjs(a.startedAt).valueOf();
        const bTime = b.finishedAt ? dayjs(b.finishedAt).valueOf() : dayjs(b.startedAt).valueOf();
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

  function openWizard() {
    setWizardStep(0);
    setPendingCut(null);
    setWizardOpen(true);
  }

  function closeWizard() {
    setWizardOpen(false);
    setWizardStep(0);
    setPendingCut(null);
  }

  function buildPayload() {
    return {
      initialCountId: initialCountId ?? undefined,
      finalCountId: compareMode === "count" ? finalCountId ?? undefined : undefined,
      endDate: compareMode === "theoretical" ? endDate?.format("YYYY-MM-DD") : undefined,
      movementTypes,
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

  async function handleCalc() {
    const err = validateAllSteps();
    if (err) {
      message.error(err);
      return;
    }

    setCalcLoading(true);
    try {
      const res = await calcInventoryCut(restaurantId, buildPayload());
      setPendingCut(res);
    } catch (e: any) {
      message.error(e?.message ?? "Error calculando el corte");
    } finally {
      setCalcLoading(false);
    }
  }

  async function handleSave() {
    if (!pendingCut) {
      message.error("Calcula el resumen antes de guardar.");
      return;
    }

    setSaveLoading(true);
    try {
      await createInventoryCut(restaurantId, buildPayload());
      message.success("Corte guardado");
      closeWizard();
      loadHistory();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando el corte");
    } finally {
      setSaveLoading(false);
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
  }, [compareMode, initialCountId]);

  useEffect(() => {
    setPendingCut(null);
  }, [endDate, movementTypes, scope, selectedItemIds, finalCountId]);

  useEffect(() => {
    if (wizardOpen && scope === "selected" && items.length === 0) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardOpen, scope]);

  const countOptions = useMemo(
    () =>
      counts.map((c) => {
        const date = c.finishedAt ?? c.startedAt;
        const dateText = date ? dayjs(date).format("YYYY-MM-DD") : "sin fecha";
        const label = `#${c.id} · ${c.name ?? c.notes ?? "Conteo"} · ${dateText}`;
        return { value: c.id, label };
      }),
    [counts]
  );

  const historyColumns = useMemo<ColumnsType<InventoryCutSummaryRow>>(
    () => [
      {
        title: "Fecha",
        width: 140,
        render: (_, r) => formatDate(r.rangeEnd || r.endAt || r.createdAt || null),
      },
      {
        title: "Conteo inicial",
        render: (_, r) =>
          buildCountLabel(r.initialCountId, r.initialCountName, r.initialCountFinishedAt),
      },
      {
        title: "Final",
        render: (_, r) => {
          if (String(r.compareMode) === "count") {
            return buildCountLabel(r.finalCountId ?? null, r.finalCountName, r.finalCountFinishedAt);
          }
          return `Teorico hasta ${formatDate(r.rangeEnd || r.endAt || r.createdAt || null)}`;
        },
      },
      {
        title: "Movimientos",
        width: 170,
        render: (_, r) =>
          (r.movementTypes || [])
            .map((m) => movementLabelMap[m] || m)
            .join(", ") || "—",
      },
      {
        title: "Diferencia",
        width: 120,
        render: (_, r) =>
          String(r.compareMode) === "count" ? formatQty(r.totals.diffQtyBase) : "—",
      },
      {
        title: "Costo dif.",
        width: 140,
        render: (_, r) => (String(r.compareMode) === "count" ? formatMoney(r.totals.diffCost) : "—"),
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
    ],
    []
  );

  const steps = [
    {
      title: "Productos",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>Define si quieres todos los insumos o solo algunos.</Typography.Text>
          <Radio.Group value={scope} onChange={(e) => setScope(e.target.value)}>
            <Radio value="all">Todos los insumos</Radio>
            <Radio value="selected">Seleccionados</Radio>
          </Radio.Group>
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
            <Typography.Text type="secondary">Se incluiran todos los insumos.</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Conteo inicial",
      content: (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Typography.Text>Selecciona el conteo fisico inicial.</Typography.Text>
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
          <Typography.Text>Define contra que quieres comparar el inventario final.</Typography.Text>
          <Radio.Group value={compareMode} onChange={(e) => setCompareMode(e.target.value)}>
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
          <Typography.Text>Elige que movimientos se consideran en el corte.</Typography.Text>
          <Checkbox.Group
            value={movementTypes}
            onChange={(vals) => setMovementTypes(vals as string[])}
            options={movementOptions.map((opt) => ({ label: opt.label, value: opt.value }))}
          />
          <Space direction="vertical" size={4}>
            {movementOptions.map((opt) => (
              <Typography.Text key={opt.value} type="secondary">
                {opt.label}: {opt.help}
              </Typography.Text>
            ))}
          </Space>
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
                counts.find((c) => c.id === initialCountId)?.finishedAt ?? null
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
                  counts.find((c) => c.id === finalCountId)?.finishedAt ?? null
                )}
              </b>
            </Typography.Text>
          )}
          <Typography.Text>
            Movimientos:{" "}
            <b>
              {movementTypes.map((m) => movementLabelMap[m] || m).join(", ") || "—"}
            </b>
          </Typography.Text>
          <Typography.Text>
            Alcance: <b>{scope === "all" ? "Todos los insumos" : "Seleccionados"}</b>
          </Typography.Text>

          <Space>
            <Button onClick={handleCalc} loading={calcLoading}>
              Calcular resumen
            </Button>
            <Button type="primary" onClick={handleSave} loading={saveLoading} disabled={!pendingCut}>
              Guardar corte
            </Button>
          </Space>

          {pendingCut ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Typography.Text type="secondary">
                Rango: {formatDate(pendingCut.range.start)} → {formatDate(pendingCut.range.end)}
              </Typography.Text>
              <Space wrap>
                <Typography.Text>Inicial: <b>{formatQty(pendingCut.totals.initialQtyBase)}</b></Typography.Text>
                <Typography.Text>Movimientos: <b>{formatQty(pendingCut.totals.movementQtyBase)}</b></Typography.Text>
                <Typography.Text>Teorico: <b>{formatQty(pendingCut.totals.theoreticalQtyBase)}</b></Typography.Text>
                {pendingCut.finalCount ? (
                  <>
                    <Typography.Text>Final fisico: <b>{formatQty(pendingCut.totals.finalQtyBase)}</b></Typography.Text>
                    <Typography.Text>Diferencia: <b>{formatQty(pendingCut.totals.diffQtyBase)}</b></Typography.Text>
                    <Typography.Text>Costo dif.: <b>{formatMoney(pendingCut.totals.diffCost)}</b></Typography.Text>
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
          <Steps current={wizardStep} items={steps.map((s) => ({ title: s.title }))} />
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
    </div>
  );
}
