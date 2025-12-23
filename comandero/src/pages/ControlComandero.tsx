import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Pagination, Modal, message } from "antd";
import { FaTable } from "react-icons/fa";
import CapturaComandaModal from "@/components/CapturaComandaModal";

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
  sortOrder?: number;
  printerName?: string | null;
  printerShared?: boolean | null;
  printerWorkOffline?: boolean | null;
  printerDefault?: boolean | null;
  printerStatus?: string | null;
  printerNetwork?: boolean | null;
  printerAvailability?: string | null;
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
  compositeProductId: string | null;
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
  const [orderCurrent, setOrderCurrent] = useState(null);

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
      status?: string | null;
    }[]
  >([]);

  const rid = getRestaurantIdFromJwt();

  // ---- NUEVO: helper para imprimir por área de impresión ----
  type NPrintJobPayload = {
    printerName: string;
    templateId: string;
    data: {
      orderId: number | null;
      tableName: string;
      areaName: string;
      items: {
        name: string;
        qty: number;
        notes: string | null;
        course: number;
      }[];
    };
  };

  const [areas, setAreas] = useState<Area[]>([]);
  // const [areasFilter, setAreasFilter] = useState<Area[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // const [servicesFilter, setServicesFilter] = useState<Area[]>([]);

  // NUEVO: persistencia simple en sessionStorage
  function getNum(key: string, fallback: number | null) {
    const v = sessionStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function setNum(key: string, val: number | null) {
    if (val === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(val));
  }

  // Área / Servicio “pegajosos”
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(
    getNum("kiosk_selected_area_id", null)
  );
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    getNum("kiosk_selected_service_id", null)
  );

  // Filtro por nombre (para grid)
  const [areaSeleccionadaNombre, setAreaSeleccionadaNombre] =
    useState<string>("Todas");

  // const [areaSeleccionada, setAreaSeleccionada] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);
  const viewPaginate = 10;

  const [accionesChequeVisible, setAccionesChequeVisible] = useState(false);
  const [modalComandaVisible, setModalComandaVisible] = useState(false);
  const [modalConsultaVisible, setModalConsultaVisible] = useState(false);
  const [mesaReciente, setMesaReciente] = useState(-1);

  const fetchAreas = async () => {
    try {
      const res = await apiOrder.get("/kiosk/areas");
      const areasFromAPI: Area[] = res.data;
      setAreas(areasFromAPI);
      if (selectedAreaId == null && areasFromAPI.length) {
        setSelectedAreaId(areasFromAPI[0].id!);
        setNum("kiosk_selected_area_id", areasFromAPI[0].id!);
      }
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las áreas");
    }
  };
  const fetchServices = async () => {
    try {
      const res = await apiOrder.get("/kiosk/services");
      const servicesFromAPI: Service[] = res.data;
      setServices(servicesFromAPI);
      if (selectedServiceId == null && servicesFromAPI.length) {
        setSelectedServiceId(servicesFromAPI[0].id!);
        setNum("kiosk_selected_service_id", servicesFromAPI[0].id!);
      }
    } catch (e) {
      console.error(e);
      message.error("Error al cargar los servicios");
    }
  };
  // Derivados
  // const selectedAreaName =
  //   areas.find((a) => a.id === selectedAreaId)?.name ?? "—";
  // const selectedServiceName =
  //   services.find((s) => s.id === selectedServiceId)?.name ?? "—";

  // Aplica filtro visual por nombre (no toca el default seleccionado)
  const chequesFiltrados =
    areaSeleccionadaNombre === "Todas"
      ? cheques
      : cheques.filter(
          (c) => (c.area?.name ?? "Sin área") === areaSeleccionadaNombre
        );

  const fetchCheques = async () => {
    try {
      const res = await apiOrder.get("/orders", {
        params: { shift: shiftId },
      });
      setCheques(res.data);
      return res.data; // ✅ importante
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las órdenes");
      return null;
    }
  };

  const [areasImpresions, setAreasImpresions] = useState<AreaImpresion[]>([]);

  const fetchAreasImpresions = async () => {
    try {
      const res = await apiOrder.get(
        `/commander/areasImpresion?restaurantId=${rid}`
      );
      setAreasImpresions(res.data);
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las areas de impresions");
    }
  };

  async function sendPrintJobToLocalPrinter(payload: NPrintJobPayload[]) {
    try {
      const res = await fetch("https://172.27.106.19/nprint/printers/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // 🔴 IMPORTANTE: objeto, NO array
      });

      if (!res.ok) {
        console.error("Error al imprimir", res.status);
      }
    } catch (err) {
      console.error("Error de red al imprimir", err);
    }
  }

  const transmitRef = useRef<Transmit | null>(null);
  const subCleanupRef = useRef<() => void>(() => {});

  /** handler central de eventos del canal */
  const onOrdersEvent = useCallback(
    async (msg: any) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "order_closed") {
        const id = Number(msg.orderId);
        if (!Number.isFinite(id)) return;

        setCheques((prev) => prev.filter((c) => c.id !== id));
        if (orderIdCurrent === id) {
          setAccionesChequeVisible(false);
        }

        try {
          await fetchCheques();
        } catch {}
      }

      if (msg.type === "order_printed") {
        console.log("evento print");
        const id = Number(msg.orderId);
        if (!Number.isFinite(id)) return;

        // ✅ resync para que:
        // - en la lista ya aparezca status printed
        // - en el modal consultar ya se habilite Ver QR
        const updated = await fetchCheques();
        if (!updated) return;

        const found = updated.find((o: any) => Number(o.id) === id);
        if (!found) return;

        // si justo estás viendo esa orden, refresca states para que el modal pinte el botón
        if (orderIdCurrent === id) {
          setOrderCurrent(found);
        }

        // si el modal de consulta está abierto, refresca items
        setDetalle_cheque_consulta(found.items ?? []);
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
    // Si el JWT aún no refleja el set justo tras el login, intenta una sola vez igual
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      if (!isJwtValid()) {
        // pequeño “plan B”: espera un tick y revalida
        await Promise.resolve();
        if (!isJwtValid()) return; // ahora sí, corta si sigue inválido
      }

      if (!shiftId) {
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
        await fetchAreasImpresions();
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
          await fetchServices();
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
        await fetchServices();
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
      <div className="min-h-screen bg-gray-50 flex">
        {/* Barra superior con Cerrar sesión */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b flex items-center justify-end px-4">
          <Button danger onClick={cerrarSesion}>
            Cerrar sesión
          </Button>
        </div>

        {/* Contenido central */}
        <div className="flex-1 flex items-center justify-center p-6">
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
      </div>
    );
  }

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
    setOrderCurrent(cuenta);
    setOrderIdCurrent(cuenta.id);
    setMesaReciente(i);
    setAccionesChequeVisible(true);
  };

  const mandarComanda = async () => {
    try {
      // 1) Enviar ítems al POS (lo que ya hacía)
      await apiOrder.post(`/orders/${orderIdCurrent}/items`, {
        orderItems: detalle_cheque,
      });

      // 2) Agrupar por área de impresión (route_area_id / product.areaImpresion)
      const itemsPorArea = new Map<number, OrderItem[]>();
      console.log(detalle_cheque);
      detalle_cheque.forEach((item) => {
        const areaId =
          item.route_area_id ||
          item.product?.areaImpresion?.id ||
          item.product?.printArea;

        if (!areaId) {
          // Si el producto no tiene área, no se manda a ninguna impresora
          return;
        }

        if (!itemsPorArea.has(areaId)) {
          itemsPorArea.set(areaId, []);
        }
        itemsPorArea.get(areaId)!.push(item);
      });

      // Datos de la mesa / orden para el ticket
      const chequeActual = cheques.find((c) => c.id === orderIdCurrent);
      const tableName = chequeActual?.tableName ?? "";
      const templateId = "4"; // 🔁 ajusta al ID real de tu plantilla NPrint

      // 3) Por cada área, mandar un solo print job a la impresora
      const printPromises: Promise<void | null>[] = [];

      itemsPorArea.forEach((items, areaId) => {
        const areaCfg = areasImpresions.find((a) => a.id === areaId);
        const printerName = areaCfg?.printerName || undefined;

        if (!printerName) {
          console.warn(
            `No hay printerName configurado para el área de impresión ${areaId}`
          );
          return; // No intentamos imprimir sin impresora configurada
        }

        const payload: NPrintJobPayload[] = [
          {
            printerName,
            templateId,
            data: {
              orderId: orderIdCurrent,
              tableName,
              areaName: areaCfg?.name ?? "",
              items: items.map((it) => ({
                name: it.product?.name ?? "",
                qty: it.qty,
                notes: it.notes,
                course: it.course,
              })),
            },
          },
        ];

        printPromises.push(sendPrintJobToLocalPrinter(payload));
      });

      // Esperar a que terminen los prints (sin romper el flujo si alguno falla)
      await Promise.all(printPromises);

      // 4) Reset UI como antes
      setDetalle_cheque([]);
      setModalComandaVisible(false);
      await fetchCheques();
      message.success("Ítems enviados y comandas impresas");
    } catch (error) {
      console.error(error);
      message.error("Ocurrió un error al enviar ítems");
    }
  };

  return (
    <>
      <div className=" bg-gray-200 min-h-screen">
        {/* HEADER NUEVO */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="bg-blue-600 px-4 py-3 mb-4 flex justify-between">
              <h1 className="text-2xl font-bold">Control del POS Comandero</h1>
              <Button danger onClick={cerrarSesion}>
                Cerrar sesión
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 p-6">
              {/* Servicios: chips grandes */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Servicio:</span>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id ?? -1}
                      onClick={() => {
                        setSelectedServiceId(s.id);
                        setNum("kiosk_selected_service_id", s.id);
                      }}
                      className={`px-3 py-2 rounded-sm text-sm font-medium border transition
                    ${
                      selectedServiceId === s.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }
                  `}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón para fijar “Área por defecto” (pegajoso) */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Área por defecto:</span>
                <div className="flex flex-wrap gap-2">
                  {areas.map((a) => (
                    <button
                      key={a.id ?? -1}
                      onClick={() => {
                        setSelectedAreaId(a.id);
                        setNum("kiosk_selected_area_id", a.id);
                      }}
                      className={`px-3 py-2 rounded-2xl text-sm font-medium border transition
                    ${
                      selectedAreaId === a.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }
                  `}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-6 p-6">
          {/* Acciones rápidas */}
          <div className="flex gap-2">
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
          </div>
          <div className="col-span-6">
            {/* Áreas: filtros grandes para grid + default pegajoso aparte */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-gray-500">Área (filtro):</span>
              <div className="flex flex-wrap gap-2">
                {["Todas", ...areas.map((a) => a.name)].map((name) => (
                  <button
                    key={name}
                    onClick={() => setAreaSeleccionadaNombre(name)}
                    className={`px-3 py-2 rounded-2xl text-sm font-medium border transition
                    ${
                      areaSeleccionadaNombre === name
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }
                  `}
                  >
                    {name}
                  </button>
                ))}
              </div>
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
          defaultAreaId={selectedAreaId ?? undefined}
          defaultServiceId={selectedServiceId ?? undefined}
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
          orderCurrent={orderCurrent}
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
