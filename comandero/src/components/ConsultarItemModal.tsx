import { Button, Modal, Table, Tag } from "antd";
import React, { type Dispatch, type SetStateAction } from "react";
type Grupo = {
  id: number;
  name: string;
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
};
type OrderItem = {
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
};
type Props = {
  visible: boolean;
  onClose: () => void;
  mesa: number;
  detalle_cheque: OrderItem[];
};

const ConsultarItemModal: React.FC<Props> = ({
  visible,
  onClose,
  mesa,
  detalle_cheque,
}) => {
  const tiempos = [
    {
      label: "Sin tiempo",
      value: 0,
    },
    {
      label: "1er tiempo",
      value: 1,
    },
    {
      label: "2do tiempo",
      value: 2,
    },
    {
      label: "3er tiempo",
      value: 3,
    },
  ];
  const columnas = [
    { title: "Producto", dataIndex: ["product", "name"] }, // ✅
    { title: "Cant", dataIndex: "qty" },
    {
      title: "Tiempo",
      dataIndex: "course",
      render: (tiempo: number) => {
        const tas = tiempos.find((t) => t.value === tiempo);
        return <Tag> {tas?.label}</Tag>;
      },
    },
    {
      title: "Descuento",
      render: (_: any, __: any, index: number) => {
        const item = detalle_cheque[index];
        console.log(item);
        if (item.discountValue !== null && item.discountValue > 0) {
          return (
            <Tag color="green">
              {item.discountType === "percent"
                ? `${item.discountValue}%`
                : `-$${item.discountAmount}`}
            </Tag>
          );
        }
        return <Tag color="default">Sin descuento</Tag>;
      },
    },
    {
      title: "Comentario",
      render: (_: any, __: any, index: number) => (
        <Button size="small" onClick={() => {}}>
          💬 {detalle_cheque[index].notes ? "✔️" : ""}
        </Button>
      ),
    },
    {
      title: "Acción",
      render: (_: any, __: any, index: number) => (
        <div className="flex gap-1">
          <p>POR ACCIONAR</p>
          {/* <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => eliminarProducto(index)}
              /> */}
        </div>
      ),
    },
  ];
  return (
    <Modal
      open={visible}
      title={`Captura de productos - MESA: ${mesa}`}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 10 }}
    >
      <div className="flex gap-4 min-h-[700px]">
        <Table
          className="w-full"
          dataSource={detalle_cheque}
          columns={columnas}
          rowKey={(row) =>
            String(row.productId) + "-" + String(row.id ?? Math.random())
          }
          pagination={false}
          style={{ width: "100%" }}
        />
      </div>
    </Modal>
  );
};

export default ConsultarItemModal;
