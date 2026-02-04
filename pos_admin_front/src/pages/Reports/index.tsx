import { useState } from "react";
import { ReportMenu } from "./ReportMenu";
import { ReportModalDispatcher } from "./ReportModalDispatcher";
import { reportTree } from "./reporteTree";

export default function ReportsPage() {
  const [currentModal, setCurrentModal] = useState<string | null>(null);

  return (
    <div>
      <h1 className="font-bold mb-4 text-2xl">Reportes</h1>
      <h2 className="mb-4">Seleccione un tipo de reporte</h2>

      <ReportMenu
        nodes={reportTree}
        onSelect={(node) => {
          if (node.modal) setCurrentModal(node.modal);
        }}
      />

      <ReportModalDispatcher
        modalId={currentModal}
        onClose={() => setCurrentModal(null)}
      />
    </div>
  );
}
