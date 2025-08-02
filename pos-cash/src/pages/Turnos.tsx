import { useEffect, useState } from "react";
import {
  Card,
  Select,
  Button,
  Spin,
  InputNumber,
  Alert,
  message,
  Modal,
} from "antd";
import { useAuth } from "@/components/Auth/AuthContext";
import { useShift } from "@/components/Shift/ShiftContext";
import apiCash from "@/components/apis/apiCash";

/* ── DTOs ───────────────────────────────────────────── */
interface CashierDTO {
  id: number;
  fullName: string;
}

interface StationDTO {
  id: number;
  code: string;
  name: string;
  mode: "MASTER" | "DEPENDENT";
  openingRequired: boolean;
  users: CashierDTO[];
}

interface ShiftDTO {
  id: number;
  openedAt: string;
}

/* ── Página Turnos ─────────────────────────────────── */
export default function Turnos() {
  const { user } = useAuth();
  const { shiftId, setShiftId } = useShift();

  const restaurantId = user?.restaurant?.id;
  const userId = user?.id;

  /* estaciones asignadas */
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [station, setStation] = useState<StationDTO | null>(null);

  /* turno actual */
  const [shift, setShift] = useState<ShiftDTO | null>(null);
  const [loadingShift, setLoadingShift] = useState(false);

  /* fondo inicial */
  const [openingCash, setOpeningCash] = useState(0);

  /* ── helpers ─────────────────────────────────────── */

  /** estaciones que tiene el cajero */
  const fetchStations = async () => {
    if (!restaurantId || !userId) return;
    const { data } = await apiCash.get<StationDTO[]>("/stations", {
      params: { restaurantId, userId },
    });
    setStations(data);

    /* si solo hay una, la auto‑selecciona */
    if (data.length === 1) setStation(data[0]);
  };

  /** turno abierto (si existe) */
  const fetchCurrentShift = async (s: StationDTO) => {
    setLoadingShift(true);
    try {
      const { data } = await apiCash.get<ShiftDTO | null>("/shifts/current", {
        params: { restaurantId, stationCode: s.code },
      });
      if (data?.id) {
        setShift(data);
        setShiftId(data.id);
      } else {
        setShift(null);
        setShiftId(null);
      }
    } finally {
      setLoadingShift(false);
    }
  };

  /** abrir turno (MASTER) */
  const openShift = async () => {
    try {
      const { data } = await apiCash.post<ShiftDTO>("/shifts/open", {
        restaurantId,
        stationCode: station!.code,
        openingCash,
      });
      setShift(data);
      setShiftId(data.id);
      message.success("Turno abierto");
    } catch {
      message.error("No se pudo abrir turno");
    }
  };

  /** cerrar turno (MASTER) */
  const closeShift = async () => {
    Modal.confirm({
      title: "¿Cerrar turno?",
      onOk: async () => {
        try {
          await apiCash.post(`/shifts/${shift!.id}/close`, {
            closingCash: openingCash,
            expectedCash: 0,
            difference: 0,
          });
          setShift(null);
          setShiftId(null);
          message.success("Turno cerrado");
        } catch {
          message.error("Error al cerrar turno");
        }
      },
    });
  };

  /* ── efectos ─────────────────────────────────────── */
  useEffect(() => {
    fetchStations();
  }, [restaurantId, userId]);

  useEffect(() => {
    if (station) fetchCurrentShift(station);
  }, [station]);

  /* ── vistas condicionales ────────────────────────── */

  /* A) NO tiene ninguna estación asignada */
  if (!stations.length)
    return (
      <Alert
        message="Sin estación asignada"
        description="Este usuario no tiene ninguna caja asignada. Solicite a un administrador que lo asigne para poder operar."
        type="warning"
        showIcon
        className="max-w-md mx-auto mt-10"
      />
    );

  /* B) Debe elegir estación (tiene >1) */
  if (!station)
    return (
      <Card title="Selecciona tu estación" className="max-w-md mx-auto mt-8">
        <Select
          className="w-full"
          placeholder="Caja…"
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.code} • ${s.name}`,
          }))}
          onChange={(id) =>
            setStation(stations.find((s) => s.id === id) || null)
          }
        />
      </Card>
    );

  /* C) Carga de turno */
  if (loadingShift) return <Spin className="block mx-auto mt-10" />;

  /* ── Render principal ───────────────────────────── */
  return (
    <Card
      title={
        <span className="font-semibold">
          {station.code} – {station.name}{" "}
          <span className="text-sm text-gray-500">({station.mode})</span>
        </span>
      }
      className="max-w-lg mx-auto mt-6"
    >
      {/* banner cajero */}
      <Alert
        type="info"
        showIcon
        message={
          station.users.length
            ? `Cajero asignado: ${station.users[0].fullName}`
            : "Sin cajero asignado"
        }
        className="mb-4"
      />

      {/* turno abierto */}
      {shift ? (
        <>
          <p>
            Turno abierto desde:{" "}
            {new Date(shift.openedAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {station.mode === "MASTER" && (
            <Button danger onClick={closeShift} className="mt-4">
              Cerrar turno
            </Button>
          )}
        </>
      ) : station.mode === "MASTER" ? (
        <>
          <Alert
            type="warning"
            message="No hay turno abierto"
            showIcon
            className="mb-4"
          />

          {station.openingRequired && (
            <div className="flex items-center gap-3 mb-4">
              <span>Fondo inicial:</span>
              <InputNumber
                min={0}
                step={1}
                value={openingCash}
                onChange={(v) => setOpeningCash(Number(v))}
                prefix="$"
              />
            </div>
          )}

          <Button type="primary" onClick={openShift}>
            Abrir turno
          </Button>
        </>
      ) : (
        <Alert
          type="warning"
          showIcon
          message="Esperando a que la caja maestra abra turno…"
        />
      )}
    </Card>
  );
}
