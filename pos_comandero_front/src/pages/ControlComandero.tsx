import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Modal, Pagination, Tag, message } from "antd";
import { FaPrint, FaTable } from "react-icons/fa";
import { QRCodeCanvas } from "qrcode.react";
import CapturaComandaModal from "@/components/CapturaComandaModal";

import { MdAdsClick, MdPointOfSale, MdTableBar } from "react-icons/md";
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
  String(status || "")
    .trim()
    .toLowerCase();

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
  const { isJwtValid, shiftId, refreshShift, restaurantId: ridFromCtx } =
    useKioskAuth(); // 👈 del provider
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

    // 👇 NUEVO
    printCount?: number;
    print_count?: number;
    folioSeries?: string | null;
    folioNumber?: number | null;
  };

  const [orderCurrent, setOrderCurrent] = useState<OrderSummary | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [orderIdCurrent, setOrderIdCurrent] = useState<number | null>(null);
  const [detalle_cheque, setDetalle_cheque] = useState<OrderItem[]>([]);
  const [detalle_cheque_consulta, setDetalle_cheque_consulta] = useState<
    OrderItem[]
  >([]);
  const [cheques, setCheques] = useState<OrderSummary[]>([]);
  const [invoicePreviewVisible, setInvoicePreviewVisible] = useState(false);
  const [invoicePreviewOrder, setInvoicePreviewOrder] =
    useState<OrderSummary | null>(null);

  const rid = Number(ridFromCtx || getRestaurantIdFromJwt() || 0);
  const jwtOk = isJwtValid();

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
    [salesOrders],
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

  const fetchCheques = useCallback(async () => {
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
  }, [shiftId]);

  const [areasImpresions, setAreasImpresions] = useState<AreaImpresion[]>([]);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    printMode: "mixto",
    confirmPrint: true,
    receiptDelivery: "email",
  });

  // --- NUEVO: reimpresión con aprobación ---
  const [printApprovalVisible, setPrintApprovalVisible] = useState(false);
  const [printManagerPassword, setPrintManagerPassword] = useState("");
  const [printSubmitting, setPrintSubmitting] = useState(false);

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

  // ====== Aprobaciones (pos-auth) ======
  async function requestApprovalToken(
    action: string,
    password: string,
    targetId: number,
  ) {
    const restaurantId = Number(rid || 0);
    if (!restaurantId) throw new Error("restaurantId faltante");
    const apiUrlAuth = import.meta.env.VITE_API_URL_AUTH;
    const res = await fetch(`${apiUrlAuth}/approvals/issue-by-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        stationId: null, // comandero no está amarrado a station/caja
        password,
        action,
        targetId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data?.error || data?.message || "Aprobación rechazada";
      throw new Error(err);
    }
    return String(data?.approval_token || "");
  }

  // ====== Impresión (API Order) ======
  async function doInitialPrintOnOrderApi(orderId: number) {
    const res = await apiOrder.post(
      `/orders/${orderId}/firstPrint`,
      {},
      { validateStatus: () => true },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err =
        (res?.data &&
          (res.data.details || res.data.error || res.data.message)) ||
        "Impresión (primera) falló";
      throw new Error(err);
    }
    return res.data as { folioSeries: string; folioNumber: number };
  }

  async function doPrintOnOrderApi(orderId: number, approvalToken: string) {
    const res = await apiOrder.post(
      `/orders/${orderId}/print`,
      {},
      {
        headers: { "X-Approval": `Bearer ${approvalToken}` },
        validateStatus: () => true,
      },
    );
    if (!res || res.status < 200 || res.status >= 300) {
      const err =
        (res?.data &&
          (res.data.details || res.data.error || res.data.message)) ||
        "Impresión falló";
      throw new Error(err);
    }
    return res.data as { folioSeries: string; folioNumber: number };
  }

  // ====== Envío a impresora local (Print Proxy) ======
  const NPRINT_TICKET_TEMPLATE_ID = 2;

  type NPrintTicketItem = {
    codigo: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    importe: number;
  };

  type NPrintTicketData = {
    numero: string;
    fecha: string;
    cliente: {
      nombre: string;
      direccion: string;
      rfc: string;
    };
    items: NPrintTicketItem[];
    subtotal: number;
    iva: number;
    total: number;
  };

  function formatDate(d: Date | string | number) {
    const dt = new Date(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(
      dt.getHours(),
    )}:${pad(dt.getMinutes())}`;
  }

  function buildNPrintTicketPayload(params: {
    printerName: string;
    order: OrderSummary;
    folioSeries: string;
    folioNumber: number;
    subtotal: number;
    iva: number;
    total: number;
  }): Array<{
    printerName: string;
    templateId: number;
    data: NPrintTicketData;
  }> {
    const {
      printerName,
      order,
      folioSeries,
      folioNumber,
      subtotal,
      iva,
      total,
    } = params;

    const numero = `${folioSeries}-${String(folioNumber).padStart(3, "0")}`;

    const createdAt =
      (order as any)?.createdAt || (order as any)?.created_at || new Date();

    const fecha = formatDate(createdAt);

    // 👇 cliente (si no tienes customer en esta vista, lo dejamos “Público”)
    const clienteNombre =
      (order as any)?.customerName ||
      (order as any)?.customer?.name ||
      "Público en general";

    const clienteDireccion = (order as any)?.customer?.address ?? "";
    const clienteRfc = (order as any)?.customer?.rfc ?? "";

    // items: usa los items de la orden (mapeo simple)
    const itemsPayload: NPrintTicketItem[] = (order.items ?? []).map(
      (it, idx) => {
        const cantidad = Number(it.qty ?? 0) || 1;
        const importe = Math.round(Number(it.total ?? 0) * 100) / 100;
        const precio_unitario =
          cantidad > 0 ? Math.round((importe / cantidad) * 100) / 100 : 0;

        return {
          codigo: `L${idx + 1}`,
          descripcion: it.product?.name ?? `Producto #${it.productId}`,
          cantidad,
          precio_unitario,
          importe,
        };
      },
    );

    return [
      {
        printerName,
        templateId: NPRINT_TICKET_TEMPLATE_ID,
        data: {
          numero,
          fecha,
          cliente: {
            nombre: clienteNombre,
            direccion: clienteDireccion,
            rfc: clienteRfc,
          },
          items: itemsPayload,
          subtotal,
          iva,
          total,
        },
      },
    ];
  }

  async function sendTicketToPrintProxy(opts: {
    localBaseUrl: string;
    printerName: string;
    order: OrderSummary;
    folioSeries: string;
    folioNumber: number;
    subtotal: number;
    iva: number;
    total: number;
  }) {
    const cleanBase = String(opts.localBaseUrl || "").replace(/\/$/, "");
    if (!cleanBase) throw new Error("localBaseUrl faltante");

    const payload = buildNPrintTicketPayload({
      printerName: opts.printerName,
      order: opts.order,
      folioSeries: opts.folioSeries,
      folioNumber: opts.folioNumber,
      subtotal: opts.subtotal,
      iva: opts.iva,
      total: opts.total,
    });

    const res = await fetch(`${cleanBase}/nprint/printers/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {}
      throw new Error(
        `Error al enviar a impresora (${res.status})${detail ? `: ${detail}` : ""}`,
      );
    }

    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  function getDefaultPrinterName(): string | null {
    const preferred =
      areasImpresions.find((a) => a.printerDefault && a.printerName)
        ?.printerName ||
      areasImpresions.find((a) => a.printerName)?.printerName ||
      null;
    return preferred || null;
  }

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

  const transmitRef = useRef<Transmit | null>(null);
  const orderIdCurrentRef = useRef<number | null>(null);
  const orderCurrentIdRef = useRef<number | null>(null);

  useEffect(() => {
    orderIdCurrentRef.current = orderIdCurrent;
  }, [orderIdCurrent]);

  useEffect(() => {
    orderCurrentIdRef.current = orderCurrent?.id ?? null;
  }, [orderCurrent?.id]);

  /** handler central de eventos del canal */
  const onOrdersEvent = useCallback(
    async (msg: any) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "order_closed") {
        const id = Number(msg.orderId);
        if (!Number.isFinite(id)) return;

        setCheques((prev) => prev.filter((c) => c.id !== id));
        const currentId =
          orderIdCurrentRef.current ?? Number(orderCurrentIdRef.current || 0);
        if (currentId === id) {
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
        const currentId =
          orderIdCurrentRef.current ?? Number(orderCurrentIdRef.current || 0);
        if (currentId === id) {
          setOrderCurrent(found);
        }

        // si el modal de consulta está abierto, refresca items
        setDetalle_cheque_consulta(found.items ?? []);
      }

      if (msg.type === "order_changed") {
        const id = Number(msg.orderId);
        if (!Number.isFinite(id)) return;

        const updated = await fetchCheques();
        if (!updated) return;

        const found = updated.find((o: any) => Number(o.id) === id);
        if (!found) return;

        const currentId =
          orderIdCurrentRef.current ?? Number(orderCurrentIdRef.current || 0);
        if (currentId === id) {
          setOrderCurrent(found);
          setDetalle_cheque_consulta(found.items ?? []);
        }
      }

      // (futuro) puedes manejar order_created aquí
    },
    [fetchCheques],
  );
  useEffect(() => {
    if (!jwtOk) return;
    if (!rid) return;
    if (!transmitRef.current) {
      const baseUrl = apiOrder.defaults.baseURL || "/api";
      transmitRef.current = new Transmit({
        baseUrl,
        beforeSubscribe: (request) => {
          const token = sessionStorage.getItem("kiosk_jwt") || "";
          const shift = String(shiftId || "");

          // ✅ Si es un Request real, muta headers directamente (no se usa retorno).
          if (request instanceof Request) {
            if (token) request.headers.set("Authorization", `Bearer ${token}`);
            if (shift) request.headers.set("X-Shift-Id", shift);
            return;
          }

          // ✅ Si es RequestInit (objeto), ahí sí puedes setear headers
          const init = request as RequestInit;
          const headers = new Headers(init.headers || {});
          if (token) headers.set("Authorization", `Bearer ${token}`);
          if (shift) headers.set("X-Shift-Id", shift);
          init.headers = headers;
          return init;
        },
        beforeUnsubscribe: (request) => {
          const token = sessionStorage.getItem("kiosk_jwt") || "";
          const shift = String(shiftId || "");

          if (request instanceof Request) {
            if (token) request.headers.set("Authorization", `Bearer ${token}`);
            if (shift) request.headers.set("X-Shift-Id", shift);
            return;
          }

          const init = request as RequestInit;
          const headers = new Headers(init.headers || {});
          if (token) headers.set("Authorization", `Bearer ${token}`);
          if (shift) headers.set("X-Shift-Id", shift);
          init.headers = headers;
          return init;
        },
      });
    }

    const sub = transmitRef.current.subscription(`restaurants/${rid}/orders`);

    const off = sub.onMessage(onOrdersEvent);
    sub.create();

    return () => {
      off?.();
      sub.delete();
    };
  }, [jwtOk, rid, shiftId, onOrdersEvent]);

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

  const invoiceItems = invoicePreviewOrder?.items ?? [];
  const invoiceTotals = useMemo(() => {
    const subtotal = invoiceItems.reduce((acc, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.basePrice ?? item.unitPrice) || 0;
      return acc + qty * price;
    }, 0);
    const total = invoiceItems.reduce(
      (acc, item) => acc + (Number(item.total) || 0),
      0,
    );
    return {
      subtotal,
      tax: total - subtotal,
      total,
    };
  }, [invoiceItems]);

  const invoiceOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const invoiceRestaurantId = invoicePreviewOrder?.restaurantId ?? rid;
  const invoiceUrl =
    invoiceRestaurantId && invoiceOrigin
      ? `${invoiceOrigin}/invoices/generate/${invoiceRestaurantId}`
      : null;

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
    (orderCurrent as any)?.status || "",
  ).toLowerCase();

  // 👉 nuevo: usa printCount (acepta snake/camel)
  const printCountCurrent = Number(
    (orderCurrent as any)?.printCount ??
      (orderCurrent as any)?.print_count ??
      0,
  );

  const isOrderPrinted =
    statusOrderCurrent === "printed" || printCountCurrent > 0;

  const printMode = printSettings.printMode;
  const printButtonLabel =
    printMode === "impresion" ? "Imprimir-Local" : "Imprimir-QR";
  const printButtonTitle =
    printMode === "impresion"
      ? "Envía la orden a la impresora local"
      : "Genera el ticket con QR (y también imprime si aplica)";

  const handleCapturaModal = () => {
    const status = String((orderCurrent as any)?.status || "").toLowerCase();
    if (status === "printed") {
      message.warning("Orden impresa. Reabre con autorización para editar.");
      return;
    }
    setAccionesChequeVisible(false);
    setModalComandaVisible(true);
  };

  const openInvoicePreview = (order: OrderSummary | null) => {
    if (!order) return;

    setInvoicePreviewOrder(order);
    setInvoicePreviewVisible(true);
  };
  function calcInvoiceTotalsFromOrder(order: OrderSummary) {
    const items = Array.isArray(order.items) ? order.items : [];

    const subtotal = items.reduce((acc, item) => {
      const qty = Number(item.qty) || 0;
      const base = Number(item.basePrice ?? 0) || 0;
      return acc + qty * base;
    }, 0);

    const total = items.reduce((acc, item) => {
      const lineTotal = Number(item.total);
      if (Number.isFinite(lineTotal)) return acc + lineTotal;

      // fallback si item.total viene raro:
      const qty = Number(item.qty) || 0;
      const unit = Number(item.unitPrice ?? item.basePrice ?? 0) || 0;
      return acc + qty * unit;
    }, 0);

    const tax = total - subtotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  const openPrintApprovalFlow = () => {
    setPrintManagerPassword("");
    setPrintApprovalVisible(true);
  };

  const runInitialPrint = async (order: OrderSummary, orderId: number) => {
    setPrintSubmitting(true);
    try {
      const r = await doInitialPrintOnOrderApi(orderId);

      try {
        await fetchCheques();
      } catch {}

      if (printMode === "qr") {
        openInvoicePreview(order);
        return;
      }

      const localBaseUrl =
        order?.restaurant?.localBaseUrl ??
        cheques.find((c) => c.id === orderId)?.restaurant?.localBaseUrl ??
        null;

      if (!localBaseUrl) {
        message.warning(
          "No se encontró la URL local de impresión (restaurant.localBaseUrl).",
        );
        openInvoicePreview(order);
        return;
      }

      const printerName = getDefaultPrinterName();
      if (!printerName) {
        message.warning("No hay impresora configurada (printerName).");
        openInvoicePreview(order);
        return;
      }

      const totals = calcInvoiceTotalsFromOrder(order);
      const subtotal = totals.subtotal;
      const iva = totals.tax;
      const total = totals.total;

      await sendTicketToPrintProxy({
        localBaseUrl,
        printerName,
        order,
        folioSeries: r.folioSeries,
        folioNumber: r.folioNumber,
        subtotal,
        iva,
        total,
      });

      message.success("Cuenta enviada a la impresora");
      openInvoicePreview(order);
    } catch (e: any) {
      message.error(String(e?.message || "No se pudo imprimir"));
    } finally {
      setPrintSubmitting(false);
    }
  };

  const handlePrintAction = async () => {
    setAccionesChequeVisible(false);

    const order = orderCurrent;
    const orderId = orderIdCurrent ?? order?.id ?? null;
    const items = order?.items ?? [];

    if (!order || !orderId) {
      message.error("No hay orden seleccionada.");
      return;
    }
    if (!items.length) {
      message.warning("La orden no tiene productos para imprimir.");
      return;
    }

    const pc = Number(
      (order as any)?.printCount ?? (order as any)?.print_count ?? 0,
    );
    if (pc > 0) {
      openPrintApprovalFlow();
      return;
    }

    if (printSettings.confirmPrint) {
      Modal.confirm({
        title: "Imprimir cuenta",
        content: "¿Seguro que deseas imprimir esta cuenta?",
        okText: "Imprimir",
        cancelText: "Cancelar",
        onOk: () => runInitialPrint(order, orderId),
      });
      return;
    }

    await runInitialPrint(order, orderId);
  };

  const handlePrintApprovalConfirm = async () => {
    const order = orderCurrent;
    const orderId = orderIdCurrent ?? order?.id ?? null;
    if (!order || !orderId) {
      message.error("No hay orden seleccionada.");
      return;
    }
    if (!printManagerPassword) {
      message.error("Ingresa la contraseña del administrador");
      return;
    }

    setPrintSubmitting(true);
    try {
      const approval = await requestApprovalToken(
        "order.print",
        printManagerPassword,
        orderId,
      );

      const r = await doPrintOnOrderApi(orderId, approval);

      try {
        await fetchCheques();
      } catch {}

      setPrintApprovalVisible(false);
      setPrintManagerPassword("");

      if (printMode === "qr") {
        message.info("Reimpresión sin impresora (modo QR)");
        openInvoicePreview(order);
        return;
      }

      const localBaseUrl =
        order?.restaurant?.localBaseUrl ??
        cheques.find((c) => c.id === orderId)?.restaurant?.localBaseUrl ??
        null;

      if (!localBaseUrl) {
        message.warning(
          "No se encontró la URL local de impresión (restaurant.localBaseUrl).",
        );
        openInvoicePreview(order);
        return;
      }

      const printerName = getDefaultPrinterName();
      if (!printerName) {
        message.warning("No hay impresora configurada (printerName).");
        openInvoicePreview(order);
        return;
      }

      const totals = calcInvoiceTotalsFromOrder(order);
      const subtotal = totals.subtotal;
      const iva = totals.tax;
      const total = totals.total;

      await sendTicketToPrintProxy({
        localBaseUrl,
        printerName,
        order,
        folioSeries: r.folioSeries,
        folioNumber: r.folioNumber,
        subtotal,
        iva,
        total,
      });

      message.success("Cuenta reimpresa (enviada a la impresora)");
      openInvoicePreview(order);
    } catch (e: any) {
      message.error(String(e?.message || "No se pudo reimprimir"));
    } finally {
      setPrintSubmitting(false);
    }
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
            <Button className="bg-white" onClick={() => setMapVisible(true)}>
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
        {/* ✅ Reimpresión: modal de contraseña admin */}
        <Modal
          title="Reimprimir cuenta"
          open={printApprovalVisible}
          onCancel={() => {
            if (!printSubmitting) {
              setPrintApprovalVisible(false);
              setPrintManagerPassword("");
            }
          }}
          onOk={handlePrintApprovalConfirm}
          okText={printSubmitting ? "Validando..." : "Autorizar y reimprimir"}
          cancelText="Cancelar"
          confirmLoading={printSubmitting}
        >
          <p className="text-sm text-gray-600">
            Esta cuenta ya fue impresa. Para reimprimir, ingresa la contraseña
            del administrador.
          </p>
          <Input.Password
            autoFocus
            value={printManagerPassword}
            onChange={(e) => setPrintManagerPassword(e.target.value)}
            placeholder="Contraseña administrador"
            onPressEnter={() => {
              if (!printSubmitting) handlePrintApprovalConfirm();
            }}
          />
        </Modal>

        <Modal
          title={"Acciones Orden"}
          footer={false}
          open={accionesChequeVisible}
          onCancel={() => setAccionesChequeVisible(false)}
        >
          <div className="w-full">
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    // 👇 solo deshabilita visualmente si estás procesando (opcional)
                    printSubmitting
                      ? "bg-gray-200 text-gray-500 cursor-wait"
                      : isOrderPrinted
                        ? "bg-amber-100 text-amber-900 hover:bg-amber-200 cursor-pointer"
                        : "bg-gray-300 text-gray-800 hover:bg-gray-400 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!printSubmitting) handlePrintAction();
                  }}
                  title={
                    isOrderPrinted
                      ? "Reimprimir (requiere contraseña de administrador)"
                      : printButtonTitle
                  }
                >
                  <FaPrint className="text-[22px]" />
                  {isOrderPrinted ? "Reimprimir" : printButtonLabel}
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
                Modo: {printSettings.printMode || "cargando..."} ·{" "}
                {isOrderPrinted
                  ? "Esta orden ya fue impresa (reimpresión requiere admin)"
                  : "Primera impresión"}
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
          visible={modalConsultaVisible}
          mesa={mesaReciente}
          detalle_cheque={detalle_cheque_consulta}
          orderCurrent={orderCurrent}
          onClose={() => {
            setModalConsultaVisible(false);
            setDetalle_cheque_consulta([]);
          }}
        />

        <Modal
          title="Ticket y QR"
          open={invoicePreviewVisible}
          onCancel={() => {
            setInvoicePreviewVisible(false);
            setInvoicePreviewOrder(null);
          }}
          footer={[
            <Button
              key="close-preview"
              onClick={() => {
                setInvoicePreviewVisible(false);
                setInvoicePreviewOrder(null);
              }}
            >
              Cerrar
            </Button>,
          ]}
          width={900}
          centered
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[3fr,2fr] gap-4">
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <div className="text-center text-lg font-semibold">
                  Ticket de orden
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Orden</span>
                  <span>#{invoicePreviewOrder?.id ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Mesa</span>
                  <span>{invoicePreviewOrder?.tableName ?? "—"}</span>
                </div>

                <div className="border-t border-dashed my-3" />

                <div className="space-y-3">
                  {invoiceItems.length ? (
                    invoiceItems.map((item, index) => (
                      <div
                        key={item.id ?? `${item.productId}-${index}`}
                        className="space-y-1"
                      >
                        <div className="flex justify-between text-sm font-medium">
                          <span className="capitalize">
                            {item.qty ?? 0} x {item.product?.name ?? "Producto"}
                          </span>
                          <span>{formatMoney(Number(item.total) || 0)}</span>
                        </div>
                        {item.notes ? (
                          <div className="text-xs text-gray-500">
                            {item.notes}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">
                      No hay productos registrados en esta orden.
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed my-3" />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatMoney(invoiceTotals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>IVA</span>
                    <span>{formatMoney(invoiceTotals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>{formatMoney(invoiceTotals.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col items-center gap-4">
                {invoiceUrl ? (
                  <>
                    <QRCodeCanvas value={invoiceUrl} size={180} includeMargin />
                    <div className="text-center text-sm text-gray-600">
                      Escanea para generar facturas
                    </div>
                    <div className="text-xs text-gray-500 text-center break-all">
                      {invoiceUrl}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500 text-center">
                    No hay restaurante asociado para generar facturas.
                  </div>
                )}
              </div>
            </div>
          </div>
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
            Area:{" "}
            {areaSeleccionadaNombre !== "Todas"
              ? areaSeleccionadaNombre
              : "Todas"}
          </div>
          <MesaMapPicker
            areaId={mapAreaId ?? null}
            selectedTableId={null}
            readOnly
          />
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
            <div className="text-sm text-gray-500">Turno: {shiftId ?? "—"}</div>
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
