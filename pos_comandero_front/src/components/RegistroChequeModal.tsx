import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Button,
  Steps,
  message,
  Input,
  InputNumber,
  Tag,
  Select,
  Spin,
} from "antd";

import apiOrder from "@/components/apis/apiOrder";
import TecladoVirtual from "./TecladoVirtual";
import MesaMapPicker, { type TableRow as MesaTableRow } from "./MesaMapPicker";

interface Area {
  id: number | null;
  restaurantId: number;
  name: string;
  sortOrder: number;
}
interface Service {
  id: number | null;
  restaurantId: number;
  name: string;
  sortOrder: number;
}

type TableRow = MesaTableRow & {
  name?: string | null;
  code?: string | null;
  number?: string | null;
  label?: string | null;
  [k: string]: any;
};

// (Solo si este tipo ya existe globalmente, puedes borrar estas interfaces locales)
type Producto = any;

type Mitad = 0 | 1 | 2 | 3;
interface OrderItem {
  orderId: number | null;
  productId: number;
  qty: number;
  unitPrice: number;
  taxRate: number;
  basePrice: number;
  total: number;
  notes: string | null;
  course: number;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number | null;
  discountAppliedBy: number | null;
  discountReason: string | null;
  product: Producto;
  status: string | null;
  compositeProductId: string | null;
  isModifier: boolean;
  isCompositeProductMain: boolean;
  half: Mitad;
  route_area_id: number;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onRegistrar: (cheque: {
    shiftId: number | null;
    id: number;
    tableId?: number | null; // ✅ NUEVO (opcional)
    tableName: string;
    persons: number;
    area_id: number | null;
    service_id: number | null;
    area: Area;
    service: Service;
    items: OrderItem[];
  }) => void;

  areas: Area[];
  services: Service[];

  // NUEVO: llegan fijos desde ControlComandero
  defaultAreaId?: number;
  defaultServiceId?: number;
  tablesRefreshKey?: number;
};

const { Step } = Steps;

const RegistroChequeModal: React.FC<Props> = ({
  visible,
  onClose,
  onRegistrar,
  areas,
  services,
  defaultAreaId,
  defaultServiceId,
  tablesRefreshKey,
}) => {
  // 0: Nombre, 1: Personas, 2: Resumen
  const [step, setStep] = useState(0);

  const [cuenta, setCuenta] = useState("");
  const [personas, setPersonas] = useState("");
  const [nameSource, setNameSource] = useState<"manual" | "table" | null>(null);
  const hasManualName = nameSource === "manual" && Boolean(cuenta.trim());
  const showMap = !hasManualName;

  // ✅ Mesas por área (tableId puede ser null)
  const [tables, setTables] = useState<TableRow[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    typeof defaultServiceId === "number" ? defaultServiceId : null
  );

  const hasTables = tables.length > 0;
  const hasServices = services.length > 0;

  const getTableLabel = (t: TableRow) => {
    return (
      String(t?.name ?? t?.label ?? t?.code ?? t?.number ?? "").trim() ||
      `Mesa #${t.id}`
    );
  };

  const selectedTable = useMemo(
    () => tables.find((t) => Number(t.id) === Number(selectedTableId)),
    [tables, selectedTableId]
  );

  const syncManualName = (next: string) => {
    if (next.trim()) {
      setNameSource("manual");
      if (selectedTableId !== null) setSelectedTableId(null);
    } else {
      setNameSource(null);
    }
  };

  const setCuentaManual: React.Dispatch<React.SetStateAction<string>> = (
    value
  ) => {
    if (typeof value === "function") {
      setCuenta((prev) => {
        const next = (value as (prev: string) => string)(prev);
        syncManualName(next);
        return next;
      });
      return;
    }
    setCuenta(value);
    syncManualName(value);
  };

  const setCuentaFromTable = (label: string) => {
    setCuenta(label);
    setNameSource("table");
  };

  // Área/Servicio siempre vienen de arriba. Si faltan, tomamos el primero disponible.
  const areaId =
    typeof defaultAreaId === "number"
      ? defaultAreaId
      : areas[0]
        ? Number(areas[0].id)
        : 0;
  const serviceId = selectedServiceId ?? 0;

  const areaName = areas.find((a) => a.id === areaId)?.name ?? "—";
  const serviceName =
    services.find((s) => Number(s.id) === Number(serviceId))?.name ?? "—";

  useEffect(() => {
    if (!visible) return;
    if (!hasServices) {
      setSelectedServiceId(null);
      return;
    }

    const defaultId =
      typeof defaultServiceId === "number"
        ? defaultServiceId
        : services[0]
          ? Number(services[0].id)
          : null;

    setSelectedServiceId((prev) => {
      if (!prev) return defaultId;
      const exists = services.some((s) => Number(s.id) === Number(prev));
      return exists ? prev : defaultId;
    });
  }, [visible, hasServices, services, defaultServiceId]);

  // ✅ Cargar mesas por área cuando abre el modal o cambia el área
  useEffect(() => {
    if (!visible) return;
    if (!areaId) {
      setTables([]);
      setSelectedTableId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setTablesLoading(true);
        const res = await apiOrder.get("/commander/tables", {
          params: { areaId },
        });

        const raw = res?.data;
        const list: TableRow[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

        if (!cancelled) {
          setTables(list);
          // Si el área tiene mesas, dejamos default "Sin mesa" (null) hasta que el usuario elija
          setSelectedTableId(null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setTables([]);
          setSelectedTableId(null);
        }
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, areaId]);

  const avanzar = () => setStep((s) => Math.min(s + 1, 2));
  const retroceder = () => setStep((s) => Math.max(s - 1, 0));

  const limpiar = () => {
    setCuenta("");
    setPersonas("");
    setSelectedTableId(null);
    setNameSource(null);
    setStep(0);
  };

  const registrar = async () => {
    // Validaciones mínimas
    const hasSelectedTable = selectedTableId !== null;
    if (!hasSelectedTable && !cuenta?.trim()) {
      message.warning("Escribe el nombre de mesa/alias");
      return;
    }
    if (!/^\d+$/.test(personas)) {
      message.warning("Número de personas inválido");
      return;
    }
    if (!areaId) {
      message.error("Área no configurada.");
      return;
    }
    if (!serviceId) {
      if (!hasServices) {
        message.error("No hay servicios configurados. Crea uno en Admin.");
      } else {
        message.warning("Selecciona un servicio para abrir la mesa.");
      }
      return;
    }

    // waiterId y shiftId desde sessionStorage (igual que antes)
    type KioskUser = { id?: number | string; fullName?: string };
    function getWaiterIdFromSession(): number {
      const raw = sessionStorage.getItem("kiosk_user_json");
      if (!raw) return 0;
      try {
        const user: KioskUser = JSON.parse(raw);
        const id =
          typeof user?.id === "number" ? user.id : Number(user?.id ?? NaN);
        return Number.isFinite(id) ? id : 0;
      } catch {
        return 0;
      }
    }
    const waiterId = getWaiterIdFromSession();
    const shiftId = Number(sessionStorage.getItem("kiosk_shift_id") || "0");
    if (!shiftId) {
      message.error("No hay turno abierto; no se puede crear la orden.");
      return;
    }

    try {
      const { data } = await apiOrder.post("/orders", {
        tableId: selectedTableId ?? null, // ✅ NUEVO
        tableName: cuenta.trim(),
        persons: Number(personas),
        areaId: areaId,
        serviceId: serviceId,
        waiterId,
        shiftId,
      });

      if (data?.id) {
        onRegistrar({
          shiftId: data.shiftId,
          id: data.id,
          tableId: data.tableId ?? selectedTableId ?? null, // ✅ NUEVO
          tableName: data.tableName,
          persons: data.persons,
          area_id: data.areaId ?? null,
          service_id: data.serviceId ?? null,
          area: data.area,
          service: data.service,
          items: [],
        });

        onClose();
        limpiar();
        message.success("Mesa registrada");
      } else {
        message.error("No se pudo crear la orden");
      }
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear la orden");
    }
  };

  // ----- Vistas de pasos -----
  const PasoNombre = (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">Nombre de la mesa:</p>
        <Button
          size="small"
          onClick={() => {
            setCuenta("");
            setNameSource(null);
            setSelectedTableId(null);
            setStep(2);
          }}
        >
          Elegir mesa en mapa
        </Button>
      </div>
      <TecladoVirtual
        onKeyPress={(v) => setCuentaManual((prev) => prev + v)}
        onBackspace={() => setCuentaManual((prev) => prev.slice(0, -1))}
        onSpace={() => setCuentaManual((prev) => prev + " ")}
        onClear={() => setCuentaManual("")}
        text={cuenta}
        setTexto={setCuentaManual}
      />
    </div>
  );

  const PasoPersonas = (
    <div>
      <p className="mb-2 font-semibold">Número de personas:</p>
      <TecladoVirtual
        text={personas}
        setTexto={setPersonas}
        onKeyPress={(v) => {
          if (/\d/.test(v)) setPersonas((prev) => prev + v);
        }}
        onBackspace={() => setPersonas((prev) => prev.slice(0, -1))}
        onSpace={() => {}}
        onClear={() => setPersonas("")}
      />
    </div>
  );

  const PasoResumen = (
    <div className="grid gap-4">
      {/* Editables en línea */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ✅ Mesa física (opcional) - solo si hay mesas en esta área */}
        <div className="p-3 rounded border bg-white md:col-span-2">
          <div className="text-xs text-gray-500 mb-1">Mesa (opcional)</div>

          {tablesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Spin size="small" /> Cargando mesas…
            </div>
          ) : hasTables ? (
            <Select
              size="large"
              className="w-full"
              value={
                selectedTableId === null ? "none" : String(selectedTableId)
              }
              onChange={(v) => {
                if (v === "none") {
                  setSelectedTableId(null);
                  if (nameSource === "table") {
                    setCuenta("");
                    setNameSource(null);
                  }
                  return;
                }
                const id = Number(v);
                const nextId = Number.isFinite(id) ? id : null;
                setSelectedTableId(nextId);
                if (nextId !== null) {
                  const t = tables.find((row) => Number(row.id) === nextId);
                  if (t) {
                    setCuentaFromTable(getTableLabel(t));
                    if (!personas.trim() && t.seats) {
                      setPersonas(String(t.seats));
                    }
                  }
                }
              }}
              options={[
                { value: "none", label: "Sin mesa de area asignada" },
                ...tables.map((t) => ({
                  value: String(t.id),
                  label: `${getTableLabel(t)} (${String(
                    t.status || "unknown"
                  ).toLowerCase()})`,
                  disabled: String(t.status || "")
                    .toLowerCase()
                    .trim() !== "free",
                })),
              ]}
            />
          ) : (
            <div className="text-sm text-gray-500">
              No hay mesas registradas para esta área.
            </div>
          )}
        </div>

        <div className="p-3 rounded border bg-white">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Mesa en mapa</div>
            {hasManualName ? (
              <span className="text-xs text-gray-400">
                Mapa oculto por nombre manual
              </span>
            ) : null}
          </div>
          {showMap ? (
            <div className="mt-3">
              <MesaMapPicker
                areaId={areaId || null}
                selectedTableId={selectedTableId}
                onSelect={(table) => {
                  setSelectedTableId(table.id);
                  setCuentaFromTable(getTableLabel(table));
                  if (
                    (!personas.trim() ||
                      (selectedTable?.seats &&
                        personas.trim() === String(selectedTable.seats))) &&
                    table.seats
                  ) {
                    setPersonas(String(table.seats));
                  }
                }}
                showGrid={false}
                minStage={{ width: 280, height: 220 }}
                refreshKey={tablesRefreshKey}
              />
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-500">
              Mapa oculto porque escribiste el nombre de la mesa.
            </div>
          )}
        </div>

        <div className="p-3 rounded border bg-white">
          <div className="text-xs text-gray-500 mb-1">Servicio</div>
          {hasServices ? (
            <Select
              size="large"
              className="w-full"
              value={selectedServiceId ?? undefined}
              onChange={(v) => {
                const id = Number(v);
                setSelectedServiceId(Number.isFinite(id) ? id : null);
              }}
              options={services.map((s) => ({
                value: Number(s.id),
                label: s.name || `Servicio #${s.id}`,
              }))}
            />
          ) : (
            <div className="text-sm text-red-500">
              No hay servicios configurados.
            </div>
          )}
        </div>
        <div className="p-3 rounded border bg-white">
          <div className="text-xs text-gray-500 mb-1">Nombre de la mesa</div>
          <Input
            value={cuenta}
            onChange={(e) => setCuentaManual(e.target.value)}
            size="large"
          />
        </div>
        <div className="p-3 rounded border bg-white">
          <div className="text-xs text-gray-500 mb-1">Personas</div>
          <InputNumber
            value={Number(personas || 0)}
            min={0}
            onChange={(v) => setPersonas(String(v ?? ""))}
            size="large"
            className="w-full"
          />
        </div>
      </div>

      {/* Área/Servicio fijos (solo lectura) */}
      <div className="p-4 rounded border bg-white">
        <div className="font-semibold mb-2">Resumen</div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Tag color="blue">Área: {areaName}</Tag>
          <Tag color="geekblue">Servicio: {serviceName}</Tag>
          <Tag color="volcano">
            Mesa física:{" "}
            {selectedTable ? getTableLabel(selectedTable) : "Sin mesa"}
          </Tag>
          <Tag color="cyan">Nombre/alias: {cuenta || "—"}</Tag>
          <Tag color="purple">Personas: {personas || "—"}</Tag>
        </div>

        {/* Acciones rápidas (espacios reservados) */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled>Agregar cliente</Button>
          <Button disabled>Notas</Button>
          <Button disabled>Etiquetas</Button>
        </div>
      </div>
    </div>
  );

  const renderPaso = () => {
    if (step === 0) return PasoNombre;
    if (step === 1) return PasoPersonas;
    return PasoResumen;
  };

  return (
    <Modal
      open={visible}
      onCancel={() => {
        onClose();
        limpiar();
      }}
      footer={[
        step > 0 && (
          <Button key="back" onClick={retroceder}>
            Atrás
          </Button>
        ),
        step < 2 && (
          <Button key="next" type="primary" onClick={avanzar}>
            Siguiente
          </Button>
        ),
        step === 2 && (
          <Button key="submit" type="primary" onClick={registrar}>
            Registrar
          </Button>
        ),
      ]}
      title="Abrir mesa"
      width={800}
    >
      <Steps current={step} size="small" className="mb-4">
        <Step title="Nombre" />
        <Step title="Personas" />
        <Step title="Resumen" />
      </Steps>

      {renderPaso()}
    </Modal>
  );
};

export default RegistroChequeModal;
