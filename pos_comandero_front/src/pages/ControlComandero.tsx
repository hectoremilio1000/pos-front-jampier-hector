import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Modal, Pagination, message } from "antd";
import { FaPrint, FaQrcode, FaTable } from "react-icons/fa";
import { QRCodeCanvas } from "qrcode.react";
import CapturaComandaModal from "@/components/CapturaComandaModal";

import { MdAdsClick, MdPointOfSale, MdTableBar } from "react-icons/md";
import { GiForkKnifeSpoon } from "react-icons/gi";
import RegistroChequeModal from "@/components/RegistroChequeModal";
import apiOrder from "@/components/apis/apiOrder";
import ConsultarItemModal from "@/components/ConsultarItemModal";
import MesaMapPicker from "@/components/MesaMapPicker";

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
type PrintMode = "qr" | "impresion" | "mixto";
type ReceiptDelivery = "email";
type PrintSettings = {
  printMode: PrintMode;
  confirmPrint: boolean;
  receiptDelivery: ReceiptDelivery;
};

function normalizePrintMode(raw?: string | null): PrintMode {
  const v = String(raw || "").toLowerCase();
  if (v === "qr" || v === "impresion" || v === "mixto") return v as PrintMode;
  if (v === "cloud") return "qr";
  if (v === "local") return "impresion";
  if (v === "hybrid") return "mixto";
  return "mixto";
}

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

const CLOSED_SALE_STATUSES = new Set([
  "closed",
  "paid",
  "completed",
  "complete",
  "settled",
  "cerrada",
  "cerrado",
  "pagada",
  "pagado",
  "cobrada",
  "cobrado",
  "finalizada",
  "finalizado",
]);

const normalizeStatus = (status?: string | null) =>
  String(status || "").trim().toLowerCase();

const isClosedSaleStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return false;
  if (CLOSED_SALE_STATUSES.has(normalized)) return true;
  if (
    normalized.includes("pagad") ||
    normalized.includes("cobrad") ||
    normalized.includes("paid") ||
    normalized.includes("closed") ||
    normalized.includes("complete") ||
    normalized.includes("final")
  ) {
    return true;
  }
  return false;
};

const calcItemTotal = (item: OrderItem) => {
  const total = Number(item.total);
  if (Number.isFinite(total)) return total;
  const unit = Number(item.unitPrice || item.basePrice || 0);
  const qty = Number(item.qty || 0);
  return unit * qty;
};

const calcOrderTotal = (order: { items?: OrderItem[] }) => {
  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((sum, item) => sum + calcItemTotal(item), 0);
};

const formatMoney = (value: number) =>
  `$${Number(value || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const ControlComandero: React.FC = () => {
  const { isJwtValid, shiftId, refreshShift } = useKioskAuth(); // 👈 del provider
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);
  type OrderSummary = {
    shiftId: number | null;
    id: number;
    tableName: string;
    persons: number;
    area_id: number | null;
    service_id: number | null;
    area: Area | null;
    service: Service | null;
    items: OrderItem[];
    restaurant?: { localBaseUrl?: string | null } | null;
    restaurantId?: number | null;
    status?: string | null;
  };

  const [orderCurrent, setOrderCurrent] = useState<OrderSummary | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [orderIdCurrent, setOrderIdCurrent] = useState<number | null>(null);
  const [detalle_cheque, setDetalle_cheque] = useState<OrderItem[]>([]);
  const [detalle_cheque_consulta, setDetalle_cheque_consulta] = useState<
    OrderItem[]
  >([]);
  const [settingsImpresion, setSettingsImpresion] = useState<
    "qr" | "impresion" | "hibrido" | null
  >(null);
  const [cheques, setCheques] = useState<OrderSummary[]>([]);

  const rid = getRestaurantIdFromJwt();
  const apiUrlAuth = import.meta.env.VITE_API_URL_AUTH;

  // ---- NUEVO: helper para imprimir por área de impresión ----
  type NPrintJobPayload = {
    printerName: string;
    templateId: number;
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
    getNum("kiosk_selected_area_id", null),
  );
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    getNum("kiosk_selected_service_id", null),
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
  const [mapVisible, setMapVisible] = useState(false);
  const [salesVisible, setSalesVisible] = useState(false);
  const [salesView, setSalesView] = useState<"closed" | "all">("closed");

  const mapAreaId = useMemo(() => {
    if (areaSeleccionadaNombre !== "Todas") {
      const found = areas.find((a) => a.name === areaSeleccionadaNombre);
      return found?.id ?? selectedAreaId ?? null;
    }
    return selectedAreaId ?? areas[0]?.id ?? null;
  }, [areas, areaSeleccionadaNombre, selectedAreaId]);

  const salesOrders = useMemo(() => {
    if (salesView === "all") return cheques;
    return cheques.filter((order) => isClosedSaleStatus(order.status));
  }, [cheques, salesView]);

  const salesSummary = useMemo(() => {
    let total = 0;
    let itemsQty = 0;
    salesOrders.forEach((order) => {
      total += calcOrderTotal(order);
      order.items?.forEach((item) => {
        itemsQty += Number(item.qty || 0);
      });
    });
    const count = salesOrders.length;
    return {
      count,
      total,
      avg: count ? total / count : 0,
      itemsQty,
    };
  }, [salesOrders]);

  const salesRows = useMemo(
    () =>
      salesOrders.map((order) => {
        const items = order.items || [];
        return {
          order,
          total: calcOrderTotal(order),
          qty: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        };
      }),
    [salesOrders]
  );

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
          (c) => (c.area?.name ?? "Sin área") === areaSeleccionadaNombre,
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
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    printMode: "mixto",
    confirmPrint: true,
    receiptDelivery: "email",
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!cancelled) {
        setSettingsImpresion("hibrido");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");

  const fetchAreasImpresions = async () => {
    try {
      const res = await apiOrder.get(
        `/commander/areasImpresion?restaurantId=${rid}`,
      );
      setAreasImpresions(res.data);
    } catch (e) {
      console.error(e);
      message.error("Error al cargar las areas de impresions");
    }
  };

  const fetchPrintSettings = async () => {
    try {
      const res = await apiOrder.get("/kiosk/settings");
      const data = res.data || {};
      setPrintSettings({
        printMode: normalizePrintMode(data.printMode),
        confirmPrint:
          data.confirmPrint === undefined ? true : Boolean(data.confirmPrint),
        receiptDelivery: "email",
      });
    } catch (e) {
      console.error(e);
      setPrintSettings({
        printMode: "mixto",
        confirmPrint: true,
        receiptDelivery: "email",
      });
    }
  };

  const groupItemsByArea = (items: OrderItem[]) => {
    const areaMap = new Map<number, OrderItem[]>();
    items.forEach((item) => {
      const areaId =
        (item as any).route_area_id ||
        item.product?.areaImpresion?.id ||
        item.product?.printArea;
      if (!areaId) return;
      if (!areaMap.has(areaId)) areaMap.set(areaId, []);
      areaMap.get(areaId)!.push(item);
    });
    return areaMap;
  };

  const buildLocalPrintPayloads = ({
    items,
    orderId,
    tableName,
    templateId = 4,
  }: {
    items: OrderItem[];
    orderId: number;
    tableName: string;
    templateId?: number;
  }): NPrintJobPayload[] => {
    const payloads: NPrintJobPayload[] = [];
    groupItemsByArea(items).forEach((itemsArea) => {
      const areaId =
        itemsArea[0]?.route_area_id ||
        itemsArea[0]?.product?.areaImpresion?.id ||
        itemsArea[0]?.product?.printArea;
      const areaCfg =
        areaId != null
          ? areasImpresions.find((a) => a.id === areaId)
          : undefined;
      const fallbackArea = itemsArea[0]?.product?.areaImpresion;
      const printerName =
        areaCfg?.printerName || fallbackArea?.printerName || undefined;
      if (!printerName) return;

      payloads.push({
        printerName,
        templateId,
        data: {
          orderId,
          tableName,
          areaName: areaCfg?.name ?? fallbackArea?.name ?? "",
          items: itemsArea.map((it) => ({
            name: it.product?.name ?? "",
            qty: it.qty,
            notes: it.notes,
            course: it.course,
          })),
        },
      });
    });
    return payloads;
  };

  async function sendPrintJobToLocalPrinter(
    payloads: NPrintJobPayload[],
    baseUrl?: string | null,
  ) {
    if (!payloads.length) return;
    if (!baseUrl) {
      message.warning(
        "No se pudo imprimir porque no existe tu servidor local de impresión",
      );
      return;
    }
    const cleanBase = baseUrl.replace(/\/$/, "");
    try {
      const res = await fetch(`${cleanBase}/nprint/printers/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads),
      });
      const payloadResp = await res.json().catch(() => null);
      if (!res.ok) {
        const errMsg =
          payloadResp?.message ||
          payloadResp?.error ||
          `Error ${res.status}: ${res.statusText}`;
        throw new Error(errMsg);
      }
      return payloadResp;
    } catch (error) {
      console.error("Error de impresión local", error);
      message.error("No se pudo realizar la impresión local");
      throw error;
    }
  }

  const hasLocalPrinters = useMemo(
    () => areasImpresions.some((a) => !!a.printerName),
    [areasImpresions],
  );

  const buildReceiptUrl = (orderId: number, restaurantId: number) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${restaurantId}/qrscan/${orderId}`;
  };

  const openReceiptModal = (
    orderId: number,
    restaurantId: number,
    mode?: ReceiptDelivery,
  ) => {
    const url = buildReceiptUrl(orderId, restaurantId);
    setReceiptUrl(url);
    setReceiptEmail("");
    setReceiptMode(mode ?? printSettings.receiptDelivery);
    setReceiptOpen(true);
  };

  const openReceiptUrl = () => {
    if (!receiptUrl) return;
    window.open(receiptUrl, "_blank");
  };

  const sendReceiptEmail = () => {
    if (!receiptUrl) return;
    const email = receiptEmail.trim();
    if (!email) {
      message.warning("Escribe un correo válido");
      return;
    }
    const subject = encodeURIComponent("Tu recibo");
    const body = encodeURIComponent(
      `Gracias por tu visita.\n\nPuedes ver tu recibo aquí:\n${receiptUrl}`,
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
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
    [fetchCheques, orderIdCurrent],
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
        await fetchPrintSettings();
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
          await fetchPrintSettings();
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
        await fetchPrintSettings();
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
            <h2 className="text-xl font-semibold">Turno no abierto</h2>
            <p className="text-gray-600">
              No puedes abrir cuentas hasta que la caja master abra el turno.
              Luego presiona “Reintentar”.
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
                      "Aún no hay turno. Intenta de nuevo en unos segundos.",
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
    paginaActual * viewPaginate,
  );
  const statusOrderCurrent = String(
    (orderCurrent as any)?.status || ""
  ).toLowerCase();
  const isOrderPrinted = statusOrderCurrent === "printed";
  const canOpenReceipt =
    !!orderCurrent &&
    (printSettings.printMode === "qr" ||
      printSettings.printMode === "mixto" ||
      isOrderPrinted);
  const shouldShowQrReceipt =
    printSettings.printMode === "qr" || printSettings.printMode === "mixto";

  const handleCapturaModal = () => {
    const status = String((orderCurrent as any)?.status || "").toLowerCase();
    if (status === "printed") {
      message.warning("Orden impresa. Reabre con autorización para editar.");
      return;
    }
    setAccionesChequeVisible(false);
    setModalComandaVisible(true);
  };

  const handleImprimirModal = async () => {
    setAccionesChequeVisible(false);
    if (!isPrintEnabled) {
      message.warning("El modo actual no permite imprimir.");
      return;
    }
    const orderId = orderIdCurrent ?? orderCurrent?.id ?? null;
    const items = orderCurrent?.items ?? [];
    if (!orderId) {
      message.error("No hay orden seleccionada.");
      return;
    }

    if (!items.length) {
      message.warning("La orden no tiene productos para imprimir.");
      return;
    }

    const tableName = orderCurrent?.tableName ?? "";
    const localBaseUrl =
      orderCurrent?.restaurant?.localBaseUrl ??
      cheques.find((c) => c.id === orderId)?.restaurant?.localBaseUrl ??
      null;

    if (!localBaseUrl) {
      message.warning(
        "No se encontró la URL local de impresión (restaurant.localBaseUrl).",
      );
      return;
    }

    const payloads = buildLocalPrintPayloads({ items, orderId, tableName });
    if (!payloads.length) {
      message.warning(
        "No hay áreas de impresión configuradas para estos ítems.",
      );
      return;
    }

    try {
      const cleanBase = localBaseUrl.replace(/\/$/, "");
      const response = await fetch(`${cleanBase}/nprint/printers/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads),
      });
      const body = await response.json().catch(() => null);
      console.log("Impresión simulada", {
        payloads,
        response: body ?? response,
      });
      message.success("Solicitud de impresión enviada (ver consola).");
    } catch (error) {
      console.error("No se pudo solicitar la impresión", error);
      message.error("No se pudo solicitar la impresión.");
    }
  };

  const isPrintEnabled =
    settingsImpresion === "hibrido" || settingsImpresion === "impresion";
  const isQrEnabled =
    settingsImpresion === "hibrido" || settingsImpresion === "qr";

  const handleQrAction = () => {
    setAccionesChequeVisible(false);
    if (!isQrEnabled) {
      message.warning("El modo actual no permite mostrar el QR.");
      return;
    }
    const orderId = orderIdCurrent ?? orderCurrent?.id ?? null;
    const restaurantId = orderCurrent?.restaurantId ?? rid;

    if (!orderId || !restaurantId) {
      message.warning("Esta orden no tiene identificación para mostrar el QR.");
      return;
    }

    openReceiptModal(orderId, Number(restaurantId), "qr");
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAccionesCheque = (cuenta: any, i: number) => {
    setOrderCurrent(cuenta);
    setOrderIdCurrent(cuenta.id);
    setMesaReciente(i);
    setAccionesChequeVisible(true);
  };

  const sendToProduction = async (items: OrderItem[]) => {
    const orderId = orderIdCurrent ?? orderCurrent?.id ?? null;
    if (!orderId) {
      message.error("No hay orden seleccionada.");
      return;
    }
    const status = String((orderCurrent as any)?.status || "").toLowerCase();
    if (status === "printed") {
      message.warning("Orden impresa. Reabre con autorización para editar.");
      return;
    }
    if (!items.length) {
      message.warning("No hay productos para enviar.");
      return;
    }
    try {
      const itemsToSend = [...items];
      await apiOrder.post(`/orders/${orderId}/items`, {
        orderItems: itemsToSend,
      });
      const fetchedCheques = (await fetchCheques()) ?? cheques;
      const chequeActual =
        fetchedCheques.find((c: any) => c.id === orderId) ??
        cheques.find((c) => c.id === orderId) ??
        orderCurrent;
      const tableName = chequeActual?.tableName ?? "";
      const localBaseUrl =
        chequeActual?.restaurant?.localBaseUrl ||
        orderCurrent?.restaurant?.localBaseUrl ||
        null;
      const payloads = buildLocalPrintPayloads({
        items: itemsToSend,
        orderId,
        tableName,
      });
      await sendPrintJobToLocalPrinter(payloads, localBaseUrl);
      setDetalle_cheque([]);
      setModalComandaVisible(false);
      await fetchCheques();
      message.success("Enviado a producción y solicitado a impresora local");
    } catch (error: any) {
      console.error(error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo enviar a produccion";
      message.error(msg);
    }
  };

  const mandarComanda = async () => {
    await sendToProduction(detalle_cheque);
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
            <Button
              className="bg-white"
              onClick={() => setMapVisible(true)}
            >
              <MdTableBar /> Mapa de mesas
            </Button>
            <Button
              className="bg-blue-800"
              onClick={() => setSalesVisible(true)}
            >
              <MdPointOfSale /> Mis ventas
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
                  {String(cuenta.status || "").toLowerCase() === "printed" ? (
                    <Tag color="blue" className="mt-1">
                      Impresa
                    </Tag>
                  ) : null}
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <button
                    className={`flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 ${
                      isOrderPrinted
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-300 text-gray-800"
                    }`}
                    onClick={() => handleCapturaModal()}
                    disabled={isOrderPrinted}
                  >
                    <MdAdsClick className="text-[25px] " />
                    Capturar
                  </button>
                  <button
                    className={`flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 ${
                      isOrderPrinted
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-300 text-gray-800"
                    }`}
                    onClick={() => handleImprimirModal()}
                    disabled={!isPrintEnabled}
                    title={
                      !settingsImpresion
                        ? "Cargando modo de impresión..."
                        : !isPrintEnabled
                          ? "Activa sólo en modo impresión/híbrido"
                          : undefined
                    }
                    style={{
                      cursor: isPrintEnabled ? "pointer" : "not-allowed",
                    }}
                  >
                    <FaPrint className="text-[22px]" />
                    Imprimir
                  </button>
                  <button
                    className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-blue-600 text-white"
                    onClick={() => handleQrAction()}
                    disabled={!isQrEnabled}
                    title={
                      !settingsImpresion
                        ? "Cargando modo de impresión..."
                        : !isQrEnabled
                          ? "Activa sólo en modo QR/híbrido"
                          : undefined
                    }
                    style={{ cursor: isQrEnabled ? "pointer" : "not-allowed" }}
                  >
                    <FaQrcode className="text-[22px]" />
                    QR
                  </button>
                  <button
                    className="flex flex-col rounded justify-center items-center gap-2 w-full py-2 px-4 bg-blue-600 text-white"
                    onClick={() => {
                      setAccionesChequeVisible(false);
                      setDetalle_cheque_consulta(orderCurrent?.items ?? []);
                      setModalConsultaVisible(true);
                    }}
                  >
                    <MdAdsClick className="text-[25px]" />
                    Ver detalle
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Modo de impresión:{" "}
                  {settingsImpresion ? settingsImpresion : "cargando..."}
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
        <Modal
          title="Aprobación — Reabrir orden"
          open={reopenApprovalVisible}
          onCancel={() => setReopenApprovalVisible(false)}
          onOk={handleReopenApprovalConfirm}
          confirmLoading={reopenSubmitting}
          okText="Reabrir"
        >
          <Input.Password
            value={reopenManagerPassword}
            onChange={(e) => setReopenManagerPassword(e.target.value)}
            placeholder="Contraseña de administrador"
          />
        </Modal>
        <Modal
          title="Entrega de recibo"
          open={receiptOpen}
          onCancel={() => setReceiptOpen(false)}
          footer={null}
        >
          {receiptMode === "qr" && receiptUrl ? (
            <div className="flex flex-col items-center gap-3">
              <QRCodeCanvas value={receiptUrl} size={220} includeMargin />
              <div className="break-all text-sm">{receiptUrl}</div>
              <Button onClick={openReceiptUrl}>Abrir link</Button>
            </div>
          ) : null}
          {receiptMode === "email" && receiptUrl ? (
            <div className="flex flex-col gap-3">
              <Input
                placeholder="correo@cliente.com"
                value={receiptEmail}
                onChange={(e) => setReceiptEmail(e.target.value)}
              />
              <Button type="primary" onClick={sendReceiptEmail}>
                Enviar por email
              </Button>
              <Button onClick={openReceiptUrl}>Abrir link</Button>
            </div>
          ) : null}
          {receiptMode === "none" ? (
            <div className="text-sm text-gray-500">
              No hay entrega de recibo configurada.
            </div>
          )}
        </Modal>
        <Modal
          title="Mapa de mesas"
          open={mapVisible}
          onCancel={() => setMapVisible(false)}
          footer={null}
          width={1100}
          centered
        >
          <div className="text-sm text-gray-500 mb-3">
            Area: {areaSeleccionadaNombre !== "Todas" ? areaSeleccionadaNombre : "Todas"}
          </div>
          <MesaMapPicker areaId={mapAreaId ?? null} selectedTableId={null} readOnly />
        </Modal>
        <Modal
          title="Mis ventas"
          open={salesVisible}
          onCancel={() => setSalesVisible(false)}
          footer={null}
          width={980}
          centered
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="text-sm text-gray-500">
              Turno: {shiftId ?? "—"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type={salesView === "closed" ? "primary" : "default"}
                onClick={() => setSalesView("closed")}
              >
                Cerradas/Pagadas
              </Button>
              <Button
                type={salesView === "all" ? "primary" : "default"}
                onClick={() => setSalesView("all")}
              >
                Todas
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="text-xs text-gray-500">Total ventas</div>
              <div className="text-lg font-semibold">
                {formatMoney(salesSummary.total)}
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="text-xs text-gray-500">Órdenes</div>
              <div className="text-lg font-semibold">{salesSummary.count}</div>
            </div>
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="text-xs text-gray-500">Ticket promedio</div>
              <div className="text-lg font-semibold">
                {formatMoney(salesSummary.avg)}
              </div>
            </div>
          </div>

          {salesRows.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 p-4 text-sm text-gray-500">
              No hay ventas para mostrar con este filtro.
            </div>
          ) : (
            <div className="overflow-auto rounded border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Mesa</th>
                    <th className="px-3 py-2 text-left">Área</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-right">Items</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRows.map((row) => (
                    <tr
                      key={row.order.id}
                      className="border-t border-slate-200"
                    >
                      <td className="px-3 py-2">
                        {row.order.tableName || `Mesa ${row.order.id}`}
                      </td>
                      <td className="px-3 py-2">
                        {row.order.area?.name ?? "Sin área"}
                      </td>
                      <td className="px-3 py-2">
                        <Tag
                          color={
                            isClosedSaleStatus(row.order.status)
                              ? "green"
                              : "default"
                          }
                        >
                          {normalizeStatus(row.order.status) || "sin estado"}
                        </Tag>
                      </td>
                      <td className="px-3 py-2 text-right">{row.qty}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatMoney(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default ControlComandero;
