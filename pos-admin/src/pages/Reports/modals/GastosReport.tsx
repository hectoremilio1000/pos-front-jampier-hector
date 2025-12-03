import { Button } from "antd";

export default function GastosReport({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <h3>Reporte de Gastos</h3>
      <p>Aquí puedes mostrar filtros, tablas, exportar Excel, etc.</p>

      <Button type="primary" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );
}
