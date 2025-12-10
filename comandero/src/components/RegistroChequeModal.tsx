import React, { useState } from "react";
import { Modal, Button, Steps, message, Input, InputNumber, Tag } from "antd";
import apiOrder from "@/components/apis/apiOrder";
import TecladoVirtual from "./TecladoVirtual";

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
}) => {
  // 0: Nombre, 1: Personas, 2: Resumen
  const [step, setStep] = useState(0);

  const [cuenta, setCuenta] = useState("");
  const [personas, setPersonas] = useState("");

  // Área/Servicio siempre vienen de arriba. Si faltan, tomamos el primero disponible.
  const areaId =
    typeof defaultAreaId === "number"
      ? defaultAreaId
      : areas[0]
        ? Number(areas[0].id)
        : 0;
  const serviceId =
    typeof defaultServiceId === "number"
      ? defaultServiceId
      : services[0]
        ? Number(services[0].id)
        : 0;

  const areaName = areas.find((a) => a.id === areaId)?.name ?? "—";
  const serviceName = services.find((s) => s.id === serviceId)?.name ?? "—";

  const avanzar = () => setStep((s) => Math.min(s + 1, 2));
  const retroceder = () => setStep((s) => Math.max(s - 1, 0));

  const limpiar = () => {
    setCuenta("");
    setPersonas("");
    setStep(0);
  };

  const registrar = async () => {
    // Validaciones mínimas
    if (!cuenta?.trim()) {
      message.warning("Escribe el nombre de mesa/alias");
      return;
    }
    if (!/^\d+$/.test(personas)) {
      message.warning("Número de personas inválido");
      return;
    }
    if (!areaId || !serviceId) {
      message.error("Área o Servicio no configurados.");
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
      <p className="mb-2 font-semibold">Nombre de la mesa:</p>
      <TecladoVirtual
        onKeyPress={(v) => setCuenta((prev) => prev + v)}
        onBackspace={() => setCuenta((prev) => prev.slice(0, -1))}
        onSpace={() => setCuenta((prev) => prev + " ")}
        onClear={() => setCuenta("")}
        text={cuenta}
        setTexto={setCuenta}
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
        <div className="p-3 rounded border bg-white">
          <div className="text-xs text-gray-500 mb-1">Nombre de la mesa</div>
          <Input
            value={cuenta}
            onChange={(e) => setCuenta(e.target.value)}
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
          <Tag color="cyan">Mesa: {cuenta || "—"}</Tag>
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
