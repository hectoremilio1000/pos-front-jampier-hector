// src/components/RegistroMesaModal.tsx
import React, { useState } from "react";
import { Modal, Button, Input, Select, Steps } from "antd";
import TecladoVirtual from "./TecladoVirtual";

type Props = {
  visible: boolean;
  onClose: () => void;
  onRegistrar: (cheque: {
    cuenta: string;
    personas: number;
    area: string;
  }) => void;
};

const { Step } = Steps;
const { Option } = Select;

const RegistroChequeModal: React.FC<Props> = ({
  visible,
  onClose,
  onRegistrar,
}) => {
  const [step, setStep] = useState(0);
  const [cuenta, setCuenta] = useState("");
  const [mesa, setMesa] = useState(null);
  const [personas, setPersonas] = useState("");
  const [area, setArea] = useState("Comedor");
  const [fecha_inicio, setFecha_inicio] = useState(null);
  const [fecha_cierre, setFecha_cierre] = useState(null);
  const [mesero_id, setMesero_id] = useState(null);

  const avanzar = () => setStep((s) => s + 1);
  const retroceder = () => setStep((s) => s - 1);

  const limpiar = () => {
    setCuenta("");
    setPersonas("");
    setArea("Comedor");
  };

  const registrar = () => {
    onRegistrar({ cuenta, personas: Number(personas), area });
    limpiar();
    setStep(0);
  };

  const renderPaso = () => {
    switch (step) {
      case 0:
        return (
          <div>
            <p className="mb-2 font-semibold">Nombre de la mesa:</p>
            <Input value={cuenta} readOnly className="mb-4 text-lg" />
            <TecladoVirtual
              onKeyPress={(v) => setCuenta((prev) => prev + v)}
              onBackspace={() => setCuenta((prev) => prev.slice(0, -1))}
              onSpace={() => setCuenta((prev) => prev + " ")}
              onClear={() => setCuenta("")}
            />
          </div>
        );
      case 1:
        return (
          <div>
            <p className="mb-2 font-semibold">Número de personas:</p>
            <Input value={personas} readOnly className="mb-4 text-lg" />
            <TecladoVirtual
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
              <Option value="Comedor">Comedor</Option>
              <Option value="1er Piso">1er Piso</Option>
              <Option value="Terraza">Terraza</Option>
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
