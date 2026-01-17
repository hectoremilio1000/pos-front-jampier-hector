import { useEffect, useState } from "react";
import { Card, TimePicker, Button, message, Spin, Select, Switch } from "antd";
import dayjs, { Dayjs } from "dayjs";
import apiCash from "@/components/apis/apiCash";
import { useAuth } from "@/components/Auth/AuthContext";

type PrintMode = "local" | "cloud" | "hybrid";
type ReceiptDelivery = "qr" | "email" | "whatsapp" | "none";

interface SettingDTO {
  restaurantId: number;
  fiscalCutHour: string; // 'HH:mm'
  printMode?: PrintMode;
  confirmPrint?: boolean;
  receiptDelivery?: ReceiptDelivery;
}

export default function FiscalCutSettings() {
  const { user } = useAuth();
  // TS: puede ser null/undefined → lo modelamos explícitamente
  const restaurantId: number | null = user?.restaurant?.id ?? null;

  const [value, setValue] = useState<Dayjs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>("hybrid");
  const [receiptDelivery, setReceiptDelivery] =
    useState<ReceiptDelivery>("qr");
  const [confirmPrint, setConfirmPrint] = useState(true);

  /* fetch current value */
  const load = async () => {
    if (!restaurantId) {
      setValue(null);
      setIsConfigured(null);
      return; // sin restaurante, no consultamos
    }
    setLoading(true);
    try {
      const { data } = await apiCash.get<SettingDTO>(
        `/settings/${restaurantId}`
      );
      if (data?.fiscalCutHour) {
        setValue(dayjs(data.fiscalCutHour, "HH:mm"));
        setIsConfigured(true);
      } else {
        setValue(null);
        setIsConfigured(false);
      }
      setPrintMode((data?.printMode as PrintMode) ?? "hybrid");
      setReceiptDelivery(
        (data?.receiptDelivery as ReceiptDelivery) ?? "qr"
      );
      setConfirmPrint(
        data?.confirmPrint === undefined ? true : Boolean(data.confirmPrint)
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setValue(null);
        setIsConfigured(false);
      } else {
        setValue(null);
        setIsConfigured(null);
      }
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

    setSaving(true);
    try {
      await apiCash.post("/settings", {
        restaurantId,
        fiscalCutHour: value ? value.format("HH:mm") : undefined,
        printMode,
        confirmPrint,
        receiptDelivery,
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
            <div>
              <TimePicker
                value={value}
                onChange={(t) => setValue(t)}
                format="HH:mm"
                minuteStep={5}
                allowClear={false}
                placeholder="Sin configurar"
              />
              {isConfigured === false && (
                <div className="mt-1 text-xs text-slate-500">
                  Sin configurar. Sugerido: 05:00.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-slate-500 mb-1">Modo de impresión</div>
              <Select
                value={printMode}
                onChange={(v) => setPrintMode(v as PrintMode)}
                className="w-full"
                options={[
                  { label: "Local", value: "local" },
                  { label: "Nube", value: "cloud" },
                  { label: "Híbrido", value: "hybrid" },
                ]}
              />
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-1">
                Entrega de recibo
              </div>
              <Select
                value={receiptDelivery}
                onChange={(v) => setReceiptDelivery(v as ReceiptDelivery)}
                className="w-full"
                options={[
                  { label: "QR", value: "qr" },
                  { label: "Email", value: "email" },
                  { label: "WhatsApp", value: "whatsapp" },
                  { label: "Ninguno", value: "none" },
                ]}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={confirmPrint} onChange={setConfirmPrint} />
              <span className="text-sm text-slate-700">
                Confirmar impresión
              </span>
            </div>
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
