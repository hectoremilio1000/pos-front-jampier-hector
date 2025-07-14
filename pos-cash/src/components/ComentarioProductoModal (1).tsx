import React, { useState, useEffect } from "react";
import { Modal, Button, Input } from "antd";
import TecladoVirtual from "./TecladoVirtual";

type Props = {
  visible: boolean;
  onClose: () => void;
  onGuardar: (comentario: string) => void;
  comentarioInicial?: string;
};

const ComentarioProductoModal: React.FC<Props> = ({
  visible,
  onClose,
  onGuardar,
  comentarioInicial = ""
}) => {
  const [comentario, setComentario] = useState(comentarioInicial);

  useEffect(() => {
    setComentario(comentarioInicial);
  }, [comentarioInicial]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="guardar" type="primary" onClick={() => onGuardar(comentario)}>
          Guardar
        </Button>
      ]}
      title="Agregar comentario"
      width={600}
    >
      <Input.TextArea rows={3} value={comentario} readOnly className="mb-4" />
      <TecladoVirtual
        onKeyPress={(v) => setComentario((prev) => prev + v)}
        onBackspace={() => setComentario((prev) => prev.slice(0, -1))}
        onSpace={() => setComentario((prev) => prev + " ")}
        onClear={() => setComentario("")}
      />
    </Modal>
  );
};

export default ComentarioProductoModal;
