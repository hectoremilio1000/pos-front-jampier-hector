import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import {
  InventoryItemRow,
  InventoryPresentationRow,
  InventoryRecipeLineRow,
  InventoryRecipeRow,
  PosProductRow,
  deleteRecipe,
  deleteRecipeLine,
  listInventoryItems,
  listInventoryPresentations,
  listRecipeLines,
  listRecipes,
  searchPosProducts,
  upsertRecipe,
  upsertRecipeLine,
} from "@/lib/api_inventory";

const { Text } = Typography;

export default function RecipesPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  const restaurantId = restaurant.id;

  const [rows, setRows] = useState<InventoryRecipeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [recipeTotals, setRecipeTotals] = useState<Record<number, number>>({});
  const [recipeTotalsLoading, setRecipeTotalsLoading] = useState<Set<number>>(new Set());

  // crear/editar receta
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryRecipeRow | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const formRecipeType = Form.useWatch("recipeType", form) as "pos" | "internal" | undefined;
  const formPosProductId = Form.useWatch("posProductId", form) as number | null | undefined;

  // detalle receta (líneas)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<InventoryRecipeRow | null>(null);
  const [lines, setLines] = useState<InventoryRecipeLineRow[]>([]);
  const [linesLoading, setLinesLoading] = useState(false);

  // agregar línea
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [presentationsByItem, setPresentationsByItem] = useState<
    Record<number, InventoryPresentationRow[]>
  >({});
  const [presentationsLoading, setPresentationsLoading] = useState(false);
  const [lineForm] = Form.useForm();
  const [lineSaving, setLineSaving] = useState(false);
  const lineType = Form.useWatch("lineType", lineForm) as "item" | "sub" | undefined;
  const lineItemId = Form.useWatch("inventoryItemId", lineForm) as number | undefined;
  const linePresentationId = Form.useWatch("presentationId", lineForm) as number | undefined;

  // búsqueda POS
  const [posQuery, setPosQuery] = useState("");
  const [posOptions, setPosOptions] = useState<PosProductRow[]>([]);
  const [posLoading, setPosLoading] = useState(false);

  // crear sub-receta
  const [subRecipeOpen, setSubRecipeOpen] = useState(false);
  const [subRecipeName, setSubRecipeName] = useState("");
  const [subRecipeSaving, setSubRecipeSaving] = useState(false);

  async function load(nextQ?: string) {
    const q = nextQ ?? listQuery;
    setLoading(true);
    try {
      const r = await listRecipes(restaurantId, { q });
      setRows(r);
      setListQuery(q);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando recetas");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(recipe: InventoryRecipeRow) {
    setDeletingId(recipe.id);
    try {
      await deleteRecipe(restaurantId, recipe.id);
      message.success("Receta eliminada");
      load(listQuery);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.startsWith("409")) {
        message.warning("No se puede eliminar: la receta tiene líneas.");
      } else {
        message.error(e?.message ?? "Error eliminando receta");
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function loadLines(recipeId: number) {
    setLinesLoading(true);
    try {
      const r = await listRecipeLines(restaurantId, recipeId);
      setLines(r);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando líneas");
    } finally {
      setLinesLoading(false);
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (!rows.length) {
      setRecipeTotals({});
      setRecipeTotalsLoading(new Set());
      return;
    }

    let alive = true;
    const nextLoading = new Set(rows.map((r) => r.id));
    setRecipeTotalsLoading(nextLoading);

    (async () => {
      const updates: Record<number, number> = {};
      await Promise.all(
        rows.map(async (r) => {
          try {
            const recipeLines = await listRecipeLines(restaurantId, r.id);
            const total = recipeLines.reduce((acc, line) => {
              const { costTotal } = getLineCosts(line);
              return acc + (costTotal ?? 0);
            }, 0);
            updates[r.id] = total;
          } catch {
            updates[r.id] = 0;
          }
        })
      );
      if (!alive) return;
      setRecipeTotals((prev) => ({ ...prev, ...updates }));
      setRecipeTotalsLoading(new Set());
    })();

    return () => {
      alive = false;
    };
  }, [rows, restaurantId]);

  useEffect(() => {
    // cache de items para el selector
    listInventoryItems(restaurantId, "")
      .then((r) => setItems(r))
      .catch(() => setItems([]));
  }, [restaurantId]);

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      form.setFieldsValue({
        recipeType: editing.posProductId ? "pos" : "internal",
        posProductId: editing.posProductId ?? null,
        posProductCode: editing.posProductCode ?? null,
        name: editing.name ?? "",
      });
      if (editing.posProductId) {
        setPosOptions((prev) => {
          if (prev.some((p) => p.id === editing.posProductId)) return prev;
          return [
            {
              id: editing.posProductId,
              name: editing.name ?? `Producto #${editing.posProductId}`,
              code: editing.posProductCode ?? undefined,
            },
            ...prev,
          ];
        });
      }
      return;
    }

    form.setFieldsValue({
      recipeType: "pos",
      posProductId: null,
      posProductCode: null,
      name: "",
    });
  }, [formOpen, editing, form]);

  useEffect(() => {
    if (!detailOpen) return;
    lineForm.setFieldsValue({
      lineType: "item",
      qtyBase: 1,
      wastePercent: null,
      presentationId: null,
    });
  }, [detailOpen, lineForm]);

  useEffect(() => {
    if (!detailOpen) return;
    if (lineType === "sub") {
      lineForm.setFieldsValue({ inventoryItemId: null, presentationId: null });
    } else if (lineType === "item") {
      lineForm.setFieldsValue({ subRecipeId: null });
    }
  }, [detailOpen, lineType, lineForm]);

  useEffect(() => {
    if (!detailOpen || lineType !== "item") return;
    if (!lineItemId) {
      lineForm.setFieldsValue({ presentationId: null });
      return;
    }

    let alive = true;
    setPresentationsLoading(true);

    (async () => {
      try {
        const list = await listInventoryPresentations(restaurantId, {
          inventoryItemId: lineItemId,
        });
        if (!alive) return;
        setPresentationsByItem((prev) => ({ ...prev, [lineItemId]: list }));

        if (linePresentationId && list.some((p) => p.id === linePresentationId)) return;

        const defaultPresentation =
          list.find((p) => p.isDefaultPurchase) ?? list[0] ?? null;
        lineForm.setFieldsValue({ presentationId: defaultPresentation?.id ?? null });
      } catch {
        if (!alive) return;
        setPresentationsByItem((prev) => ({ ...prev, [lineItemId]: [] }));
        lineForm.setFieldsValue({ presentationId: null });
      } finally {
        if (alive) setPresentationsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [detailOpen, lineType, lineItemId, linePresentationId, restaurantId, lineForm]);

  useEffect(() => {
    if (!formOpen || formRecipeType !== "pos") {
      setPosOptions([]);
      return;
    }

    if (!posQuery.trim()) {
      if (formPosProductId) return;
      setPosOptions([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      setPosLoading(true);
      try {
        const results = await searchPosProducts(restaurantId, posQuery.trim());
        setPosOptions(results);
      } catch {
        setPosOptions([]);
      } finally {
        setPosLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [posQuery, restaurantId, formOpen, formRecipeType, formPosProductId]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const itemOptions = useMemo(
    () => items.map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id })),
    [items]
  );

  const subRecipeOptions = useMemo(() => {
    return rows
      .filter((r) => r.id !== detailRecipe?.id)
      .map((r) => ({
        label: `${r.name}${r.posProductId ? "" : " (Interna)"}`,
        value: r.id,
      }));
  }, [rows, detailRecipe]);

  const existingByPosId = useMemo(() => {
    const map = new Map<number, InventoryRecipeRow>();
    rows.forEach((r) => {
      if (r.posProductId) map.set(Number(r.posProductId), r);
    });
    return map;
  }, [rows]);

  const duplicateMatches = useMemo(() => {
    return posOptions
      .filter((p) => existingByPosId.has(p.id))
      .map((p) => ({ product: p, recipe: existingByPosId.get(p.id)! }));
  }, [posOptions, existingByPosId]);

  const posSelectOptions = useMemo(
    () =>
      posOptions.map((p) => {
        const hasRecipe = existingByPosId.has(p.id);
        return {
          label: `${p.name}${p.code ? ` — ${p.code}` : ""}${hasRecipe ? " (ya existe receta)" : ""}`,
          value: p.id,
          disabled: hasRecipe,
        };
      }),
    [posOptions, existingByPosId]
  );

  const presentationOptions = useMemo(() => {
    if (!lineItemId) return [];
    const list = presentationsByItem[lineItemId] ?? [];
    const item = itemById.get(lineItemId);
    const baseUnit = item?.unit?.code ? ` ${item.unit.code}` : "";
    return list.map((p) => ({
      label: `${p.name}${p.presentationLabel ? ` (${p.presentationLabel})` : ""} — ${
        p.contentInBaseUnit ?? ""
      }${baseUnit}${p.isDefaultPurchase ? " (default)" : ""}`,
      value: p.id,
    }));
  }, [lineItemId, presentationsByItem, itemById]);

  const selectedPresentation = useMemo(() => {
    if (!lineItemId || !linePresentationId) return null;
    const list = presentationsByItem[lineItemId] ?? [];
    return list.find((p) => p.id === linePresentationId) ?? null;
  }, [lineItemId, linePresentationId, presentationsByItem]);

  const baseUnitLabel = lineItemId ? itemById.get(lineItemId)?.unit?.code ?? null : null;
  const qtyHelp = baseUnitLabel
    ? selectedPresentation?.contentInBaseUnit
      ? `Cantidad en unidad base (${baseUnitLabel}). Presentación: ${selectedPresentation.name} = ${selectedPresentation.contentInBaseUnit} ${baseUnitLabel} base.`
      : `Cantidad en unidad base (${baseUnitLabel}). La presentación define el costo.`
    : "Cantidad en la unidad base del insumo.";

  const moneyFmt = useMemo(
    () => new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  );
  const qtyFmt = useMemo(
    () => new Intl.NumberFormat("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 4 }),
    []
  );
  const percentFmt = useMemo(
    () =>
      new Intl.NumberFormat("es-MX", {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  function normalizeMerma(value?: number | null) {
    if (value === null || value === undefined) return 0;
    const raw = Number(value);
    if (!Number.isFinite(raw)) return 0;
    if (raw > 1) return raw / 100;
    return raw;
  }

  function getPresentationCost(presentation?: InventoryPresentationRow | null) {
    if (!presentation) return null;
    if (presentation.defaultSupplierLastCost !== null && presentation.defaultSupplierLastCost !== undefined) {
      return Number(presentation.defaultSupplierLastCost);
    }
    if (presentation.detail?.standardCost !== null && presentation.detail?.standardCost !== undefined) {
      return Number(presentation.detail.standardCost);
    }
    if (presentation.detail?.lastCost !== null && presentation.detail?.lastCost !== undefined) {
      return Number(presentation.detail.lastCost);
    }
    return null;
  }

  function getLineCosts(line: InventoryRecipeLineRow) {
    if (!line.inventoryItemId || !line.presentation) {
      return {
        mermaFrac: null,
        rendimientoFrac: null,
        unitCost: null,
        costUtil: null,
        costTotal: null,
      };
    }
    const mermaFrac = normalizeMerma(line.wastePercent ?? line.wastePct);
    const presentationCost = getPresentationCost(line.presentation);
    const content = Number(line.presentation.contentInBaseUnit || 0);
    const unitCost = presentationCost && content > 0 ? presentationCost / content : null;
    const qty = Number(line.qtyBase || 0);
    const costUtil = unitCost !== null ? qty * unitCost : null;
    const costTotal = costUtil !== null ? costUtil * (1 + mermaFrac) : null;
    return {
      mermaFrac,
      rendimientoFrac: 1 - mermaFrac,
      unitCost,
      costUtil,
      costTotal,
    };
  }

  const totalRecipeCost = useMemo(() => {
    return lines.reduce((acc, line) => {
      const { costTotal } = getLineCosts(line);
      return acc + (costTotal ?? 0);
    }, 0);
  }, [lines]);

  const cols: ColumnsType<InventoryRecipeRow> = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: "Tipo",
      width: 120,
      render: (_, r) => (
        <Tag color={r.posProductId ? "blue" : "gold"}>{r.posProductId ? "POS" : "Interna"}</Tag>
      ),
    },
    { title: "POS Product ID", dataIndex: "posProductId", width: 140, render: (v) => v ?? "—" },
    { title: "Nombre", dataIndex: "name" },
    {
      title: "Costo total",
      width: 140,
      render: (_, r) => {
        if (recipeTotalsLoading.has(r.id)) return "…";
        const total = recipeTotals[r.id];
        return total === undefined ? "—" : moneyFmt.format(total);
      },
    },
    { title: "Activo", dataIndex: "isActive", width: 90, render: (v) => (v === false ? "No" : "Sí") },
    {
      title: "Acciones",
      width: 300,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditing(r);
              setFormOpen(true);
            }}
          >
            Editar
          </Button>
          <Button size="small" type="primary" onClick={() => { setDetailRecipe(r); setDetailOpen(true); loadLines(r.id); }}>
            Líneas
          </Button>
          {(() => {
            const hasLines = Number(r.linesCount ?? 0) > 0;
            return (
              <Popconfirm
                title="¿Eliminar receta?"
                description="Solo se puede eliminar si no tiene líneas."
                okText="Eliminar"
                cancelText="Cancelar"
                onConfirm={() => handleDelete(r)}
                disabled={hasLines}
              >
                <Tooltip title={hasLines ? "No se puede eliminar: tiene líneas" : "Eliminar receta"}>
                  <Button
                    size="small"
                    danger
                    loading={deletingId === r.id}
                    disabled={hasLines || deletingId === r.id}
                  >
                    Eliminar
                  </Button>
                </Tooltip>
              </Popconfirm>
            );
          })()}
        </Space>
      ),
    },
  ];

  async function submitRecipe() {
    const v = await form.validateFields();
    if (v.recipeType === "pos" && !v.posProductId) {
      message.error("Selecciona un producto POS");
      return;
    }
    const isPos = v.recipeType === "pos";
    const isNew = !editing?.id;
    setSaving(true);
    try {
      const saved = await upsertRecipe(restaurantId, {
        id: editing?.id,
        posProductId: isPos ? v.posProductId ?? null : null,
        posProductCode: isPos ? v.posProductCode ?? null : null,
        name: v.name,
        isActive: true,
      });
      message.success("Receta guardada");
      setFormOpen(false);
      setEditing(null);
      load();
      if (isNew && saved?.id) {
        setDetailRecipe(saved);
        setDetailOpen(true);
        loadLines(saved.id);
      }
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando receta");
    } finally {
      setSaving(false);
    }
  }

  async function submitLine() {
    if (!detailRecipe) return;
    const v = await lineForm.validateFields();

    const isSub = v.lineType === "sub";
    if (isSub && !v.subRecipeId) return message.error("Selecciona una sub-receta");
    if (!isSub && !v.inventoryItemId) return message.error("Selecciona un insumo");
    if (!isSub && !v.presentationId) return message.error("Selecciona una presentación");

    setLineSaving(true);
    try {
      await upsertRecipeLine(restaurantId, detailRecipe.id, {
        inventoryItemId: isSub ? null : v.inventoryItemId,
        subRecipeId: isSub ? v.subRecipeId : null,
        presentationId: isSub ? null : v.presentationId,
        qtyBase: v.qtyBase,
        wastePercent: v.wastePercent ?? null,
      });
      message.success("Línea guardada");
      lineForm.resetFields();
      lineForm.setFieldsValue({ lineType: "item", presentationId: null });
      loadLines(detailRecipe.id);
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando línea");
    } finally {
      setLineSaving(false);
    }
  }

  async function createInternalFromSearch() {
    const name = posQuery.trim();
    if (!name) return;
    setEditing(null);
    form.setFieldsValue({
      recipeType: "internal",
      posProductId: null,
      posProductCode: null,
      name,
    });
  }

  async function createSubRecipe() {
    if (!detailRecipe) return;
    const name = subRecipeName.trim();
    if (!name) return message.error("Nombre requerido");

    const qtyBase = Number(lineForm.getFieldValue("qtyBase") ?? 1) || 1;
    const wastePercent = lineForm.getFieldValue("wastePercent");

    setSubRecipeSaving(true);
    try {
      const created = await upsertRecipe(restaurantId, {
        name,
        posProductId: null,
        isActive: true,
      });

      await upsertRecipeLine(restaurantId, detailRecipe.id, {
        subRecipeId: created.id,
        qtyBase,
        wastePercent: wastePercent ?? null,
      });

      message.success("Sub-receta agregada");
      setSubRecipeName("");
      setSubRecipeOpen(false);
      await load();
      await loadLines(detailRecipe.id);
    } catch (e: any) {
      message.error(e?.message ?? "Error creando sub-receta");
    } finally {
      setSubRecipeSaving(false);
    }
  }

  function openExistingRecipe(recipe: InventoryRecipeRow) {
    setEditing(recipe);
    setFormOpen(true);
    setPosQuery("");
    setPosOptions([]);
    message.info("Ese producto ya tiene receta. Abriendo para editar.");
  }

  const lineCols: ColumnsType<InventoryRecipeLineRow> = [
    {
      title: "Producto",
      width: 240,
      render: (_, r) => {
        if (r.subRecipe) return `Sub-receta: ${r.subRecipe.name}`;
        if (r.item) return `${r.item.code} — ${r.item.name}`;
        return r.inventoryItemId ? `#${r.inventoryItemId}` : "—";
      },
    },
    {
      title: "Cantidad",
      dataIndex: "qtyBase",
      width: 110,
      render: (v) => qtyFmt.format(Number(v || 0)),
    },
    {
      title: "U.M.",
      width: 80,
      render: (_, r) => r.item?.unit?.code ?? "—",
    },
    {
      title: "Presentación",
      width: 220,
      render: (_, r) => {
        if (!r.presentation) return r.subRecipe ? "Sub-receta" : "—";
        const baseUnit = r.item?.unit?.code ? ` ${r.item.unit.code}` : "";
        const label = `${r.presentation.name}${
          r.presentation.presentationLabel ? ` (${r.presentation.presentationLabel})` : ""
        }`;
        const content = r.presentation.contentInBaseUnit
          ? ` — ${r.presentation.contentInBaseUnit}${baseUnit}`
          : "";
        return `${label}${content}`;
      },
    },
    {
      title: "Rend. %",
      width: 100,
      render: (_, r) => {
        if (r.subRecipe) return "—";
        const { rendimientoFrac } = getLineCosts(r);
        return rendimientoFrac === null ? "—" : percentFmt.format(rendimientoFrac);
      },
    },
    {
      title: "Merma %",
      width: 100,
      render: (_, r) => {
        if (r.subRecipe) return "—";
        const merma = normalizeMerma(r.wastePercent ?? r.wastePct);
        return percentFmt.format(merma);
      },
    },
    {
      title: "Costo unitario",
      width: 120,
      render: (_, r) => {
        const { unitCost } = getLineCosts(r);
        return unitCost === null ? "—" : moneyFmt.format(unitCost);
      },
    },
    {
      title: "Costo útil",
      width: 120,
      render: (_, r) => {
        const { costUtil } = getLineCosts(r);
        return costUtil === null ? "—" : moneyFmt.format(costUtil);
      },
    },
    {
      title: "Costo total",
      width: 120,
      render: (_, r) => {
        const { costTotal } = getLineCosts(r);
        return costTotal === null ? "—" : moneyFmt.format(costTotal);
      },
    },
    {
      title: "Acciones",
      width: 140,
      render: (_, r) => (
        <Button
          danger
          size="small"
          onClick={async () => {
            try {
              if (!detailRecipe) return;
              await deleteRecipeLine(restaurantId, detailRecipe.id, r.id);
              message.success("Eliminado");
              if (detailRecipe) loadLines(detailRecipe.id);
            } catch (e: any) {
              message.error(e?.message ?? "Error eliminando línea");
            }
          }}
        >
          Eliminar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
      <Space wrap>
        <Input.Search
          placeholder="Buscar recetas…"
          allowClear
          style={{ width: 260 }}
          onSearch={(value) => load(value)}
        />
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Nueva receta
        </Button>
        <Button onClick={() => load() } loading={loading}>Refrescar</Button>
      </Space>

      <Table rowKey="id" loading={loading} columns={cols} dataSource={rows} pagination={{ pageSize: 20 }} />

      <Drawer
        title={editing?.id ? `Editar receta #${editing.id}` : "Nueva receta"}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        width={520}
        destroyOnClose
        extra={
          <Button type="primary" loading={saving} onClick={submitRecipe}>
            Guardar
          </Button>
        }
      >
        <Space style={{ marginBottom: 12 }}>
          <Tag color={formRecipeType === "pos" ? "blue" : "gold"}>
            {formRecipeType === "pos" ? "Producto POS" : "Receta interna"}
          </Tag>
        </Space>
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Tipo"
            name="recipeType"
            rules={[{ required: true, message: "Selecciona el tipo de receta" }]}
          >
            <Select
              options={[
                { label: "Producto POS", value: "pos" },
                { label: "Receta interna", value: "internal" },
              ]}
              onChange={(value) => {
                if (value !== "pos") {
                  setPosQuery("");
                  setPosOptions([]);
                  form.setFieldsValue({ posProductId: null, posProductCode: null });
                }
              }}
            />
          </Form.Item>
          {formRecipeType === "pos" ? (
            <Form.Item
              label="Producto POS"
              name="posProductId"
              rules={[{ required: true, message: "Selecciona un producto POS" }]}
            >
              <Select
                showSearch
                allowClear
                filterOption={false}
                onSearch={(v) => setPosQuery(v)}
                onClear={() => setPosQuery("")}
                options={posSelectOptions}
                loading={posLoading}
                placeholder="Buscar producto POS…"
                notFoundContent={
                  posQuery.trim() ? (
                    <Button
                      type="link"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={createInternalFromSearch}
                    >
                      Crear receta interna "{posQuery.trim()}"
                    </Button>
                  ) : null
                }
                onSelect={(value) => {
                  const existing = existingByPosId.get(value);
                  if (existing) {
                    openExistingRecipe(existing);
                    return;
                  }
                  const selected = posOptions.find((p) => p.id === value);
                  if (!selected) return;
                  form.setFieldsValue({
                    posProductId: selected.id,
                    posProductCode: selected.code ?? null,
                    name: selected.name,
                  });
                }}
              />
            </Form.Item>
          ) : null}
          {formRecipeType === "pos" && duplicateMatches.length ? (
            <Space direction="vertical" size={0} style={{ marginTop: -6 }}>
              {duplicateMatches.map((d) => (
                <Button
                  key={d.recipe.id}
                  type="link"
                  size="small"
                  onClick={() => openExistingRecipe(d.recipe)}
                >
                  Ya existe receta para "{d.product.name}" — Abrir
                </Button>
              ))}
            </Space>
          ) : null}
          <Form.Item name="posProductCode" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="Nombre" name="name" rules={[{ required: true }]}
          >
            <Input placeholder="Ej. Salsa base" />
          </Form.Item>
        </Form>
        <div style={{ opacity: 0.65, marginTop: 12 }}>
          * Si tu receta tiene más campos (yield, unidad, etc.), dime el modelo final y lo ampliamos.
        </div>
      </Drawer>

      <Drawer
        title={detailRecipe ? `Líneas – ${detailRecipe.name}` : "Líneas"}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={900}
        destroyOnClose
      >
        {!detailRecipe ? (
          <div style={{ opacity: 0.7 }}>Selecciona una receta.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Table
              rowKey="id"
              loading={linesLoading}
              columns={lineCols}
              dataSource={lines}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 1100 }}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={8}>
                    <strong>Costo total de la receta</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong>{moneyFmt.format(totalRecipeCost)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} />
                </Table.Summary.Row>
              )}
            />

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: 12 }}>
              <Form layout="inline" form={lineForm}>
                <Form.Item label="Tipo" name="lineType" rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      { label: "Insumo", value: "item" },
                      { label: "Sub-receta", value: "sub" },
                    ]}
                    style={{ width: 160 }}
                  />
                </Form.Item>

                {lineType !== "sub" ? (
                  <Form.Item label="Insumo" name="inventoryItemId" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Selecciona insumo"
                      options={itemOptions}
                      onChange={() => lineForm.setFieldsValue({ presentationId: null })}
                      style={{ width: 320 }}
                    />
                  </Form.Item>
                ) : (
                  <Form.Item label="Sub-receta" name="subRecipeId" rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Selecciona sub-receta"
                      options={subRecipeOptions}
                      style={{ width: 320 }}
                    />
                  </Form.Item>
                )}

                {lineType !== "sub" ? (
                <Form.Item
                  label="Presentación"
                  name="presentationId"
                  rules={[{ required: true, message: "Selecciona una presentación" }]}
                >
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="Selecciona presentación"
                      options={presentationOptions}
                      loading={presentationsLoading}
                      notFoundContent="Sin presentaciones"
                      style={{ width: 320 }}
                    />
                  </Form.Item>
                ) : null}

                <Form.Item
                  label="Cantidad"
                  name="qtyBase"
                  rules={[{ required: true }]}
                  extra={qtyHelp}
                >
                  <InputNumber min={0} style={{ width: 140 }} placeholder="Ej. 0.2" />
                </Form.Item>
                <Form.Item label="Merma %" name="wastePercent">
                  <InputNumber min={0} max={100} style={{ width: 120 }} placeholder="Ej. 5" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" loading={lineSaving} onClick={submitLine}>
                    Agregar
                  </Button>
                </Form.Item>
                {lineType === "sub" ? (
                  <Form.Item>
                    <Button onClick={() => setSubRecipeOpen(true)}>
                      Crear sub-receta
                    </Button>
                  </Form.Item>
                ) : null}
              </Form>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        title="Crear sub-receta"
        open={subRecipeOpen}
        onCancel={() => setSubRecipeOpen(false)}
        onOk={createSubRecipe}
        confirmLoading={subRecipeSaving}
        okText="Crear"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">
            Se creará una receta interna y se agregará como línea.
          </Text>
          <Input
            value={subRecipeName}
            onChange={(e) => setSubRecipeName(e.target.value)}
            placeholder="Ej. Salsa base"
          />
        </Space>
      </Modal>
    </div>
  );
}
