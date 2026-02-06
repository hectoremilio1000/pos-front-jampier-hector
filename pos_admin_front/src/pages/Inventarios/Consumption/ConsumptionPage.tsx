import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Drawer,
  Modal,
  Radio,
  Alert,
  Space,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import {
  ConsumptionEstimateResponse,
  ConsumptionEstimateRow,
  InventoryItemRow,
  estimateConsumptionBySales,
  listInventoryItems,
} from "@/lib/api_inventory";

const { RangePicker } = DatePicker;

type StepRange = [Dayjs, Dayjs] | null;

type ItemOption = { label: string; value: number };

type ConsumptionHistoryEntry = {
  id: string;
  createdAt: string;
  params: {
    from: string;
    to: string;
    itemIds: number[];
    itemLabels: string[];
    byDay: boolean;
  };
  result: ConsumptionEstimateResponse;
};

export default function ConsumptionPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [range, setRange] = useState<StepRange>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);
  const [byDay, setByDay] = useState(true);
  const [itemSelectionMode, setItemSelectionMode] = useState<
    "all" | "single" | "multiple"
  >("all");

  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsQuery, setItemsQuery] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedItemLabels, setSelectedItemLabels] = useState<string[]>([]);

  const [result, setResult] = useState<ConsumptionEstimateResponse | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const [history, setHistory] = useState<ConsumptionHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const itemOptions: ItemOption[] = useMemo(
    () =>
      items.map((item) => ({
        label: `${item.code} - ${item.name}`,
        value: item.id,
      })),
    [items]
  );

  const itemLabelMap = useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.id,
          `${item.code || "sin codigo"} - ${item.name || "sin nombre"}`,
        ])
      ),
    [items]
  );

  async function loadItems(nextQuery?: string) {
    const q = typeof nextQuery === "string" ? nextQuery : itemsQuery;
    setItemsLoading(true);
    try {
      const rows = await listInventoryItems(restaurantId, q || "");
      setItems(rows);
      setItemsQuery(q || "");
    } catch (err: any) {
      message.error(err?.message ?? "Error cargando insumos");
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    loadItems("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    const storageKey = `inventory.consumption.history.${restaurantId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setHistory([]);
        setSelectedHistoryId(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setHistory(parsed);
        setSelectedHistoryId(parsed[0]?.id ?? null);
      } else {
        setHistory([]);
        setSelectedHistoryId(null);
      }
    } catch {
      setHistory([]);
      setSelectedHistoryId(null);
    }
  }, [restaurantId]);

  const canContinue = !!range?.[0] && !!range?.[1];

  function appendHistory(entry: ConsumptionHistoryEntry) {
    const storageKey = `inventory.consumption.history.${restaurantId}`;
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 30);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // si falla storage, mantenemos estado en memoria
      }
      return next;
    });
    setSelectedHistoryId(entry.id);
  }

  async function handleCalculate() {
    if (!range?.[0] || !range?.[1]) {
      message.warning("Selecciona un rango de fechas");
      return;
    }
    const from = range[0].format("YYYY-MM-DD");
    const to = range[1].format("YYYY-MM-DD");

    setCalcLoading(true);
    try {
      const data = await estimateConsumptionBySales(restaurantId, {
        from,
        to,
        itemIds: selectedItemIds.length ? selectedItemIds : undefined,
        byDay,
      });
      const fallbackLabels = selectedItemIds.map(
        (id) => itemLabelMap.get(id) || `#${id}`
      );
      const entry: ConsumptionHistoryEntry = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        params: {
          from,
          to,
          itemIds: selectedItemIds,
          itemLabels: selectedItemLabels.length
            ? selectedItemLabels
            : fallbackLabels,
          byDay,
        },
        result: data,
      };
      setResult(data);
      appendHistory(entry);
      setStep(2);
    } catch (err: any) {
      message.error(err?.message ?? "Error calculando consumo");
    } finally {
      setCalcLoading(false);
    }
  }

  const buildColumns = (withByDay: boolean): ColumnsType<ConsumptionEstimateRow> => [
    {
      title: "Insumo",
      render: (_, row) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <span>{row.name || "-"}</span>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.code || "sin codigo"}
            </Typography.Text>
          </div>
        ),
      },
      {
        title: "Unidad base",
        render: (_, row) => row.unitCode || row.unitName || "-",
        width: 140,
      },
      {
        title: "Cantidad total",
        dataIndex: "totalQtyBase",
        width: 160,
        render: (v) =>
          Number(v || 0).toLocaleString("es-MX", {
            maximumFractionDigits: 4,
          }),
      },
      ...(withByDay
        ? [
            {
              title: "Desglose diario",
              render: (_: unknown, row: ConsumptionEstimateRow) => {
                if (!row.byDay?.length) return "-";
                return (
                  <Space wrap>
                    {row.byDay.map((d) => (
                      <Tag key={`${row.inventoryItemId}-${d.date}`}>
                        {d.date}:{" "}
                        {Number(d.qtyBase).toLocaleString("es-MX", {
                          maximumFractionDigits: 4,
                        })}
                      </Tag>
                    ))}
                  </Space>
                );
              },
            },
          ]
        : []),
    ];

  const selectedEntry = useMemo(
    () => history.find((entry) => entry.id === selectedHistoryId) || null,
    [history, selectedHistoryId]
  );

  const resultDetail = selectedEntry?.result ?? null;
  const resultByDay = selectedEntry?.params.byDay ?? false;
  const resultHasItemFilter = (selectedEntry?.params.itemIds?.length ?? 0) > 0;

  function getEmptyResultInfo(params: {
    result: ConsumptionEstimateResponse;
    hasItemFilter: boolean;
  }) {
    const { result, hasItemFilter } = params;
    const noRecipe = Number(result.skipped?.noRecipe || 0);
    const noRecipeLines = Number(result.skipped?.noRecipeLines || 0);

    if (result.lines === 0) {
      return {
        title: "Sin ventas en el periodo",
        description:
          "No se encontraron órdenes cerradas en las fechas seleccionadas.",
        hint: "Prueba ampliar el rango o revisar el horario de ventas.",
      };
    }

    if (result.items.length === 0) {
      if (noRecipe > 0) {
        return {
          title: "Sin recetas vinculadas",
          description:
            "Los productos vendidos no tienen receta activa o no están ligados al inventario.",
          hint: "Vincula recetas en Inventario → Recetas y vuelve a calcular.",
        };
      }

      if (noRecipeLines > 0) {
        return {
          title: "Recetas sin componentes",
          description:
            "Se encontraron recetas activas, pero no tienen líneas de insumos.",
          hint: "Agrega insumos a las recetas y vuelve a calcular.",
        };
      }

      if (hasItemFilter) {
        return {
          title: "Sin consumo para esos insumos",
          description:
            "En este periodo no hubo consumo para los insumos seleccionados.",
          hint: "Quita filtros o prueba con otros insumos.",
        };
      }
    }

    return null;
  }

  function renderResultContent(params: {
    result: ConsumptionEstimateResponse;
    withByDay: boolean;
    hasItemFilter: boolean;
  }) {
    const emptyInfo = getEmptyResultInfo({
      result: params.result,
      hasItemFilter: params.hasItemFilter,
    });

    return (
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Lineas procesadas: {params.result.lines} - Componentes aplicados:{" "}
          {params.result.appliedComponents}
        </Typography.Text>
        {params.result.skipped?.noRecipe ? (
          <Typography.Text type="warning">
            Sin receta: {params.result.skipped.noRecipe}
          </Typography.Text>
        ) : null}
        {params.result.skipped?.noRecipeLines ? (
          <Typography.Text type="warning">
            Recetas sin lineas: {params.result.skipped.noRecipeLines}
          </Typography.Text>
        ) : null}

        {emptyInfo ? (
          <Alert
            type="info"
            showIcon
            message={emptyInfo.title}
            description={
              <div>
                <div>{emptyInfo.description}</div>
                {emptyInfo.hint ? (
                  <div style={{ marginTop: 6 }}>{emptyInfo.hint}</div>
                ) : null}
              </div>
            }
          />
        ) : null}

        <Table
          rowKey="inventoryItemId"
          columns={buildColumns(params.withByDay)}
          dataSource={params.result.items}
          pagination={{ pageSize: 20 }}
          locale={{
            emptyText: emptyInfo ? "Sin datos" : "Sin resultados.",
          }}
        />
      </Space>
    );
  }

  const historyColumns: ColumnsType<ConsumptionHistoryEntry> = useMemo(
    () => [
      {
        title: "Fecha",
        dataIndex: "createdAt",
        width: 180,
        render: (value: string) =>
          dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-",
      },
      {
        title: "Periodo",
        render: (_, row) => `${row.params.from} → ${row.params.to}`,
        width: 220,
      },
      {
        title: "Insumos",
        ellipsis: true,
        width: 260,
        render: (_, row) => {
          if (!row.params.itemIds.length) return "Todos";
          if (row.params.itemLabels.length) return row.params.itemLabels.join(", ");
          return row.params.itemIds.join(", ");
        },
      },
      {
        title: "Desglose diario",
        dataIndex: ["params", "byDay"],
        width: 140,
        render: (value: boolean) => (
          <Tag color={value ? "blue" : "default"}>{value ? "Sí" : "No"}</Tag>
        ),
      },
      {
        title: "Líneas",
        dataIndex: ["result", "lines"],
        width: 110,
      },
      {
        title: "Componentes",
        dataIndex: ["result", "appliedComponents"],
        width: 140,
      },
      {
        title: "Acciones",
        width: 140,
        render: (_, row) => (
          <Button
            size="small"
            onClick={() => {
              setSelectedHistoryId(row.id);
              setDetailOpen(true);
            }}
          >
            Ver resultado
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Space align="center" style={{ justifyContent: "space-between" }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Consultas de consumo
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setWizardOpen(true);
            setStep(0);
          }}
        >
          Calcular consumo sobre ventas
        </Button>
      </Space>

      <Card>
        <Table
          rowKey="id"
          columns={historyColumns}
          dataSource={history}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Sin consultas registradas." }}
        />
      </Card>

      <Modal
        open={wizardOpen}
        onCancel={() => setWizardOpen(false)}
        footer={null}
        width={900}
        destroyOnClose={false}
        title="Calcular consumo sobre ventas"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space>
            <Tag color={step === 0 ? "blue" : "default"}>1. Insumos</Tag>
            <Tag color={step === 1 ? "blue" : "default"}>2. Periodo</Tag>
            <Tag color={step === 2 ? "blue" : "default"}>3. Resultado</Tag>
          </Space>

          {step === 0 ? (
            <Card>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Typography.Text>
                  Selecciona insumos. Si no eliges ninguno, se consideran todos.
                </Typography.Text>
                <Radio.Group
                  value={itemSelectionMode}
                  onChange={(e) => {
                    const next = e.target.value as
                      | "all"
                      | "single"
                      | "multiple";
                    setItemSelectionMode(next);
                    if (next === "all") {
                      setSelectedItemIds([]);
                      setSelectedItemLabels([]);
                    } else if (next === "single" && selectedItemIds.length > 1) {
                      const first = selectedItemIds[0];
                      setSelectedItemIds(first ? [first] : []);
                      setSelectedItemLabels(
                        first ? [itemLabelMap.get(first) || `#${first}`] : []
                      );
                    }
                  }}
                >
                  <Radio.Button value="all">Todos</Radio.Button>
                  <Radio.Button value="single">Uno</Radio.Button>
                  <Radio.Button value="multiple">Varios</Radio.Button>
                </Radio.Group>

                {itemSelectionMode === "all" ? (
                  <Typography.Text type="secondary">
                    Se considerarán todos los insumos del inventario.
                  </Typography.Text>
                ) : (
                  <Select
                    mode={itemSelectionMode === "multiple" ? "multiple" : undefined}
                    allowClear
                    showSearch
                    filterOption={false}
                    options={itemOptions}
                    placeholder="Busca insumos por codigo o nombre"
                    loading={itemsLoading}
                    value={
                      itemSelectionMode === "multiple"
                        ? selectedItemIds
                        : selectedItemIds[0] ?? undefined
                    }
                    onSearch={(value) => loadItems(value)}
                    onChange={(value, options) => {
                      if (Array.isArray(value)) {
                        const nextIds = value as number[];
                        const nextLabels = Array.isArray(options)
                          ? options.map((opt: any) =>
                              String(opt?.label ?? opt?.value ?? "")
                            )
                          : [];
                        setSelectedItemIds(nextIds);
                        setSelectedItemLabels(nextLabels.filter(Boolean));
                        return;
                      }

                      const nextId =
                        value === null || value === undefined
                          ? null
                          : Number(value);
                      const label =
                        options && !Array.isArray(options)
                          ? String((options as any)?.label ?? "")
                          : "";

                      setSelectedItemIds(nextId ? [nextId] : []);
                      setSelectedItemLabels(
                        label
                          ? [label]
                          : nextId
                          ? [itemLabelMap.get(nextId) || `#${nextId}`]
                          : []
                      );
                    }}
                    style={{ width: "100%" }}
                  />
                )}
                <Space>
                  <Button type="primary" onClick={() => setStep(1)}>
                    Continuar
                  </Button>
                </Space>
              </Space>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Typography.Text>
                  Selecciona el periodo para calcular consumo basado en ordenes
                  cerradas.
                </Typography.Text>
                <RangePicker
                  value={range ?? undefined}
                  onChange={(value) => setRange(value as StepRange)}
                  format="YYYY-MM-DD"
                  style={{ width: 320 }}
                />
                <Checkbox
                  checked={byDay}
                  onChange={(e) => setByDay(e.target.checked)}
                >
                  Mostrar desglose diario
                </Checkbox>
                <Space>
                  <Button onClick={() => setStep(0)}>Atras</Button>
                  <Button
                    type="primary"
                    disabled={!canContinue}
                    loading={calcLoading}
                    onClick={handleCalculate}
                  >
                    Calcular consumo
                  </Button>
                </Space>
              </Space>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Space wrap>
                  <Button onClick={() => setStep(1)}>Atras</Button>
                  <Button onClick={handleCalculate} loading={calcLoading}>
                    Recalcular
                  </Button>
                  <Button type="primary" onClick={() => setWizardOpen(false)}>
                    Cerrar
                  </Button>
                </Space>

                {result ? (
                  renderResultContent({
                    result,
                    withByDay: byDay,
                    hasItemFilter: selectedItemIds.length > 0,
                  })
                ) : (
                  <Typography.Text type="secondary">
                    Sin resultados.
                  </Typography.Text>
                )}
              </Space>
            </Card>
          ) : null}
        </Space>
      </Modal>

      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={980}
        title="Resultado de consumo"
      >
        {selectedEntry && resultDetail ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              Periodo: {selectedEntry.params.from} → {selectedEntry.params.to}
            </Typography.Text>
            {renderResultContent({
              result: resultDetail,
              withByDay: resultByDay,
              hasItemFilter: resultHasItemFilter,
            })}
          </Space>
        ) : (
          <Typography.Text type="secondary">
            Selecciona una consulta para ver el resultado.
          </Typography.Text>
        )}
      </Drawer>
    </div>
  );
}
