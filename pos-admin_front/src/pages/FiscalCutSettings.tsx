import { useEffect, useRef, useState } from "react";
import {
  Card,
  TimePicker,
  Button,
  message,
  Spin,
  Select,
  Switch,
  Divider,
  Modal,
  Steps,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import apiCash from "@/components/apis/apiCash";
import { useAuth } from "@/components/Auth/AuthContext";
import FolioSeriesManager from "./FoliosSeries/FolioSeriesManager";

type PrintMode = "qr" | "impresion" | "mixto";
type ReceiptDelivery = "email";

function normalizePrintMode(raw?: string | null): PrintMode {
  const v = String(raw || "").toLowerCase();
  if (v === "qr" || v === "impresion" || v === "mixto") return v as PrintMode;
  if (v === "cloud") return "qr";
  if (v === "local") return "impresion";
  if (v === "hybrid") return "mixto";
  return "mixto";
}

function normalizeReceiptDelivery(): ReceiptDelivery {
  return "email";
}

interface SettingDTO {
  restaurantId: number;
  fiscalCutHour: string; // 'HH:mm'
  printMode?: PrintMode;
  confirmPrint?: boolean;
  receiptDelivery?: ReceiptDelivery;
  createdAt?: string;
  updatedAt?: string;
}

export default function FiscalCutSettings() {
  const { user } = useAuth();
  // TS: puede ser null/undefined → lo modelamos explícitamente
  const restaurantId: number | null = user?.restaurant?.id ?? null;
  const generalRef = useRef<HTMLDivElement | null>(null);
  const foliosRef = useRef<HTMLDivElement | null>(null);

  const [value, setValue] = useState<Dayjs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [settingsSaved, setSettingsSaved] = useState<boolean | null>(null);
  const [hasFolios, setHasFolios] = useState<boolean | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>("mixto");
  const [receiptDelivery, setReceiptDelivery] =
    useState<ReceiptDelivery>("email");
  const [confirmPrint, setConfirmPrint] = useState(true);

  /* fetch current value */
  const load = async () => {
    if (!restaurantId) {
      setValue(null);
      setIsConfigured(null);
      setSettingsSaved(null);
      return; // sin restaurante, no consultamos
    }
    setLoading(true);
    try {
      const { data } = await apiCash.get<SettingDTO>(
        `/settings/${restaurantId}`
      );
      if (data?.fiscalCutHour) setValue(dayjs(data.fiscalCutHour, "HH:mm"));
      else setValue(null);

      const createdAt = data?.createdAt ?? null;
      const updatedAt = data?.updatedAt ?? null;
      const isFresh =
        createdAt && updatedAt ? String(createdAt) === String(updatedAt) : false;
      const configured = !isFresh;
      setSettingsSaved(configured);
      setIsConfigured(configured);

      setPrintMode(normalizePrintMode(data?.printMode));
      setReceiptDelivery(normalizeReceiptDelivery());
      setConfirmPrint(
        data?.confirmPrint === undefined ? true : Boolean(data.confirmPrint)
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setValue(null);
        setIsConfigured(false);
        setSettingsSaved(false);
      } else {
        setValue(null);
        setIsConfigured(null);
        setSettingsSaved(null);
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
      setSettingsSaved(true);
      setIsConfigured(true);
      message.success("Configuración guardada");
    } catch {
      message.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    load();
  }, [restaurantId]);

  const needsSetup =
    Boolean(restaurantId) &&
    (settingsSaved === false || hasFolios === false);

  const steps = [
    {
      key: "settings",
      title: "Corte Z e impresión",
      done: settingsSaved === true,
      content: (
        <div>
          <div className="text-sm text-slate-700">
            Define la hora de corte y revisa el modo de impresión. Después
            guarda la configuración.
          </div>
          <div className="mt-4 flex flex-wrap gap-8">
            <Button onClick={() => generalRef.current?.scrollIntoView({ behavior: "smooth" })}>
              Ir a Configuración general
            </Button>
            <Button
              type="primary"
              onClick={save}
              loading={saving}
              disabled={!value}
            >
              Guardar configuración
            </Button>
          </div>
          {!value && (
            <div className="mt-2 text-xs text-slate-500">
              Selecciona una hora de corte para continuar.
            </div>
          )}
        </div>
      ),
    },
    {
      key: "folios",
      title: "Folios de cuenta",
      done: hasFolios === true,
      content: (
        <div>
          <div className="text-sm text-slate-700">
            Crea al menos un folio para numerar cuentas e impresiones.
          </div>
          <div className="mt-4">
            <Button onClick={() => foliosRef.current?.scrollIntoView({ behavior: "smooth" })}>
              Ir a Folios de cuenta
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const currentStepIndex = Math.max(
    0,
    steps.findIndex((s) => !s.done)
  );

  return (
    <div style={{ padding: 16, display: "grid", gap: 16 }}>
      <Modal
        open={needsSetup}
        closable={false}
        footer={null}
        mask={false}
        width={640}
      >
        <div className="text-base font-semibold text-slate-800">
          Configuración inicial requerida
        </div>
        <div className="mt-1 text-sm text-slate-600">
          Completa estos pasos para dejar el sistema listo.
        </div>
        <div className="mt-4">
          <Steps
            current={currentStepIndex}
            items={steps.map((step, idx) => ({
              title: step.title,
              status: step.done
                ? "finish"
                : idx === currentStepIndex
                ? "process"
                : "wait",
            }))}
          />
        </div>
        <div className="mt-5">{steps[currentStepIndex]?.content}</div>
      </Modal>

      <div ref={generalRef}>
        <Card title="Configuración general">
        {loading ? (
          <Spin />
        ) : (
          <>
            <div>
              <div className="text-sm font-semibold text-slate-700">Corte Z</div>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-sm text-slate-600">Hora de corte:</span>
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
            </div>

            <Divider className="my-6" />

            <div>
              <div className="text-sm font-semibold text-slate-700">
                Impresión
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-slate-500 mb-1">
                    Modo de impresión
                  </div>
                  <Select
                    value={printMode}
                    onChange={(v) => setPrintMode(v as PrintMode)}
                    className="w-full"
                    options={[
                      { label: "QR", value: "qr" },
                      { label: "Impresión", value: "impresion" },
                      { label: "Mixto", value: "mixto" },
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
                    disabled
                    options={[
                      { label: "Email", value: "email" },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={confirmPrint} onChange={setConfirmPrint} />
                  <div>
                    <div className="text-sm text-slate-700">
                      Pedir confirmación antes de mandar a imprimir
                    </div>
                    <div className="text-xs text-slate-500">
                      Evita impresiones accidentales. Aplica a comandas y
                      cuentas.
                    </div>
                  </div>
                </div>
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
      </div>

      <div ref={foliosRef}>
        <Card title="Folios de cuenta">
          <FolioSeriesManager
            embedded
            onRowsChange={(rows) => setHasFolios(rows.length > 0)}
          />
        </Card>
      </div>
    </div>
  );
}
