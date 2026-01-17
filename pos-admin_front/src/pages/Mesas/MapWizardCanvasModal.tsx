import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Card,
  Steps,
  Divider,
  Button,
  message,
  InputNumber,
  Input,
  Switch,
  Space,
} from "antd";
import {
  SaveOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  DeleteOutlined,
  CopyOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Group,
  Transformer,
  Line,
} from "react-konva";
import type Konva from "konva";
import apiOrder from "@/components/apis/apiOrder";

type TableStatus = "free" | "busy" | "occupied" | "held" | "closed";
type Area = { id: number; name: string } | null;

type LayoutItemKind =
  | "table_round"
  | "table_rect"
  | "chair"
  | "wall"
  | "label"
  | "polygon";

type LayoutItem = {
  id: string;
  kind: LayoutItemKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  name?: string;
  code?: string;
  seats?: number;
  label?: string;
  points?: number[];
};

type LayoutDocument = {
  version: 1;
  canvas: { width: number; height: number };
  gridSize: number;
  meta?: { defaultSeats?: number };
  items: LayoutItem[];
};

type TableRow = {
  code: string;
  seats: number;
  status: TableStatus;
};

const DEFAULT_TABLE_SIZE = 96;
const DEFAULT_CHAIR_SIZE = 30;
const DEFAULT_WALL_SIZE = { width: 140, height: 16 };
const DEFAULT_LABEL_SIZE = { width: 140, height: 36 };

const isTable = (kind: LayoutItemKind) =>
  kind === "table_round" || kind === "table_rect";

const snapValue = (value: number, size: number) =>
  Math.round(value / size) * size;

const createId = () => Math.random().toString(36).slice(2, 10);

const clampSize = (value: number, min: number) =>
  Number.isFinite(value) ? Math.max(value, min) : min;

const getMinSize = (kind?: LayoutItemKind) => (kind === "wall" ? 8 : 24);

export default function MapWizardCanvasModal({
  open,
  area,
  onClose,
  onSaved,
}: {
  open: boolean;
  area: Area;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [items, setItems] = useState<LayoutItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(20);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [defaultSeats, setDefaultSeats] = useState(2);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 960, height: 560 });
  const [loadedAreaId, setLoadedAreaId] = useState<number | null>(null);
  const [polygonDraft, setPolygonDraft] = useState<number[] | null>(null);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef<Record<string, Konva.Node>>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  const isDrawingPolygon = polygonDraft !== null;
  const polygonDraftPoints = polygonDraft ?? [];

  const tableItems = useMemo(
    () => items.filter((item) => isTable(item.kind)),
    [items]
  );

  const getStagePoint = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const scaleX = stage.scaleX() || 1;
    const scaleY = stage.scaleY() || 1;
    const pos = stage.position();
    return {
      x: (pointer.x - pos.x) / scaleX,
      y: (pointer.y - pos.y) / scaleY,
    };
  }, []);

  const cancelPolygon = useCallback(() => {
    setPolygonDraft(null);
  }, []);

  const finishPolygon = useCallback(() => {
    const points = polygonDraftPoints;
    if (points.length < 6) {
      message.warning("Agrega al menos 3 puntos");
      return;
    }

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < points.length; i += 2) {
      xs.push(points[i]);
      ys.push(points[i + 1]);
    }

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const relPoints = points.map((v, i) =>
      i % 2 === 0 ? v - minX : v - minY
    );

    const item: LayoutItem = {
      id: createId(),
      kind: "polygon",
      x: minX,
      y: minY,
      width: Math.max(24, maxX - minX),
      height: Math.max(24, maxY - minY),
      rotation: 0,
      points: relPoints,
    };

    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
    setPolygonDraft(null);
  }, [polygonDraftPoints]);

  const startPolygonDraw = useCallback(() => {
    setPolygonDraft([]);
    setSelectedId(null);
    message.info("Modo polígono: clic para puntos, Enter para cerrar, Esc para cancelar");
  }, []);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const node = wrapRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setStageSize({
        width: Math.max(640, Math.floor(width)),
        height: Math.max(420, Math.floor(height)),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) setPolygonDraft(null);
  }, [open]);

  useEffect(() => {
    if (!isDrawingPolygon) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finishPolygon();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelPolygon();
      } else if (e.key === "Backspace" || e.key === "Delete") {
        setPolygonDraft((prev) =>
          prev && prev.length ? prev.slice(0, -2) : prev
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawingPolygon, finishPolygon, cancelPolygon]);

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selectedId ? shapeRefs.current[selectedId] : null;
    if (node && selected?.kind !== "polygon") {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, items, selected]);

  useEffect(() => {
    if (!open || !area?.id || stageSize.width <= 0) return;
    if (loadedAreaId === area.id) return;

    const init = async () => {
      setLoading(true);
      setSelectedId(null);
      try {
        const [tablesRes, layoutRes] = await Promise.all([
          apiOrder.get(`/tables`, { params: { areaId: area.id } }),
          apiOrder.get(`/areas/${area.id}/layout`),
        ]);

        const tables: TableRow[] = Array.isArray(tablesRes.data)
          ? tablesRes.data
          : [];

        const layoutPayload = layoutRes.data?.published ?? layoutRes.data?.draft;
        const normalized = normalizeLayout(layoutPayload, stageSize);

        if (normalized?.gridSize) setGridSize(normalized.gridSize);
        if (normalized?.meta?.defaultSeats) {
          setDefaultSeats(normalized.meta.defaultSeats);
        }

        let nextItems = normalized?.items ?? [];
        nextItems = mergeTablesIntoLayout(nextItems, tables, stageSize);

        if (!nextItems.length) {
          nextItems = [
            createItem(
              "table_round",
              {
                x: stageSize.width / 2,
                y: stageSize.height / 2,
              },
              defaultSeats
            ),
          ];
        }

        setItems(nextItems);
        setCurrentStep(1);
        setStagePos({ x: 0, y: 0 });
        setScale(1);
        setLoadedAreaId(area.id);
      } catch (e) {
        message.error("Error al cargar el mapa");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [open, area?.id, stageSize, loadedAreaId, defaultSeats]);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDrawingPolygon) {
      const point = getStagePoint();
      if (!point) return;
      let x = point.x;
      let y = point.y;
      if (snapEnabled) {
        x = snapValue(x, gridSize);
        y = snapValue(y, gridSize);
      }
      setPolygonDraft((prev) => [...(prev ?? []), x, y]);
      return;
    }
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  const updateItem = (id: string, patch: Partial<LayoutItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateItem = (item: LayoutItem) => {
    const base = {
      ...item,
      id: createId(),
      x: item.x + 20,
      y: item.y + 20,
    } as LayoutItem;
    if (isTable(item.kind)) {
      base.code = "";
    }
    setItems((prev) => [...prev, base]);
  };

  const addItem = (kind: LayoutItemKind) => {
    const center = getCanvasCenter(stageSize, scale, stagePos);
    const item = createItem(kind, center, defaultSeats);
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  };

  const handleDragEnd = (item: LayoutItem, node: Konva.Node) => {
    let x = node.x();
    let y = node.y();
    if (snapEnabled) {
      x = snapValue(x, gridSize);
      y = snapValue(y, gridSize);
    }
    updateItem(item.id, { x, y });
  };

  const handleTransformEnd = (item: LayoutItem, node: Konva.Node) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const minSize = getMinSize(item.kind);
    let width = clampSize(item.width * scaleX, minSize);
    let height = clampSize(item.height * scaleY, minSize);
    let rotation = node.rotation();

    if (snapEnabled) {
      width = snapValue(width, gridSize);
      height = snapValue(height, gridSize);
      rotation = snapValue(rotation, 5);
    }

    if (item.kind === "table_round") {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    updateItem(item.id, { width, height, rotation });
  };

  const updatePolygonPoint = useCallback(
    (itemId: string, pointIndex: number, x: number, y: number) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId || item.kind !== "polygon") return item;
          const next = [...(item.points ?? [])];
          next[pointIndex] = x;
          next[pointIndex + 1] = y;
          return { ...item, points: next };
        })
      );
    },
    []
  );

  const autoNumberTables = () => {
    const sorted = [...tableItems].sort((a, b) =>
      a.y === b.y ? a.x - b.x : a.y - b.y
    );
    const updates = new Map(
      sorted.map((table, index) => [table.id, String(index + 1)])
    );
    setItems((prev) =>
      prev.map((item) =>
        updates.has(item.id) ? { ...item, name: updates.get(item.id) } : item
      )
    );
  };

  const onSave = async () => {
    if (!area?.id) return;
    if (!tableItems.length) {
      message.warning("Agrega al menos una mesa");
      return;
    }

    for (const table of tableItems) {
      const name = String(table.name ?? table.code ?? "").trim();
      if (!name) {
        message.error("Todas las mesas deben tener nombre");
        setCurrentStep(2);
        return;
      }
    }

    const tablesPayload = tableItems.map((table) => ({
      clientId: table.id,
      name: String(table.name ?? table.code ?? "").trim(),
      seats: Number(table.seats || defaultSeats || 1),
    }));

    setSaving(true);
    try {
      const replaceRes = await apiOrder.post(`/areas/${area.id}/tables/replace`, {
        tables: tablesPayload,
      });

      const codePairs = replaceRes.data?.codes;
      let nextItems = items;
      if (Array.isArray(codePairs)) {
        const codeMap = new Map(
          codePairs
            .filter((pair: any) => pair?.clientId && pair?.code)
            .map((pair: any) => [String(pair.clientId), String(pair.code)])
        );
        nextItems = items.map((item) =>
          codeMap.has(item.id) ? { ...item, code: codeMap.get(item.id) } : item
        );
        setItems(nextItems);
      }

      const layoutPayload: LayoutDocument = {
        version: 1,
        canvas: { width: stageSize.width, height: stageSize.height },
        gridSize,
        meta: { defaultSeats },
        items: nextItems,
      };

      await apiOrder.put(`/areas/${area.id}/layout`, {
        status: "published",
        layout: layoutPayload,
      });
      message.success("Mapa guardado");
      onSaved();
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? "Error al guardar mapa");
    } finally {
      setSaving(false);
    }
  };

  const exportPng = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement("a");
    const safeName = String(area?.name || "area")
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, "-");
    link.download = `mapa-${safeName}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clamped = Math.min(Math.max(newScale, 0.5), 2.5);

    const mousePoint = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const nextPos = {
      x: pointer.x - mousePoint.x * clamped,
      y: pointer.y - mousePoint.y * clamped,
    };

    setScale(clamped);
    setStagePos(nextPos);
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines = [];
    const width = stageSize.width;
    const height = stageSize.height;
    for (let i = 0; i < width / gridSize; i += 1) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * gridSize, 0, i * gridSize, height]}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      );
    }
    for (let j = 0; j < height / gridSize; j += 1) {
      lines.push(
        <Line
          key={`h-${j}`}
          points={[0, j * gridSize, width, j * gridSize]}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  const renderItem = (item: LayoutItem, interactive: boolean) => {
    const isSelected = selectedId === item.id;
    const commonProps = {
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      draggable: interactive,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
        handleDragEnd(item, e.target),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
        handleTransformEnd(item, e.target),
      onClick: () => setSelectedId(item.id),
      onTap: () => setSelectedId(item.id),
      ref: (node: Konva.Node | null) => {
        if (node) shapeRefs.current[item.id] = node;
      },
      offsetX: item.width / 2,
      offsetY: item.height / 2,
    } as const;

    if (item.kind === "table_round") {
      return (
        <Group key={item.id} {...commonProps}>
          <Circle
            radius={item.width / 2}
            x={item.width / 2}
            y={item.height / 2}
            fill="#ffffff"
            stroke={isSelected ? "#10b981" : "#94a3b8"}
            strokeWidth={2}
            shadowBlur={isSelected ? 6 : 2}
            shadowColor="rgba(15,23,42,0.12)"
          />
          <Text
            text={String(item.name || item.code || "")}
            fontSize={18}
            fill="#0f766e"
            width={item.width}
            height={item.height}
            align="center"
            verticalAlign="middle"
            x={0}
            y={item.height / 2 - 18}
            fontStyle="bold"
          />
          <Text
            text={`${item.seats || defaultSeats} pax`}
            fontSize={11}
            fill="#0f766e"
            width={item.width}
            height={item.height}
            align="center"
            verticalAlign="middle"
            x={0}
            y={item.height / 2 + 4}
          />
        </Group>
      );
    }

    if (item.kind === "table_rect") {
      return (
        <Group key={item.id} {...commonProps}>
          <Rect
            width={item.width}
            height={item.height}
            fill="#ffffff"
            cornerRadius={10}
            stroke={isSelected ? "#10b981" : "#94a3b8"}
            strokeWidth={2}
            shadowBlur={isSelected ? 6 : 2}
            shadowColor="rgba(15,23,42,0.12)"
          />
          <Text
            text={String(item.name || item.code || "")}
            fontSize={16}
            fill="#0f766e"
            width={item.width}
            height={item.height}
            align="center"
            verticalAlign="middle"
            x={0}
            y={item.height / 2 - 18}
            fontStyle="bold"
          />
          <Text
            text={`${item.seats || defaultSeats} pax`}
            fontSize={11}
            fill="#0f766e"
            width={item.width}
            height={item.height}
            align="center"
            verticalAlign="middle"
            x={0}
            y={item.height / 2 + 4}
          />
        </Group>
      );
    }

    if (item.kind === "chair") {
      return (
        <Group key={item.id} {...commonProps}>
          <Rect
            width={item.width}
            height={item.height}
            fill="#f1f5f9"
            cornerRadius={6}
            stroke={isSelected ? "#10b981" : "#cbd5f5"}
            strokeWidth={2}
          />
          <Rect
            width={item.width}
            height={6}
            fill="#94a3b8"
            cornerRadius={4}
            x={0}
            y={2}
          />
        </Group>
      );
    }

    if (item.kind === "wall") {
      return (
        <Group key={item.id} {...commonProps}>
          <Rect
            width={item.width}
            height={item.height}
            fill="#0f172a"
            cornerRadius={4}
          />
        </Group>
      );
    }

    return (
      <Group key={item.id} {...commonProps}>
        <Rect
          width={item.width}
          height={item.height}
          fill="#f8fafc"
          cornerRadius={8}
          stroke={isSelected ? "#10b981" : "#cbd5f5"}
          strokeWidth={1}
        />
        <Text
          text={item.label || "Texto"}
          fontSize={14}
          fill="#334155"
          width={item.width}
          height={item.height}
          align="center"
          verticalAlign="middle"
          x={0}
          y={0}
        />
      </Group>
    );
  };

  const renderStage = ({
    interactive,
    width,
    height,
    scaleOverride,
    positionOverride,
    showGridOverride,
  }: {
    interactive: boolean;
    width: number;
    height: number;
    scaleOverride?: number;
    positionOverride?: { x: number; y: number };
    showGridOverride?: boolean;
  }) => (
    <Stage
      width={width}
      height={height}
      ref={stageRef}
      scale={{ x: scaleOverride ?? scale, y: scaleOverride ?? scale }}
      position={positionOverride ?? stagePos}
      onWheel={interactive ? handleWheel : undefined}
      onMouseDown={interactive ? handleStageMouseDown : undefined}
    >
      <Layer>{(showGridOverride ?? showGrid) && renderGrid()}</Layer>
      <Layer>
        <Rect width={width} height={height} fill="transparent" />
        {items.map((item) => renderItem(item, interactive))}
      </Layer>
      {interactive ? (
        <Layer>
          <Transformer
            ref={transformerRef}
            rotateEnabled
            rotateAnchorOffset={24}
            anchorSize={8}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              const minSize = getMinSize(selected?.kind);
              if (newBox.width < minSize || newBox.height < minSize) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      ) : null}
    </Stage>
  );

  const previewWidth = Math.min(stageSize.width, 720);
  const previewHeight = Math.min(stageSize.height, 420);
  const previewScale = Math.min(
    1,
    previewWidth / stageSize.width,
    previewHeight / stageSize.height
  );
  const previewPos = {
    x: (previewWidth - stageSize.width * previewScale) / 2,
    y: (previewHeight - stageSize.height * previewScale) / 2,
  };

  if (!area) return null;

  return (
    <Modal
      open={open}
      width={1200}
      title={`Diseñar comedor – ${area.name}`}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      maskClosable={false}
    >
      <Steps
        current={currentStep - 1}
        items={[
          { title: "Diseño" },
          { title: "Detalles" },
          { title: "Publicar" },
        ]}
        className="mb-4"
      />

      {currentStep === 1 && (
        <Card loading={loading} className="border-0">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr_240px]">
            <div className="space-y-3">
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">
                  Elementos
                </div>
                <div className="mt-2 grid gap-2">
                  <Button onClick={() => addItem("table_round")}>
                    Mesa redonda
                  </Button>
                  <Button onClick={() => addItem("table_rect")}>
                    Mesa rectangular
                  </Button>
                  <Button onClick={() => addItem("chair")}>Silla</Button>
                  <Button onClick={() => addItem("wall")}>Muro</Button>
                  <Button onClick={() => addItem("label")}>Texto</Button>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-3 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-slate-500">Guia</div>
                <Space direction="vertical" size={6}>
                  <Space>
                    <Switch
                      size="small"
                      checked={showGrid}
                      onChange={setShowGrid}
                    />
                    <span className="text-xs">Mostrar grid</span>
                  </Space>
                  <Space>
                    <Switch
                      size="small"
                      checked={snapEnabled}
                      onChange={setSnapEnabled}
                    />
                    <span className="text-xs">Snap a grid</span>
                  </Space>
                  <Space align="center">
                    <span className="text-xs">Grid</span>
                    <InputNumber
                      min={10}
                      max={80}
                      size="small"
                      value={gridSize}
                      onChange={(v) => setGridSize(Number(v))}
                    />
                  </Space>
                </Space>
              </div>

              <div className="rounded-xl border bg-white p-3 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-slate-500">Zoom</div>
                <Space>
                  <Button
                    icon={<ZoomOutOutlined />}
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                  />
                  <Button
                    icon={<ZoomInOutlined />}
                    onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => {
                      setScale(1);
                      setStagePos({ x: 0, y: 0 });
                    }}
                  />
                </Space>
              </div>
            </div>

            <div
              ref={wrapRef}
              className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm"
              style={{ minHeight: 520 }}
            >
              {renderStage({
                interactive: true,
                width: stageSize.width,
                height: stageSize.height,
              })}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border bg-white p-3 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-slate-500">
                  Inspector
                </div>
                {selected ? (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-700">
                      {selected.kind.replace("_", " ")}
                    </div>
                    {isTable(selected.kind) ? (
                      <>
                        <div>
                          <div className="text-xs text-slate-500">Nombre</div>
                          <Input
                            size="small"
                            value={selected.name ?? selected.code ?? ""}
                            onChange={(e) =>
                              updateItem(selected.id, { name: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">
                            Asientos
                          </div>
                          <InputNumber
                            min={1}
                            size="small"
                            value={selected.seats ?? defaultSeats}
                            onChange={(v) =>
                              updateItem(selected.id, {
                                seats: Number(v),
                              })
                            }
                          />
                        </div>
                      </>
                    ) : null}
                    {selected.kind === "label" ? (
                      <div>
                        <div className="text-xs text-slate-500">Texto</div>
                        <Input
                          size="small"
                          value={selected.label}
                          onChange={(e) =>
                            updateItem(selected.id, { label: e.target.value })
                          }
                        />
                      </div>
                    ) : null}
                    <div>
                      <div className="text-xs text-slate-500">Tamano</div>
                      <Space>
                        <InputNumber
                          min={getMinSize(selected.kind)}
                          size="small"
                          value={selected.width}
                          onChange={(v) =>
                            updateItem(selected.id, {
                              width: clampSize(
                                Number(v),
                                getMinSize(selected.kind)
                              ),
                            })
                          }
                        />
                        <InputNumber
                          min={getMinSize(selected.kind)}
                          size="small"
                          value={selected.height}
                          onChange={(v) =>
                            updateItem(selected.id, {
                              height: clampSize(
                                Number(v),
                                getMinSize(selected.kind)
                              ),
                            })
                          }
                        />
                      </Space>
                    </div>
                    <Space>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => duplicateItem(selected)}
                      >
                        Duplicar
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeItem(selected.id)}
                      >
                        Eliminar
                      </Button>
                    </Space>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Selecciona un elemento para editar.
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-white p-3 shadow-sm space-y-2">
                <div className="text-xs font-semibold text-slate-500">
                  Acciones
                </div>
                <Space direction="vertical" size={6}>
                  <Button onClick={autoNumberTables}>Auto numerar mesas</Button>
                  <Space>
                    <span className="text-xs text-slate-500">Pax default</span>
                    <InputNumber
                      min={1}
                      size="small"
                      value={defaultSeats}
                      onChange={(v) => setDefaultSeats(Number(v))}
                    />
                  </Space>
                </Space>
              </div>

            </div>
          </div>

          <Divider />
          <div className="flex justify-between">
            <Button onClick={onClose}>Cerrar</Button>
            <Button type="primary" onClick={() => setCurrentStep(2)}>
              Siguiente
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="border-0">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Mesas del comedor</div>
              <div className="text-xs text-slate-500">
                Asegurate de que todas tengan nombre y asientos.
              </div>
            </div>
            <Button onClick={autoNumberTables}>Auto numerar</Button>
          </div>
          <div className="grid gap-3">
            {tableItems.map((table) => (
              <div
                key={table.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3"
              >
                <div className="min-w-[90px] text-xs text-slate-500">
                  {table.kind === "table_round" ? "Redonda" : "Rect"}
                </div>
                <Input
                  placeholder="Nombre"
                  className="w-32"
                  value={table.name ?? table.code ?? ""}
                  onChange={(e) =>
                    updateItem(table.id, { name: e.target.value })
                  }
                />
                <InputNumber
                  min={1}
                  value={table.seats ?? defaultSeats}
                  onChange={(v) =>
                    updateItem(table.id, { seats: Number(v) })
                  }
                />
              </div>
            ))}
          </div>

          <Divider />
          <div className="flex justify-between">
            <Button onClick={() => setCurrentStep(1)}>Atras</Button>
            <Button type="primary" onClick={() => setCurrentStep(3)}>
              Siguiente
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="border-0">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-slate-600">
                Vista de impresion
              </div>
              {renderStage({
                interactive: false,
                width: previewWidth,
                height: previewHeight,
                scaleOverride: previewScale,
                positionOverride: previewPos,
                showGridOverride: false,
              })}
            </div>
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-slate-600">
                Resumen
              </div>
              <div className="space-y-2">
                <div className="text-xs text-slate-500">
                  Mesas: {tableItems.length}
                </div>
                <div className="text-xs text-slate-500">
                  Sillas: {items.filter((i) => i.kind === "chair").length}
                </div>
                <div className="text-xs text-slate-500">
                  Elementos: {items.length}
                </div>
              </div>
            </div>
          </div>

          <Divider />
          <div className="flex justify-between">
            <Space>
              <Button onClick={() => setCurrentStep(2)}>Atras</Button>
              <Button onClick={() => setCurrentStep(1)}>Editar mapa</Button>
            </Space>
            <Space>
              <Button onClick={exportPng}>Descargar PNG</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={onSave}
              >
                Publicar mapa
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </Modal>
  );
}

function normalizeLayout(
  raw: any,
  stageSize: { width: number; height: number }
): LayoutDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const items: LayoutItem[] = Array.isArray(raw.items)
    ? raw.items
        .map((item: any, index: number) => {
          const kind = String(item.kind || "");
          if (
            kind !== "table_round" &&
            kind !== "table_rect" &&
            kind !== "chair" &&
            kind !== "wall" &&
            kind !== "label"
          ) {
            return null;
          }
          return {
            id: String(item.id || `item_${index}`),
            kind,
            x: Number(item.x ?? 0),
            y: Number(item.y ?? 0),
            width: Number(item.width ?? DEFAULT_TABLE_SIZE),
            height: Number(item.height ?? DEFAULT_TABLE_SIZE),
            rotation: Number(item.rotation ?? 0),
            name: item.name ? String(item.name) : item.code ? String(item.code) : "",
            code: item.code ? String(item.code) : "",
            seats: item.seats ? Number(item.seats) : undefined,
            label: item.label ? String(item.label) : undefined,
          } as LayoutItem;
        })
        .filter(Boolean)
    : [];

  const canvas =
    raw.canvas && raw.canvas.width && raw.canvas.height
      ? { width: Number(raw.canvas.width), height: Number(raw.canvas.height) }
      : { width: stageSize.width, height: stageSize.height };

  const gridSize = Number(raw.gridSize ?? 20);
  const meta = raw.meta && typeof raw.meta === "object" ? raw.meta : undefined;

  const scaledItems = scaleLayoutItems(items, canvas, stageSize);

  return {
    version: 1,
    canvas: { width: stageSize.width, height: stageSize.height },
    gridSize,
    meta,
    items: scaledItems,
  };
}

function scaleLayoutItems(
  items: LayoutItem[],
  from: { width: number; height: number },
  to: { width: number; height: number }
) {
  if (!from.width || !from.height) return items;
  const scaleX = to.width / from.width;
  const scaleY = to.height / from.height;
  return items.map((item) => ({
    ...item,
    x: item.x * scaleX,
    y: item.y * scaleY,
    width: item.width * scaleX,
    height: item.height * scaleY,
  }));
}

function mergeTablesIntoLayout(
  items: LayoutItem[],
  tables: TableRow[],
  stageSize: { width: number; height: number }
) {
  const map = new Map(
    items
      .filter((item) => isTable(item.kind) && item.code)
      .map((item) => [String(item.code).trim().toLowerCase(), item])
  );

  const nextItems = [...items];
  let addedCount = 0;

  tables.forEach((table, index) => {
    const key = String(table.code || "").trim().toLowerCase();
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
      if (!existing.seats && table.seats) {
        existing.seats = table.seats;
      }
      return;
    }
    const position = autoPlacePosition(
      index + items.length + addedCount,
      stageSize
    );
    nextItems.push({
      id: createId(),
      kind: "table_round",
      x: position.x,
      y: position.y,
      width: DEFAULT_TABLE_SIZE,
      height: DEFAULT_TABLE_SIZE,
      rotation: 0,
      code: table.code,
      name: table.code,
      seats: table.seats,
    });
    addedCount += 1;
  });

  return nextItems;
}

function autoPlacePosition(
  index: number,
  stageSize: { width: number; height: number }
) {
  const spacing = 140;
  const columns = Math.max(1, Math.floor(stageSize.width / spacing));
  const x = spacing / 2 + (index % columns) * spacing;
  const y = spacing / 2 + Math.floor(index / columns) * spacing;
  return { x, y };
}

function getCanvasCenter(
  stageSize: { width: number; height: number },
  scale: number,
  stagePos: { x: number; y: number }
) {
  return {
    x: (stageSize.width / 2 - stagePos.x) / scale,
    y: (stageSize.height / 2 - stagePos.y) / scale,
  };
}

function createItem(
  kind: LayoutItemKind,
  center: { x: number; y: number },
  defaultSeats: number
): LayoutItem {
  const base: LayoutItem = {
    id: createId(),
    kind,
    x: center.x,
    y: center.y,
    width: DEFAULT_TABLE_SIZE,
    height: DEFAULT_TABLE_SIZE,
    rotation: 0,
  };

  if (kind === "chair") {
    return {
      ...base,
      width: DEFAULT_CHAIR_SIZE,
      height: DEFAULT_CHAIR_SIZE,
    };
  }

  if (kind === "wall") {
    return {
      ...base,
      width: DEFAULT_WALL_SIZE.width,
      height: DEFAULT_WALL_SIZE.height,
    };
  }

  if (kind === "label") {
    return {
      ...base,
      width: DEFAULT_LABEL_SIZE.width,
      height: DEFAULT_LABEL_SIZE.height,
      label: "Area",
    };
  }

  if (isTable(kind)) {
    return {
      ...base,
      code: "",
      name: "",
      seats: defaultSeats,
    };
  }

  return base;
}
