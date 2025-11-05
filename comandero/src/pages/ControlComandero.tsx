import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Select, Pagination, Modal, message } from "antd";
import { FaTable } from "react-icons/fa";
import CapturaComandaModal from "@/components/CapturaComandaModal";
import { FaMapLocationDot } from "react-icons/fa6";
import {
  MdAdsClick,
  MdPointOfSale,
  MdSearch,
  MdTableBar,
} from "react-icons/md";
import { GiForkKnifeSpoon } from "react-icons/gi";
import RegistroChequeModal from "@/components/RegistroChequeModal";
import apiOrder from "@/components/apis/apiOrder";
import ConsultarItemModal from "@/components/ConsultarItemModal";

import { Transmit } from "@adonisjs/transmit-client";

import { useNavigate } from "react-router-dom";
import { kioskLogoutOperator } from "@/components/Kiosk/session";
import { useKioskAuth } from "@/context/KioskAuthProvider"; // 👈 usar provider
const { Option } = Select;

interface Area {
  id: number | null;
  restaurantId: number;
  name: string;
  sortOrder: number;
}
interface Service {
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
  taxRate: number;
  priceGross: number;
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
  id?: number;
  orderId: number | null;
  productId: number;
  qty: number;
  unitPrice: number;
  basePrice: number;
  taxRate: number;
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
  compositeProductId: number | null;
  isModifier: boolean;
  isCompositeProductMain: boolean;
  half: Mitad;
  route_area_id: number;
  createdAt?: string;
}
/** Lee restaurantId del kiosk_jwt */
function getRestaurantIdFromJwt(): number {
  try {
    const t = sessionStorage.getItem("kiosk_restaurant_id") || "";
    console.log(t);
    return Number(t);
  } catch {
    return 0;
  }
}

const ControlComandero: React.FC = () => {
  const { isJwtValid, shiftId, refreshShift } = useKioskAuth(); // 👈 del provider
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

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
      service_id: number | null;
      area: Area | null;
      service: Service | null;
      items: OrderItem[];
    }[]
  >([]);

  const [areas, setAreas] = useState<Area[]>([]);
  const [areasFilter, setAreasFilter] = useState<Area[]>([]);
  const [services, setServices] = useState<Area[]>([]);
  const [servicesFilter, setServicesFilter] = useState<Area[]>([]);

  const [areaSeleccionada, setAreaSeleccionada] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);
  const viewPaginate = 10;

  const [accionesChequeVisible, setAccionesChequeVisible] = useState(false);
  const [modalComandaVisible, setModalComandaVisible] = useState(false);
  const [modalConsultaVisible, setModalConsultaVisible] = useState(false);
  const [mesaReciente, setMesaReciente] = useState(-1);

  const fetchAreas = async () => {
    try {
      const res = await apiOrder.get("/kiosk/areas");
      const newArea: Area = {
        id: null,
        name: "Todas",
        sortOrder: 0,
        restaurantId: 0,
      };
      const areasFromAPI: Area[] = res.data;
      setAreas(areasFromAPI);
      setAreasFilter([newArea, ...areasFromAPI]);
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las áreas");
    }
  };
  const fetchServices = async () => {
    try {
      const res = await apiOrder.get("/kiosk/services");
      const newService: Service = {
        id: null,
        name: "Todas",
        sortOrder: 0,
        restaurantId: 0,
      };
      const servicesFromAPI: Service[] = res.data;
      setServices(servicesFromAPI);
      setServicesFilter([newService, ...servicesFromAPI]);
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las áreas");
    }
  };

  const fetchCheques = async () => {
    try {
      const res = await apiOrder.get("/orders", {
        params: { shift: shiftId },
      });
      setCheques(res.data);
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las órdenes");
    }
  };

  const transmitRef = useRef<Transmit | null>(null);
  const subCleanupRef = useRef<() => void>(() => {});

  /** handler central de eventos del canal */
  const onOrdersEvent = useCallback(
    async (msg: any) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "order_closed") {
        const id = Number(msg.orderId);
        if (!Number.isFinite(id)) return;

        // 1) quita de la UI inmediatamente
        setCheques((prev) => prev.filter((c) => c.id !== id));
        if (orderIdCurrent === id) {
          setAccionesChequeVisible(false);
        }

        // 2) (opcional) re-sincroniza desde API para quedar 100% consistente
        try {
          await fetchCheques();
        } catch {}
      }

      // (futuro) puedes manejar order_created / order_changed aquí
    },
    [fetchCheques, orderIdCurrent]
  );
  useEffect(() => {
    if (!isJwtValid()) return;

    // instancia única
    if (!transmitRef.current) {
      transmitRef.current = new Transmit({
        baseUrl: apiOrder.defaults.baseURL || "/api",
        beforeSubscribe: (request) => {
          const anyReq = request as any;
          // Si es Request (tiene headers.set), muta en sitio
          if (anyReq.headers && typeof anyReq.headers.set === "function") {
            const token = sessionStorage.getItem("kiosk_jwt") || "";
            if (token) anyReq.headers.set("Authorization", `Bearer ${token}`);
            const shift = String(shiftId || "");
            if (shift) anyReq.headers.set("X-Shift-Id", shift);
          } else {
            // Si es RequestInit, re-asigna headers
            const headers = new Headers((request as RequestInit).headers || {});
            const token = sessionStorage.getItem("kiosk_jwt") || "";
            if (token) headers.set("Authorization", `Bearer ${token}`);
            const shift = String(shiftId || "");
            if (shift) headers.set("X-Shift-Id", shift);
            (request as RequestInit).headers = headers;
          }
        },

        maxReconnectAttempts: 10,
        onSubscribeFailed: (res) => {
          console.error("Transmit subscribe failed", res?.status);
        },
      });
    }

    const rid = getRestaurantIdFromJwt();
    if (!rid) return;

    // crea suscripción al canal del restaurante
    const sub = transmitRef.current.subscription(`restaurants/${rid}/orders`);
    const off = sub.onMessage(onOrdersEvent);

    sub.create().catch((e) => console.error("Transmit create error", e));

    // cleanup en unmount
    subCleanupRef.current = () => {
      try {
        off && off();
      } catch {}
      try {
        sub.delete();
      } catch {}
    };

    return () => {
      try {
        subCleanupRef.current();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJwtValid]);

  const navigate = useNavigate();
  function cerrarSesion() {
    kioskLogoutOperator(); // borra solo kiosk_jwt y exp
    message.success("Sesión cerrada");
    navigate("/login", { replace: true }); // ← regresa al login correcto
  }

  // ---------- NUEVO: helper para consultar turno actual ----------

  // ---------- Inicialización ----------
  useEffect(() => {
    // Si no hay JWT válido, NO navegues: el guard se encarga.
    if (!isJwtValid()) return;

    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      if (!shiftId) {
        // intenta traer turno
        const ok = await refreshShift();
        if (!ok) {
          setReady(false); // mostrará la vista "No hay turno"
          return;
        }
      }
      try {
        setReady(true);
        await fetchAreas();
        await fetchServices();
        await fetchCheques();
      } catch (e) {
        console.error(e);
        message.error("No se pudo cargar datos");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJwtValid, shiftId]);

  // ---------- NUEVO: polling suave cada 15s mientras no haya turno ----------
  useEffect(() => {
    if (!isJwtValid()) return;
    if (ready) return;
    const id = setInterval(async () => {
      const ok = await refreshShift(); // 👈 del provider
      if (ok) {
        try {
          setReady(true);
          await fetchAreas();
          await fetchCheques();
        } catch (e) {
          console.error(e);
        }
      }
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, isJwtValid]);

  useEffect(() => {
    if (!isJwtValid()) return;
    if (!shiftId) return; // aún no hay turno
    (async () => {
      try {
        setReady(true);
        await fetchAreas();
        await fetchCheques();
      } catch (e) {
        console.error(e);
        message.error("No se pudo cargar datos");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId, isJwtValid]);

  // ---------- NUEVO: UI para "No hay turno" ----------
  if (!ready) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-3">
          <h2 className="text-xl font-semibold">No hay turno abierto</h2>
          <p className="text-gray-600">
            Pida a la caja master abrir el turno. Luego pulse “Reintentar”.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              type="primary"
              onClick={async () => {
                const ok = await refreshShift(); // 👈 del provider
                if (ok) {
                  try {
                    setReady(true);
                    await fetchAreas();
                    await fetchCheques();
                    message.success("Turno detectado. ¡Listo!");
                  } catch (e) {
                    console.error(e);
                  }
                } else {
                  message.info(
                    "Aún no hay turno. Intenta de nuevo en unos segundos."
                  );
                }
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const chequesFiltrados =
    areaSeleccionada === "Todas"
      ? cheques
      : cheques.filter(
          (c) => (c.area?.name ?? "Sin área") === areaSeleccionada
        );

  const chequesPaginados = chequesFiltrados.slice(
    (paginaActual - 1) * viewPaginate,
    paginaActual * viewPaginate
  );

  const handleCapturaModal = () => setModalComandaVisible(true);

  const handleConsultaModal = () => {
    const itemsCurrentCheque =
      cheques.find((c) => c.id === orderIdCurrent)?.items ?? [];
    setDetalle_cheque_consulta(itemsCurrentCheque); // 👈 sin filtrar a "pending"
    setModalConsultaVisible(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAccionesCheque = (cuenta: any, i: number) => {
    setOrderIdCurrent(cuenta.id);
    setMesaReciente(i);
    setAccionesChequeVisible(true);
  };

  const mandarComanda = async () => {
    try {
      await apiOrder.post(`/orders/${orderIdCurrent}/items`, {
        orderItems: detalle_cheque,
      });
      setDetalle_cheque([]);
      setModalComandaVisible(false);
      await fetchCheques();
      message.success("Ítems enviados");
    } catch (error) {
      console.error(error);
      message.error("Ocurrió un error al enviar ítems");
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
              <Button className="bg-blue-800">
                <MdPointOfSale /> Mis ventas
              </Button>
              <Button className="bg-blue-800">
                <GiForkKnifeSpoon /> Monitoreo de pedidos
              </Button>

              <div style={{ marginLeft: "auto" }} />
              <Button danger onClick={cerrarSesion}>
                Cerrar sesión
              </Button>
              {/* <Button onClick={desemparejar}>Salir y desemparejar</Button> */}
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
                  <p className="text-sm text-gray-500">
                    {cuenta.area?.name ?? "Sin área"}
                  </p>
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
          title={"Acciones Orden"}
          footer={false}
          open={accionesChequeVisible}
          onCancel={() => setAccionesChequeVisible(false)}
        >
          <div className="w-full">
            <div className="w-full">
              <div className="w-full">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800"
                    onClick={() => handleCapturaModal()}
                  >
                    <MdAdsClick className="text-[25px] " />
                    Capturar
                  </button>
                  <button
                    className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-gray-300 text-gray-800"
                    onClick={() => handleConsultaModal()}
                  >
                    <MdSearch className="text-[25px] " />
                    Consultar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        <RegistroChequeModal
          visible={modalVisible}
          areas={areas}
          services={services}
          onClose={() => setModalVisible(false)}
          onRegistrar={async (cheque) => {
            setCheques([...cheques, cheque]);
            setMesaReciente(cheques.length);
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
