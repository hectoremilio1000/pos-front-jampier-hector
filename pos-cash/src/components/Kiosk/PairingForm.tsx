// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-cash/src/components/Kiosk/PairingForm.tsx

import { type FC, useEffect, useMemo, useState } from "react";
import { AutoComplete, Button, Input, Select, message } from "antd";
import apiKiosk from "@/components/apis/apiKiosk"; // 👈 usar igual que en Comandero (default)
import { kioskPairStart } from "@/components/Kiosk/token"; // 👈 usar la misma función

type ExistingDev = {
  id: number;
  device_name: string;
  device_type: "cash" | "commander" | "monitor";
  revoked_at?: string | null;
  in_use?: boolean;
};

type Station = { id: number; code: string; name: string; mode: string };

type Props = {
  code: string;
  deviceName: string;
  loading: boolean;
  // selectedDeviceId: number | null;

  onCodeChange: (v: string) => void;
  onDeviceNameChange: (v: string) => void;
  onSelectDeviceId: (id: number | null, name?: string) => void;

  /** Se invoca cuando ya hay estación seleccionada */
  onConfirm: (stationId: number, stationCode: string) => void;

  onCodeFocus?: () => void; // para activar keypad en "pair"
};

const PairingForm: FC<Props> = ({
  code,
  deviceName,
  loading,
  // selectedDeviceId,
  onCodeChange,
  onDeviceNameChange,
  onSelectDeviceId,
  onConfirm,
  onCodeFocus,
}) => {
  const [existing, setExisting] = useState<ExistingDev[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(code);

  // sincroniza query con code
  useEffect(() => setQ(code), [code]);

  // cargar dispositivos existentes por pairing code + type=cash
  useEffect(() => {
    if (!q.trim()) {
      setExisting([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await apiKiosk.get(
          `/kiosk/devices/by-code/${encodeURIComponent(q.trim())}`,
          { params: { type: "cash" } }
        );
        const rows: ExistingDev[] = r.data || [];
        setExisting(rows);
        setOpen(rows.length > 0);
      } catch {
        setExisting([]);
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const options = useMemo(
    () =>
      existing.map((d) => ({
        value: `existing:${d.id}`,
        disabled: !!d.in_use, // bloquea si está en uso en otro equipo
        label: (
          <div className="flex items-center justify-between">
            <span>
              #{d.id} · {d.device_name || "(Sin nombre)"}
            </span>
            <span
              style={{
                fontSize: 12,
                color: d.in_use
                  ? "#b91c1c"
                  : d.revoked_at
                    ? "#b45309"
                    : "#64748b",
              }}
              title={
                d.in_use
                  ? "Este dispositivo ya está emparejado en otro equipo"
                  : d.revoked_at
                    ? "Este dispositivo está revocado; al adoptarlo se restaurará"
                    : ""
              }
            >
              {d.in_use ? "[En uso]" : d.revoked_at ? "[Revocado]" : ""}
            </span>
          </div>
        ),
      })),
    [existing]
  );

  async function handleEmparejar() {
    // 1) Si aún no trajimos estaciones, valida el code y tráelas
    if (!stations.length) {
      if (!code.trim()) return message.warning("Ingresa el pairing code");
      try {
        // 👇 usamos la MISMA API que Comandero, con deviceType="cash"
        const start = await kioskPairStart(code.trim(), "cash");
        if (!start.requireStation) {
          // para cash esperamos requireStation === true
          message.error("Caja requiere seleccionar estación");
          return;
        }
        setStations(start.stations || []);
        message.success(
          "Código válido. Selecciona estación y vuelve a Emparejar."
        );
        return; // siguiente click empareja
      } catch (e) {
        console.error(e);
        return message.error("No se pudo validar el código");
      }
    }
    // 2) Emparejar (requiere estación ya elegida)
    if (!stationId) return message.warning("Selecciona estación");
    const st = stations.find((s) => s.id === stationId);
    const stationCode = st?.code ?? "";
    onConfirm(stationId, stationCode);
  }

  return (
    <>
      <div className="text-sm font-semibold">Pairing code</div>
      <Input
        placeholder="031180"
        value={code}
        onFocus={onCodeFocus}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        onChange={(e) =>
          onCodeChange(e.target.value.replace(/\D/g, "").slice(0, 6))
        }
        onPressEnter={handleEmparejar}
      />

      <div className="text-sm font-semibold mt-3">Nombre del dispositivo</div>
      <AutoComplete
        open={open}
        value={deviceName}
        placeholder="Escribe un nombre o elige uno existente"
        style={{ width: "100%" }}
        options={options}
        onFocus={() => setOpen(existing.length > 0)}
        onBlur={() => setOpen(false)}
        onSearch={(text) => {
          onDeviceNameChange(text);
          onSelectDeviceId(null);
          setOpen(existing.length > 0);
        }}
        onChange={(text) => {
          onDeviceNameChange(text);
          onSelectDeviceId(null);
        }}
        onSelect={(val) => {
          if (typeof val === "string" && val.startsWith("existing:")) {
            const id = Number(val.split(":")[1]);
            const found = existing.find((d) => d.id === id);
            onSelectDeviceId(id, found?.device_name);
            if (found?.device_name) onDeviceNameChange(found.device_name);
          }
        }}
      />

      {/* Estaciones (aparecen tras validar pairing code) */}
      {stations.length > 0 && (
        <>
          <div className="text-sm font-semibold mt-3">Estación</div>
          <Select
            className="w-full"
            placeholder="Selecciona estación"
            value={stationId ?? undefined}
            onChange={(v) => setStationId(v)}
            options={stations.map((s) => ({
              value: s.id,
              label: `${s.code} — ${s.name}`,
            }))}
          />
        </>
      )}

      <Button
        type="primary"
        block
        loading={loading}
        onClick={handleEmparejar}
        className="mt-2"
      >
        Emparejar
      </Button>
    </>
  );
};

export default PairingForm;
