export type ReportNode = {
  id: string;
  name: string;
  children?: ReportNode[];
  modal?: string; // nombre del modal que debe abrir
};

export const reportTree: ReportNode[] = [
  {
    id: "administracion",
    name: "Administración",
    children: [
      {
        id: "catalogos_varios",
        name: "Catálogos varios",
        modal: "CatalogosVarios",
      },
      {
        id: "productos_compuestos",
        name: "Productos compuestos",
        modal: "ProductosCompuestosReport",
      },
      { id: "gastos", name: "Gastos", modal: "GastosReport" },
      {
        id: "tiempo_produccion",
        name: "Tiempo de producción",
        modal: "TiempoProduccionReport",
      },
    ],
  },
  {
    id: "ventas",
    name: "Ventas",
    children: [
      {
        id: "ventas_totales",
        name: "Ventas Totales",
        modal: "SalesTotalsModal",
      },
      {
        id: "ventas_totales_mesero",
        name: "Ventas totales por mesero",
        modal: "VentasMeserosReportModal",
      },
      {
        id: "ventas_productos",
        name: "Productos vendidos (precio promedio)",
        modal: "ProductosVendidosReportModal",
      },
    ],
  },
];
