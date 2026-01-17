// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/comandero/src/components/Kiosk/PairingForm.tsx

import { useEffect, useMemo, useState, type FC } from "react";
import { AutoComplete, Button, Input, message } from "antd";
import apiKiosk from "@/components/apis/apiKiosk";

type ExistingDev = {
  id: number;
  device_name: string;
  device_type: "commander" | "cash" | "monitor";
  revoked_at?: string | null;
  in_use?: boolean;
};

type Props = {
  code: string;
  deviceName: string;
  loading: boolean;
  // selectedDeviceId: number | null;
  deviceType: "commander" | "cash" | "monitor"; // 👈 filtra por tipo
  onCodeChange: (v: string) => void;
  onDeviceNameChange: (v: string) => void;
  onSelectDeviceId: (id: number | null, name?: string) => void;
  onPair: () => void;
  onCodeFocus?: () => void;
};

const PairingForm: FC<Props> = ({
  code,
  deviceName,
  loading,
  // selectedDeviceId,
  deviceType,
  onCodeChange,
  onDeviceNameChange,
  onSelectDeviceId,
  onPair,
  onCodeFocus,
}) => {
  const [existing, setExisting] = useState<ExistingDev[]>([]);
  const [q, setQ] = useState(code);
  const [open, setOpen] = useState(false); // 👈 fuerza dropdown

  // sincroniza el query con el code
  useEffect(() => setQ(code), [code]);

  // carga lista por código + tipo (restaurant detectado por pairing code)
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
          { params: { type: deviceType } }
        );
        const rows: ExistingDev[] = r.data || [];
        setExisting(rows);
        setOpen(rows.length > 0); // abre cuando hay resultados
      } catch {
        setExisting([]);
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, deviceType]);

  const options = useMemo(
    () =>
      existing.map((d) => ({
        value: `existing:${d.id}`,
        disabled: !!d.in_use, // bloquea si está en uso
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
        onPressEnter={onPair}
      />

      <div className="text-sm font-semibold mt-3">Nombre del dispositivo</div>
      <AutoComplete
        open={open} // 👈 muestra lista cuando haya
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

      <Button
        type="primary"
        block
        loading={loading}
        onClick={() => {
          if (!code.trim()) return message.warning("Ingresa el pairing code");
          onPair();
        }}
        className="mt-2"
      >
        Emparejar
      </Button>
    </>
  );
};

export default PairingForm;
