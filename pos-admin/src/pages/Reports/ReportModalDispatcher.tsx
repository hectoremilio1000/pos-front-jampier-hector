import React from "react";
import { Modal } from "antd";
import GastosReport from "./modals/GastosReport";
import CatalogosVarios from "./modals/CatalogosVarios";
import ProductosCompuestosReport from "./modals/ProductosCompuestosReport";
import SalesTotalsModal from "./modals/SalesTotalsModal";
import VentasMeserosReportModal from "./modals/VentasMeserosReportModal";
import ProductosVendidosReportModal from "./modals/ProductosVendidosReportModal";
import ProductPrepTimesReportModal from "./modals/ProductPrepTimesReportModal";

interface Props {
  modalId: string | null;
  onClose: () => void;
}

const modalMap: Record<string, React.FC<{ onClose: () => void }>> = {
  GastosReport,
  CatalogosVarios,
  ProductosCompuestosReport,
  SalesTotalsModal,
  VentasMeserosReportModal,
  ProductosVendidosReportModal,
  ProductPrepTimesReportModal,
};

export const ReportModalDispatcher: React.FC<Props> = ({
  modalId,
  onClose,
}) => {
  if (!modalId) return null;

  const Component = modalMap[modalId];
  if (!Component) return null;

  return (
    <Modal open={true} onCancel={onClose} footer={null} width={900}>
      <Component onClose={onClose} />
    </Modal>
  );
};
