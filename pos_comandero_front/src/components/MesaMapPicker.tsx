import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text, Group, Line } from "react-konva";
import apiOrder from "@/components/apis/apiOrder";

type TableStatus = "free" | "busy" | "occupied" | "held" | "closed";

type LayoutItemKind = "table_round" | "table_rect" | "chair" | "wall" | "label";

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
};

type LayoutDocument = {
  version: 1;
  canvas: { width: number; height: number };
  gridSize: number;
  meta?: { defaultSeats?: number };
  items: LayoutItem[];
};

export type TableRow = {
  id: number;
  code?: string | null;
  seats?: number | null;
  status?: TableStatus | string | null;
};

type Props = {
  areaId: number | null;
  selectedTableId: number | null;
  onSelect?: (table: TableRow) => void;
  readOnly?: boolean;
};

const DEFAULT_STAGE = { width: 720, height: 380 };
const DEFAULT_TABLE_SIZE = 96;

const isTable = (kind: LayoutItemKind) =>
  kind === "table_round" || kind === "table_rect";

const statusColor = (status: string) => {
  const s = String(status || "").toLowerCase();
  if (s === "free") return "#10b981";
  if (s === "busy" || s === "occupied") return "#ef4444";
  if (s === "held" || s === "reserved") return "#f59e0b";
  if (s === "closed") return "#94a3b8";
  return "#cbd5f5";
};

const statusFill = (status: string) => {
  const s = String(status || "").toLowerCase();
  if (s === "free") return "#dcfce7";
  if (s === "busy" || s === "occupied") return "#fee2e2";
  if (s === "held" || s === "reserved") return "#fef3c7";
  if (s === "closed") return "#e2e8f0";
  return "#e0e7ff";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getTableKey = (item: LayoutItem) =>
  String(item.code || item.name || "").trim().toLowerCase();

export default function MesaMapPicker({
  areaId,
  selectedTableId,
  onSelect,
  readOnly = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState(DEFAULT_STAGE);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [rawLayout, setRawLayout] = useState<any>(null);
  const [layout, setLayout] = useState<LayoutDocument | null>(null);
  const [items, setItems] = useState<LayoutItem[]>([]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const node = wrapRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setStageSize({
        width: Math.max(640, Math.floor(width)),
        height: Math.max(360, Math.floor(height)),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!areaId) {
      setTables([]);
      setRawLayout(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [tablesRes, layoutRes] = await Promise.all([
          apiOrder.get("/commander/tables", { params: { areaId } }),
          apiOrder.get(`/kiosk/areas/${areaId}/layout`),
        ]);
        if (cancelled) return;
        const list: TableRow[] = Array.isArray(tablesRes.data)
          ? tablesRes.data
          : [];
        setTables(list);
        setRawLayout(layoutRes.data?.published ?? null);
      } catch {
        if (!cancelled) {
          setTables([]);
          setRawLayout(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [areaId]);

  useEffect(() => {
    const normalized = normalizeLayout(rawLayout, stageSize);
    setLayout(normalized);
    const merged = mergeTablesIntoLayout(
      normalized?.items ?? [],
      tables,
      stageSize
    );
    setItems(merged);
  }, [rawLayout, tables, stageSize]);

  const tableByCode = useMemo(() => {
    const map = new Map<string, TableRow>();
    tables.forEach((t) => {
      const key = String(t.code || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, t);
    });
    return map;
  }, [tables]);

  const gridSize = useMemo(() => {
    const raw = Number(layout?.gridSize ?? 28);
    if (!Number.isFinite(raw) || raw <= 0) return 28;
    return clamp(Math.round(raw), 18, 60);
  }, [layout?.gridSize]);

  const gridLines = useMemo(() => {
    const lines: number[][] = [];
    const width = stageSize.width;
    const height = stageSize.height;
    for (let x = 0; x <= width; x += gridSize) {
      lines.push([x, 0, x, height]);
    }
    for (let y = 0; y <= height; y += gridSize) {
      lines.push([0, y, width, y]);
    }
    return lines;
  }, [gridSize, stageSize.width, stageSize.height]);

  const handleHover = (e: any, cursor: string) => {
    const stage = e?.target?.getStage?.();
    if (stage) stage.container().style.cursor = cursor;
  };

  const renderItem = (item: LayoutItem) => {
    const commonProps = {
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      offsetX: item.width / 2,
      offsetY: item.height / 2,
    } as const;

    if (isTable(item.kind)) {
      const key = getTableKey(item);
      const table = key ? tableByCode.get(key) : undefined;
      const status = String(table?.status || "unknown").toLowerCase();
      const canSelect = !readOnly && status === "free" && !!table && !!onSelect;
      const isSelected =
        !!table && Number(table.id) === Number(selectedTableId);
      const stroke = isSelected ? "#2563eb" : statusColor(status);
      const fill = statusFill(status);
      const baseSize = Math.max(40, Math.min(item.width, item.height));
      const titleSize = clamp(Math.floor(baseSize / 3.4), 12, 22);
      const paxSize = clamp(Math.floor(baseSize / 7), 9, 14);
      const label = String(item.name || item.code || "Mesa").toUpperCase();
      const seats = item.seats || table?.seats;
      const paxText = seats ? `${seats} pax` : "";
      const titleY = paxText
        ? item.height / 2 - titleSize * 0.7
        : item.height / 2 - titleSize * 0.5;
      const paxY = item.height / 2 + titleSize * 0.2;

      const onClick = canSelect ? () => onSelect?.(table) : undefined;

      const onMouseEnter = canSelect
        ? (e: any) => handleHover(e, "pointer")
        : (e: any) => handleHover(e, "default");

      const onMouseLeave = (e: any) => handleHover(e, "default");

      if (item.kind === "table_round") {
        return (
          <Group
            key={item.id}
            {...commonProps}
            onClick={onClick}
            onTap={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          >
            <Circle
              radius={item.width / 2}
              x={item.width / 2}
              y={item.height / 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSelected ? 4 : 2}
              shadowBlur={isSelected ? 10 : 3}
              shadowColor="rgba(15,23,42,0.18)"
            />
            <Text
              text={label}
              fontSize={titleSize}
              fill="#0f172a"
              width={item.width}
              height={item.height}
              align="center"
              verticalAlign="middle"
              x={0}
              y={titleY}
              fontStyle="bold"
            />
            {paxText ? (
              <Text
                text={paxText}
                fontSize={paxSize}
                fill="#475569"
                width={item.width}
                height={item.height}
                align="center"
                verticalAlign="middle"
                x={0}
                y={paxY}
              />
            ) : null}
          </Group>
        );
      }

      return (
        <Group
          key={item.id}
          {...commonProps}
          onClick={onClick}
          onTap={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <Rect
            width={item.width}
            height={item.height}
            fill={fill}
            cornerRadius={12}
            stroke={stroke}
            strokeWidth={isSelected ? 4 : 2}
            shadowBlur={isSelected ? 10 : 3}
            shadowColor="rgba(15,23,42,0.18)"
          />
          <Text
            text={label}
            fontSize={titleSize}
            fill="#0f172a"
            width={item.width}
            height={item.height}
            align="center"
            verticalAlign="middle"
            x={0}
            y={titleY}
            fontStyle="bold"
          />
          {paxText ? (
            <Text
              text={paxText}
              fontSize={paxSize}
              fill="#475569"
              width={item.width}
              height={item.height}
              align="center"
              verticalAlign="middle"
              x={0}
              y={paxY}
            />
          ) : null}
        </Group>
      );
    }

    if (item.kind === "chair") {
      return (
        <Group key={item.id} {...commonProps}>
          <Rect
            width={item.width}
            height={item.height}
            fill="#f8fafc"
            cornerRadius={6}
            stroke="#e2e8f0"
            strokeWidth={1.5}
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
            fill="#1f2937"
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
          stroke="#cbd5f5"
          strokeWidth={1}
        />
        <Text
          text={item.label || "Texto"}
          fontSize={12}
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

  return (
    <div className="w-full">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <div ref={wrapRef} className="w-full">
          {loading ? (
            <div className="text-sm text-gray-500">Cargando mapa...</div>
          ) : !areaId ? (
            <div className="text-sm text-gray-500">
              Selecciona un area para ver el mapa.
            </div>
          ) : !rawLayout && !items.length ? (
            <div className="text-sm text-gray-500">
              No hay mapa publicado para esta area.
            </div>
          ) : (
            <>
              {!rawLayout ? (
                <div className="mb-2 text-xs text-gray-500">
                  Mapa sin publicar, mostrando mesas en modo simple.
                </div>
              ) : null}
              <Stage width={stageSize.width} height={stageSize.height}>
                <Layer>
                  <Rect
                    width={stageSize.width}
                    height={stageSize.height}
                    fill="#f8fafc"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                  {gridLines.map((points, index) => (
                    <Line
                      key={`grid-${index}`}
                      points={points}
                      stroke="#e2e8f0"
                      strokeWidth={1}
                    />
                  ))}
                  {items.map((item) => renderItem(item))}
                </Layer>
              </Stage>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#10b981" }}
          />
          libre
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#ef4444" }}
          />
          ocupada
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#f59e0b" }}
          />
          reservada
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#94a3b8" }}
          />
          cerrada
        </span>
      </div>
    </div>
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
        existing.seats = table.seats || undefined;
      }
      return;
    }
    const position = autoPlacePosition(
      index + items.length + addedCount,
      stageSize
    );
    nextItems.push({
      id: `auto_${table.id}`,
      kind: "table_round",
      x: position.x,
      y: position.y,
      width: DEFAULT_TABLE_SIZE,
      height: DEFAULT_TABLE_SIZE,
      rotation: 0,
      code: String(table.code || ""),
      name: String(table.code || ""),
      seats: table.seats || undefined,
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
