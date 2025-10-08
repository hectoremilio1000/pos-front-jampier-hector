// src/components/RegistroMesaModal.tsx
import React, { useState } from "react";
import { Modal, Button, Select, Steps, message } from "antd";
import TecladoVirtual from "./TecladoVirtual";
import apiOrder from "./apis/apiOrder";
interface Area {
  id: number | null;
  restaurantId: number;
  name: string;
  sortOrder: number;
}
type Grupo = {
  id: number;
  name: string;
  isEnabled: boolean;
};
type ModifierGroups = {
  id: number;
  code: string;
  name: string;
  modifiers: Modifiers[];
};
type Modifiers = {
  id: number;
  isInabled: boolean;
  modifierGroupId: number;
  modifierId: number;
  priceDelta: number;
  productId: number;
  modifier: Producto;
};
type ProductModifierGroups = {
  productId: number;
  modifierGroupId: number;
  includedQty: number;
  maxQty: number;
  isForced: boolean;
  captureIncluded: boolean;
  priority: number;
  modifierGroup: ModifierGroups;
};
type AreaImpresion = {
  id: number;
  restaurantId: number;
  name: string;
};
type Producto = {
  id: number;
  name: string;
  group: Grupo;
  subgrupo?: string;
  categoria: "alimentos" | "bebidas" | "otros";
  unidad: string;
  basePrice: number;
  contieneIVA: boolean;
  printArea: number;
  areaImpresion: AreaImpresion;
  suspendido: boolean;
  isEnabled: boolean;
  modifierGroups: ModifierGroups[];
  modifiers: Modifiers[];
  productModifierGroups: ProductModifierGroups[];
};
type Mitad = 0 | 1 | 2 | 3;
interface OrderItem {
  orderId: number | null;
  productId: number;
  qty: number;
  unitPrice: number;
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
  // NUEVOS CAMPOS:
  compositeProductId: number | null; // id del producto principal al que pertenece el item
  isModifier: boolean; // true si es una línea de modifier
  isCompositeProductMain: boolean; // true si es la línea principal del compuesto
  half: Mitad; // 0/1/2/3 (ver arriba)
  route_area_id: number;
}
type Props = {
  visible: boolean;
  onClose: () => void;
  onRegistrar: (cheque: {
    shiftId: number | null; // ⬅️ nuevo
    id: number; // ⬅️ nuevo
    tableName: string;
    persons: number;
    area_id: number | null;
    area: Area;
    items: OrderItem[];
  }) => void;

  areas: Area[];
};

const { Step } = Steps;
const { Option } = Select;

const RegistroChequeModal: React.FC<Props> = ({
  visible,
  onClose,
  onRegistrar,
  areas,
}) => {
  console.log(areas);
  const [step, setStep] = useState(0);
  const [cuenta, setCuenta] = useState("");
  const [personas, setPersonas] = useState("");
  const [area, setArea] = useState(null);

  const avanzar = () => setStep((s) => s + 1);
  const retroceder = () => setStep((s) => s - 1);

  const limpiar = () => {
    setCuenta("");
    setPersonas("");
    setArea(null);
  };

  // onRegistrar ahora es async
  const registrar = async () => {
    // Validaciones mínimas para alias
    if (!cuenta?.trim()) {
      message.warning("Escribe el nombre de mesa/alias");
      return;
    }
    if (!area) {
      message.warning("Selecciona un área");
      return;
    }
    if (!/^\d+$/.test(personas)) {
      message.warning("Número de personas inválido");
      return;
    }

    try {
      const { data } = await apiOrder.post("/orders", {
        tableName: cuenta.trim(), // alias
        persons: Number(personas),
        areaId: area, // requerido por alias
        service: "DINING",
      });

      if (data?.id) {
        onRegistrar({
          shiftId: null,
          id: data.id,
          tableName: data.tableName,
          persons: data.persons,
          area_id: data.areaId ?? null,
          area: data.area, // ya lo devuelve con { id, name }
          items: [],
        });
        onClose();
        limpiar();
        setStep(0);
        message.success("Mesa registrada");
      } else {
        message.error("No se pudo crear la orden");
      }
    } catch (e) {
      console.error(e);
      message.error("No se pudo crear la orden");
    }
  };

  const renderPaso = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <p className="mb-2 font-semibold">Nombre de la mesa:</p>
            {/* <Input value={cuenta} readOnly className="mb-4 text-lg" /> */}
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
      case 1:
        return (
          <div>
            <p className="mb-2 font-semibold">Número de personas:</p>
            {/* <Input value={personas} readOnly className="mb-4 text-lg" /> */}
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
      case 2:
        return (
          <div className="flex flex-col gap-4">
            <p className="font-semibold">Área:</p>
            <Select value={area} onChange={setArea}>
              {areas.map((a, index) => {
                return (
                  <Option key={index} value={a.id}>
                    {a.name}
                  </Option>
                );
              })}
            </Select>
            <div className="mt-4 p-4 border rounded bg-white shadow">
              <p className="font-semibold">Resumen:</p>
              <p>
                <strong>Cuenta:</strong> {cuenta}
              </p>
              <p>
                <strong>Personas:</strong> {personas}
              </p>
              <p>
                <strong>Área:</strong> {area}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={() => {
        onClose();
        setStep(0);
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
      title="Registro de Mesa"
      width={800}
    >
      <Steps current={step} size="small" className="mb-4">
        <Step title="Nombre" />
        <Step title="Personas" />
        <Step title="Área" />
      </Steps>
      {renderPaso()}
    </Modal>
  );
};

export default RegistroChequeModal;
