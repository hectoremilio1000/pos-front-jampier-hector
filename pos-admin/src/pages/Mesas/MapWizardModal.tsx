import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Card,
  Steps,
  Divider,
  InputNumber,
  Table,
  Tag,
  Button,
  message,
  Input, // 👈 necesario para el rename inline
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

type TableStatus = "free" | "busy" | "occupied" | "held" | "closed";
type Area = { id: number; name: string } | null;

type Cell = {
  active: boolean;
  code: string;
  seats: number;
};

export default function MapWizardModal({
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
  const [rows, setRows] = useState<number>(4);
  const [cols, setCols] = useState<number>(4);
  const [defaultSeats, setDefaultSeats] = useState<number>(2);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: layout, 2: asignar, 3: revisar
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null); // 👈 nuevo

  // Guarda/lee la forma (rows/cols) por área en localStorage (sin tocar DB)
  const LAYOUT_KEY = (areaId: number) => `posadmin.tablesLayout.${areaId}`;

  function loadStoredLayout(
    areaId: number
  ): { rows?: number; cols?: number; defaultSeats?: number } | null {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY(areaId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveStoredLayout(
    areaId: number,
    data: { rows: number; cols: number; defaultSeats: number }
  ) {
    try {
      localStorage.setItem(LAYOUT_KEY(areaId), JSON.stringify(data));
    } catch {}
  }

  useEffect(() => {
    if (!open) return;
    // Inicializa / carga layout actual del área
    const init = async () => {
      if (!area?.id) return;
      setLoading(true);
      try {
        const res = await apiOrder.get(`/tables?areaId=${area.id}`);
        const list: Array<{
          code: string;
          seats: number;
          status: TableStatus;
        }> = res.data ?? [];
        if (list.length) {
          // 1) Si hay forma guardada para este área → úsala
          const stored = loadStoredLayout(area.id);
          const r = stored?.rows && stored.rows > 0 ? stored.rows : list.length; // por defecto 1×N
          const c = stored?.cols && stored.cols > 0 ? stored.cols : 1;
          if (stored?.defaultSeats && stored.defaultSeats > 0) {
            setDefaultSeats(stored.defaultSeats);
          }
          setRows(r);
          setCols(c);

          const base: Cell[][] = Array.from({ length: r }, () =>
            Array.from({ length: c }, () => ({
              active: false,
              code: "",
              seats: stored?.defaultSeats ?? defaultSeats,
            }))
          );

          // Colocar secuencialmente (row-major)
          list
            .sort((a, b) => {
              const an = Number(a.code),
                bn = Number(b.code);
              if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
              return a.code.localeCompare(b.code);
            })
            .forEach((t, i) => {
              const rr = Math.floor(i / c);
              const cc = i % c;
              if (base[rr] && base[rr][cc]) {
                base[rr][cc] = { active: true, code: t.code, seats: t.seats };
              }
            });

          setGrid(base);
        } else {
          // sin mesas previas: arranque del wizard 1×N o tu default; dejo 1×4 como arranque simple
          buildEmptyGrid(4, 1, 2);
        }

        setCurrentStep(1);
      } catch {
        message.error("Error al cargar mesas del área");
        buildEmptyGrid(4, 4, 2);
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area?.id]);

  useEffect(() => {
    setGrid((prev) => {
      const nr = rows,
        nc = cols;
      const next: Cell[][] = Array.from({ length: nr }, (_, r) =>
        Array.from(
          { length: nc },
          (_, c) =>
            prev?.[r]?.[c] ?? { active: false, code: "", seats: defaultSeats }
        )
      );
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols]);

  const buildEmptyGrid = (r: number, c: number, seats: number) => {
    setRows(r);
    setCols(c);
    setDefaultSeats(seats);
    const base: Cell[][] = Array.from({ length: r }, () =>
      Array.from({ length: c }, () => ({ active: false, code: "", seats }))
    );
    setGrid(base);
  };

  const startEdit = (r: number, c: number) => {
    if (!grid?.[r]?.[c]?.active) return; // solo mesas activas
    setEditing({ r, c });
  };

  const commitEdit = (r: number, c: number, value: string) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = { ...copy[r][c], code: value };
      return copy;
    });
    setEditing(null);
  };

  const toggleCell = (r: number, c: number) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = {
        ...copy[r][c],
        active: !copy[r][c].active,
        code: !copy[r][c].active ? nextCode(copy) : copy[r][c].code,
        seats: copy[r][c].seats || defaultSeats,
      };
      return copy;
    });
  };

  const nextCode = (g: Cell[][]) => {
    const used = new Set<string>();
    g.flat().forEach((cell) => {
      if (cell.active && cell.code.trim())
        used.add(cell.code.trim().toLowerCase());
    });
    let n = 1;
    while (used.has(String(n))) n++;
    return String(n);
  };

  const setCellSeats = (r: number, c: number, seats: number) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = { ...copy[r][c], seats };
      return copy;
    });
  };

  const setCellCode = (r: number, c: number, code: string) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = { ...copy[r][c], code };
      return copy;
    });
  };

  const activeCells = useMemo(() => {
    return grid
      .flatMap((row, r) => row.map((cell, c) => ({ ...cell, r, c })))
      .filter((cell) => cell.active && cell.code.trim());
  }, [grid]);

  const duplicates = useMemo(() => {
    const map = new Map<string, number>();
    activeCells.forEach((x) => {
      const key = x.code.trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return new Set(
      Array.from(map.entries())
        .filter(([, cnt]) => cnt > 1)
        .map(([k]) => k)
    );
  }, [activeCells]);

  const onSave = async () => {
    if (!area?.id) return;
    if (!activeCells.length) {
      message.warning("Activa al menos una mesa");
      return;
    }
    if (duplicates.size) {
      message.error("Códigos duplicados. Corrige antes de guardar.");
      setCurrentStep(2);
      return;
    }
    setSaving(true);
    try {
      const payload = activeCells.map((x) => ({
        code: x.code.trim(),
        seats: x.seats || defaultSeats,
      }));
      await apiOrder.post(`/areas/${area.id}/tables/replace`, {
        tables: payload,
      });
      message.success("Mapa guardado");
      // persistimos la forma elegida para este área
      if (area?.id) {
        saveStoredLayout(area.id, { rows, cols, defaultSeats });
      }
      onSaved();
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? "Error al guardar mapa");
    } finally {
      setSaving(false);
    }
  };

  if (!area) return null;

  return (
    <Modal
      open={open}
      width={920}
      title={`Configurar mapa – ${area.name}`}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      maskClosable={false}
    >
      <Steps
        current={currentStep - 1}
        items={[
          { title: "Layout" },
          { title: "Asignar" },
          { title: "Revisar/Guardar" },
        ]}
        className="mb-4"
      />

      {/* Paso 1: Layout */}
      {currentStep === 1 && (
        <Card>
          <div className="flex gap-4 flex-wrap">
            <div>
              <span className="block text-sm text-gray-600 mb-1">Filas</span>
              <InputNumber
                min={1}
                max={20}
                value={rows}
                onChange={(v) => setRows(Number(v))}
              />
            </div>
            <div>
              <span className="block text-sm text-gray-600 mb-1">Columnas</span>
              <InputNumber
                min={1}
                max={20}
                value={cols}
                onChange={(v) => setCols(Number(v))}
              />
            </div>
            <div>
              <span className="block text-sm text-gray-600 mb-1">
                Asientos por defecto
              </span>
              <InputNumber
                min={1}
                max={20}
                value={defaultSeats}
                onChange={(v) => setDefaultSeats(Number(v))}
              />
            </div>
          </div>

          <Divider />

          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(56px, 1fr))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onClick={() => toggleCell(r, c)}
                  onDoubleClick={() => startEdit(r, c)} // 👈 doble clic para renombrar
                  className={[
                    "cursor-pointer select-none rounded-md border p-2 text-center",
                    cell.active ? "border-green-600" : "border-gray-300",
                  ].join(" ")}
                  title={
                    cell.active
                      ? `Mesa ${cell.code} • ${cell.seats} pax`
                      : "Vacío"
                  }
                >
                  {cell.active ? (
                    <div className="flex flex-col items-center">
                      {editing && editing.r === r && editing.c === c ? (
                        <Input
                          size="small"
                          className="w-20 text-center"
                          defaultValue={cell.code}
                          autoFocus
                          onPressEnter={(e) =>
                            commitEdit(
                              r,
                              c,
                              (e.target as HTMLInputElement).value
                            )
                          }
                          onBlur={(e) =>
                            commitEdit(
                              r,
                              c,
                              (e.target as HTMLInputElement).value
                            )
                          }
                        />
                      ) : (
                        <>
                          <span className="font-semibold">
                            {cell.code || "?"}
                          </span>
                          <span className="text-xs opacity-70">
                            {cell.seats} pax
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              ))
            )}
          </div>

          <Divider />
          <div className="flex justify-end">
            <Button type="primary" onClick={() => setCurrentStep(2)}>
              Siguiente
            </Button>
          </div>
        </Card>
      )}

      {/* Paso 2: Asignar códigos/asientos */}
      {currentStep === 2 && (
        <Card>
          <Table
            rowKey={(rec) => `${rec.r}-${rec.c}`}
            dataSource={activeCells}
            pagination={{ pageSize: 10 }}
            columns={[
              { title: "Fila", dataIndex: "r", width: 80 },
              { title: "Col", dataIndex: "c", width: 80 },
              {
                title: "Nombre (código)",
                dataIndex: "code",
                render: (_: any, rec: any) => (
                  <input
                    className="border rounded px-2 py-1 w-24"
                    value={rec.code}
                    onChange={(e) => setCellCode(rec.r, rec.c, e.target.value)}
                  />
                ),
              },
              {
                title: "Asientos",
                dataIndex: "seats",
                render: (_: any, rec: any) => (
                  <InputNumber
                    min={1}
                    value={rec.seats}
                    onChange={(v) => setCellSeats(rec.r, rec.c, Number(v))}
                  />
                ),
              },
              {
                title: "Validez",
                render: (_: any, rec: any) => {
                  const key = rec.code?.trim().toLowerCase();
                  const dup = key && Array.from(duplicates).includes(key);
                  return dup ? (
                    <Tag color="red">Duplicado</Tag>
                  ) : (
                    <Tag color="green">OK</Tag>
                  );
                },
              },
            ]}
          />
          <Divider />
          <div className="flex justify-between">
            <Button onClick={() => setCurrentStep(1)}>Atrás</Button>
            <Button type="primary" onClick={() => setCurrentStep(3)}>
              Siguiente
            </Button>
          </div>
        </Card>
      )}

      {/* Paso 3: Revisar/Guardar */}
      {currentStep === 3 && (
        <Card>
          <Table
            rowKey={(rec) => `${rec.r}-${rec.c}`}
            dataSource={activeCells}
            pagination={false}
            columns={[
              { title: "Mesa", dataIndex: "code" },
              { title: "Asientos", dataIndex: "seats", width: 120 },
            ]}
          />
          <Divider />
          <div className="flex justify-between">
            <Button onClick={() => setCurrentStep(2)}>Atrás</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
            >
              Guardar mapa
            </Button>
          </div>
        </Card>
      )}
    </Modal>
  );
}
