import { useState } from "react";
import { Button, Card, Select, Pagination, Modal } from "antd";
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

const { Option } = Select;

const AREAS = ["Todas", "Comedor", "Terraza", "1er Piso"];

const ControlComandero: React.FC = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [detalle_cheque, setDetalle_cheque] = useState([]);
  const [cheques, setCheques] = useState<any[]>([
    { cuenta: "G5", personas: 5, area: "Comedor" },
    { cuenta: "S15", personas: 1, area: "Terrazas" },
    { cuenta: "L45", personas: 1, area: "Terrazas" },
    { cuenta: "POY45", personas: 1, area: "Terrazas" },
  ]);
  const [areaSeleccionada, setAreaSeleccionada] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);
  const viewPaginate = 10;
  const chequesFiltrados =
    areaSeleccionada === "Todas"
      ? cheques
      : cheques.filter((c) => c.area === areaSeleccionada);

  const chequesPaginados = chequesFiltrados.slice(
    (paginaActual - 1) * viewPaginate,
    paginaActual * viewPaginate
  );
  const [accionesChequeVisible, setAccionesChequeVisible] = useState(false);
  const [modalComandaVisible, setModalComandaVisible] = useState(false);
  const [mesaReciente, setMesaReciente] = useState(-1);
  const handleCapturaModal = () => {
    setModalComandaVisible(true);
  };
  const handleAccionesCheque = (i: number) => {
    //indice
    setMesaReciente(i);
    setAccionesChequeVisible(true);
  };
  const mandarComanda = () => {
    console.log(detalle_cheque);
  };
  return (
    <>
      <div className="w-full bg-blue-800 px-4 py-2">
        <h1 className="font-bold">
          <span className="text-white text-3xl">GrowthSuite</span>
          <span className="text-yellow-500 text-3xl">Comandero</span>
        </h1>
      </div>
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
                {AREAS.map((area) => (
                  <Option key={area} value={area}>
                    {area}
                  </Option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {chequesPaginados.map((mesa, i) => (
                <Card
                  onClick={() => handleAccionesCheque(i)}
                  key={i}
                  className="text-center shadow cursor-pointer"
                >
                  <FaTable className="text-4xl text-blue-500 mx-auto" />
                  <p className="font-bold mt-2">{mesa.cuenta}</p>
                  <p>{mesa.personas} personas</p>
                  <p className="text-sm text-gray-500">{mesa.area}</p>
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
            <Card title="Mesero" bordered className="w-40 text-center w-full">
              <p className="text-lg font-bold">Jampier Me</p>
            </Card>
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
                  <button className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800">
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
          onClose={() => setModalVisible(false)}
          onRegistrar={(cheque) => {
            setCheques([...cheques, cheque]);
            setMesaReciente(cheques.length + 1); // <- guarda el nombre de la mesa
            setModalVisible(false);
            setTimeout(() => setModalComandaVisible(true), 300); // <- abre modal de productos
          }}
        />
        <CapturaComandaModal
          visible={modalComandaVisible}
          mesa={mesaReciente}
          detalle_cheque={detalle_cheque}
          setDetalle_cheque={setDetalle_cheque}
          onClose={() => setModalComandaVisible(false)}
          mandarComanda={mandarComanda}
        />
      </div>
    </>
  );
};

export default ControlComandero;
