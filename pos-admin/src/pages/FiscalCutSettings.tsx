import { useEffect, useState } from "react";
import { Card, TimePicker, Button, message, Spin } from "antd";
import dayjs, { Dayjs } from "dayjs";
import apiCash from "@/components/apis/apiCash";
import { useAuth } from "@/components/Auth/AuthContext";

interface SettingDTO {
  restaurantId: number;
  fiscalCutHour: string; // 'HH:mm'
}

export default function FiscalCutSettings() {
  const { user } = useAuth();
  // TS: puede ser null/undefined → lo modelamos explícitamente
  const restaurantId: number | null = user?.restaurant?.id ?? null;

  const [value, setValue] = useState<Dayjs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* fetch current value */
  const load = async () => {
    if (!restaurantId) return; // sin restaurante, no consultamos
    setLoading(true);
    try {
      const { data } = await apiCash.get<SettingDTO>(
        `/settings/${restaurantId}`
      );
      setValue(dayjs(data.fiscalCutHour, "HH:mm"));
    } catch {
      setValue(dayjs("05:00", "HH:mm")); // opcional: valor por defecto
    } finally {
      setLoading(false);
    }
  };

  /* save */
  const save = async () => {
    if (!restaurantId) {
      message.error("Selecciona un restaurante antes de guardar");
      return;
    }
    if (!value) return;

    setSaving(true);
    try {
      await apiCash.post("/settings", {
        restaurantId,
        fiscalCutHour: value.format("HH:mm"),
      });
      message.success("Hora de corte guardada");
    } catch {
      message.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, [restaurantId]);

  return (
    <Card title="Configuración de corte Z" className="max-w-md mx-auto mt-8">
      {loading ? (
        <Spin />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <span>Hora fiscal:</span>
            <TimePicker
              value={value}
              onChange={(t) => setValue(t)}
              format="HH:mm"
              minuteStep={5}
              allowClear={false}
            />
          </div>

          <div className="text-right mt-6">
            <Button
              type="primary"
              onClick={save}
              loading={saving}
              disabled={!value}
            >
              Guardar
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
