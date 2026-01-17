import React, { useState } from "react";
import { Modal, InputNumber, Select, Input } from "antd";

type Props = {
  visible: boolean;
  onClose: () => void;
  onGuardar: (
    tipo: "percent" | "fixed",
    valor: number,
    comentario: string
  ) => void;
  descuentoInicial?: {
    tipo: "percent" | "fixed";
    valor: number | null;
    comentario: string;
  };
};

const DescuentoProductoModal: React.FC<Props> = ({
  visible,
  onClose,
  onGuardar,
  descuentoInicial,
}) => {
  const [tipo, setTipo] = useState<"percent" | "fixed">(
    descuentoInicial?.tipo || "fixed"
  );
  const [valor, setValor] = useState<number>(descuentoInicial?.valor || 0);
  const [comentario, setComentario] = useState<string>(
    descuentoInicial?.comentario || ""
  );

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={() => onGuardar(tipo, valor, comentario)}
      title="Aplicar descuento"
      okText="Aplicar"
    >
      <div className="mb-4">
        <div className="mb-2 font-semibold">Tipo de descuento</div>
        <Select value={tipo} onChange={setTipo} className="w-full">
          <Select.Option value="percent">Porcentaje (%)</Select.Option>
          <Select.Option value="fixed">Monto fijo ($)</Select.Option>
        </Select>
      </div>
      <div className="mb-4">
        <div className="mb-2 font-semibold">Valor</div>
        <InputNumber
          min={1}
          max={tipo === "percent" ? 100 : 10000}
          className="w-full"
          value={valor}
          onChange={(v) => setValor(v || 0)}
        />
      </div>
      <div>
        <div className="mb-2 font-semibold">Comentario</div>
        <Input.TextArea
          rows={3}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Motivo del descuento"
        />
      </div>
    </Modal>
  );
};

export default DescuentoProductoModal;
