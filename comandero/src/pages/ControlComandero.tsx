import { useEffect, useState } from "react";
import { Button, Card, Select, Pagination, Modal, message } from "antd";
import { FaCashRegister, FaTable, FaUserEdit } from "react-icons/fa";
import CapturaComandaModal from "@/components/CapturaComandaModal";
import { FaMapLocationDot } from "react-icons/fa6";
import {
  MdPlaylistAddCheck,
  MdPointOfSale,
  MdRestore,
  MdSearch,
  MdTableBar,
} from "react-icons/md";
import { GiForkKnifeSpoon } from "react-icons/gi";
import RegistroChequeModal from "@/components/RegistroChequeModal";
import { RiPrinterLine } from "react-icons/ri";
import apiOrder from "@/components/apis/apiOrder";
import ConsultarItemModal from "@/components/ConsultarItemModal";

const { Option } = Select;

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
}

const ControlComandero: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [orderIdCurrent, setOrderIdCurrent] = useState<number | null>(null);
  const [detalle_cheque, setDetalle_cheque] = useState<OrderItem[]>([]);
  const [detalle_cheque_consulta, setDetalle_cheque_consulta] = useState<
    OrderItem[]
  >([]);
  const [cheques, setCheques] = useState<
    {
      shiftId: number | null;
      id: number;
      tableName: string;
      persons: number;
      area_id: number | null;
      areaName: string | null;
      items: OrderItem[];
    }[]
  >([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areasFilter, setAreasFilter] = useState<Area[]>([]);
  const fetchAreas = async () => {
    try {
      const res = await apiOrder.get("/areas");
      const newArea: Area = {
        id: null,
        name: "Todas",
        sortOrder: 0,
        restaurantId: 0,
      };
      setAreas(res.data);
      // Suponiendo que res.data es un array de Area
      const areasFromAPI: Area[] = res.data;

      const newAreas = [newArea, ...areasFromAPI];
      setAreasFilter(newAreas);
    } catch {
      message.error("Error al cargar las areas");
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);
  const fetchCheques = async () => {
    try {
      const res = await apiOrder.get("/orders", { params: { shift: "null" } });
      setCheques(res.data);
    } catch {
      message.error("Error al cargar las areas");
    }
  };

  useEffect(() => {
    fetchCheques();
  }, []);

  const [areaSeleccionada, setAreaSeleccionada] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);
  const viewPaginate = 10;
  const chequesFiltrados =
    areaSeleccionada === "Todas"
      ? cheques
      : cheques.filter((c) => c.areaName === areaSeleccionada);

  const chequesPaginados = chequesFiltrados.slice(
    (paginaActual - 1) * viewPaginate,
    paginaActual * viewPaginate
  );
  const [accionesChequeVisible, setAccionesChequeVisible] = useState(false);
  const [modalComandaVisible, setModalComandaVisible] = useState(false);
  const [modalConsultaVisible, setModalConsultaVisible] = useState(false);
  const [mesaReciente, setMesaReciente] = useState(-1);
  const handleCapturaModal = () => {
    setModalComandaVisible(true);
  };
  const handleConsultaModal = () => {
    const itemsCurrentCheque = cheques.find(
      (c) => c.id === orderIdCurrent
    )?.items;
    if (itemsCurrentCheque) {
      const itemsPendient = itemsCurrentCheque.filter(
        (c) => c.status === "pending"
      );
      console.log(itemsPendient);
      setDetalle_cheque_consulta(itemsPendient);
      setModalConsultaVisible(true);
    }
  };
  const handleAccionesCheque = (cuenta: any, i: number) => {
    //indice
    setOrderIdCurrent(cuenta.id);
    setMesaReciente(i);
    setAccionesChequeVisible(true);
  };
  const mandarComanda = async () => {
    console.log(detalle_cheque);
    try {
      const res = await apiOrder.post(`/orders/${orderIdCurrent}/items`, {
        orderItems: detalle_cheque,
      });
      setDetalle_cheque([]);
      setModalComandaVisible(false);
      console.log(res);
    } catch (error) {
      message.error("Ocurrio un error");
      console.log(error);
    }
  };
  return (
    <>
      <div className="p-6 bg-gray-200 min-h-screen">
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-5">
            <div className="flex items-center mb-4 gap-4">
              <Button
                type="primary"
                className="bg-blue-800"
                onClick={() => setModalVisible(true)}
              >
                <MdTableBar /> Abrir Mesa
              </Button>
              <Button
                className="bg-blue-800"
                // onClick={() => setModalVisible(true)}
              >
                <MdPointOfSale /> Mis ventas
              </Button>
              <Button
                className="bg-blue-800"
                // onClick={() => setModalVisible(true)}
              >
                <GiForkKnifeSpoon /> Monitoreo de pedidos
              </Button>
            </div>
            <div className="filter my-4">
              <Select
                defaultValue="Todas"
                value={areaSeleccionada}
                onChange={setAreaSeleccionada}
                className="w-40"
              >
                {areasFilter.map((area, index) => (
                  <Option key={index} value={area.name}>
                    {area.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {chequesPaginados.map((cuenta, i) => (
                <Card
                  onClick={() => handleAccionesCheque(cuenta, i)}
                  key={i}
                  className="text-center shadow cursor-pointer"
                >
                  <FaTable className="text-4xl text-blue-500 mx-auto" />
                  <p className="font-bold mt-2">{cuenta.tableName}</p>
                  <p>{cuenta.persons} personas</p>
                  <p className="text-sm text-gray-500">{cuenta.areaName}</p>
                </Card>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Pagination
                current={paginaActual}
                total={chequesFiltrados.length}
                pageSize={15}
                onChange={setPaginaActual}
              />
            </div>
          </div>
          <div className="col-span-1 flex flex-col gap-6 bg-gray-100 p-4">
            <div className="w-full">
              <button className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-bold flex flex-col rounded justify-center items-center gap-2 ">
                <FaMapLocationDot /> Mapa de mesas
              </button>
            </div>
          </div>
        </div>
        <Modal
          footer={false}
          closeIcon={false}
          open={accionesChequeVisible}
          onCancel={() => setAccionesChequeVisible(false)}
        >
          <div className="w-full">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <div className="grid grid-cols-3 gap-4">
                  <button
                    className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800"
                    onClick={() => handleCapturaModal()}
                  >
                    <MdPlaylistAddCheck className="text-[25px] " />
                    Capturar
                  </button>
                  <button
                    className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800"
                    onClick={() => handleConsultaModal()}
                  >
                    <MdSearch className="text-[25px] " />
                    Consultar
                  </button>
                  <button className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800">
                    <FaUserEdit className="text-[25px] " />
                    Cambiar Mesero
                  </button>
                  <button className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800">
                    <RiPrinterLine className="text-[25px] " />
                    Imprimir Cuenta
                  </button>
                  <button className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800">
                    <FaCashRegister className="text-[25px] " />
                    Pagar
                  </button>
                  <button className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800">
                    <MdRestore className="text-[25px] " />
                    Reabrir Cuenta
                  </button>
                </div>
              </div>
              <div className="col-span-1">
                <button
                  className="w-full h-full py-2 px-4 rounded bg-red-500 text-white text-md font-bold"
                  onClick={() => setAccionesChequeVisible(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Modal>

        <RegistroChequeModal
          visible={modalVisible}
          areas={areas}
          onClose={() => setModalVisible(false)}
          onRegistrar={async (cheque) => {
            setCheques([...cheques, cheque]);
            setMesaReciente(cheques.length); // índice del array
            await fetchCheques();
            setOrderIdCurrent(cheque.id);
            setModalComandaVisible(true);
          }}
        />
        <CapturaComandaModal
          orderIdCurrent={orderIdCurrent}
          visible={modalComandaVisible}
          mesa={mesaReciente}
          detalle_cheque={detalle_cheque}
          setDetalle_cheque={setDetalle_cheque}
          onClose={() => {
            setModalComandaVisible(false);
            setDetalle_cheque([]);
          }}
          mandarComanda={mandarComanda}
        />
        <ConsultarItemModal
          visible={modalConsultaVisible}
          mesa={mesaReciente}
          detalle_cheque={detalle_cheque_consulta}
          onClose={() => {
            setModalConsultaVisible(false);
            setDetalle_cheque_consulta([]);
          }}
        />
      </div>
    </>
  );
};

export default ControlComandero;
