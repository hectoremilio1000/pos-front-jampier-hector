import React, {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  useMemo,
} from "react";
import { Modal, Button, Tag, message, Space, InputNumber } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import TecladoVirtual from "./TecladoVirtual";
import ComentarioProductoModal from "./ComentarioProductoModal (1)";
import apiOrder from "./apis/apiOrder";
import { FaPrint } from "react-icons/fa";
import DescuentoProductoModal from "./DescuentoProductoModal";
import { useAuth } from "./Auth/AuthContext";
import ComandaTable from "./Comandero/ComandaTable";

type SelectedMod = { id: number; half: 1 | 2 | 3 }; // 1=todo, 2=1ra half, 3=2da half
type Grupo = {
  id: number;
  name: string;
  isEnabled: boolean;
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
type half = 0 | 1 | 2 | 3;
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
  // NUEVOS CAMPOS:
  compositeProductId: number | null; // id del producto principal al que pertenece el item
  isModifier: boolean; // true si es una línea de modifier
  isCompositeProductMain: boolean; // true si es la línea principal del compuesto
  half: half; // 0/1/2/3 (ver arriba)
  route_area_id: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mesa: number;
  detalle_cheque: OrderItem[];
  setDetalle_cheque: Dispatch<SetStateAction<OrderItem[]>>;
  mandarComanda: () => void;
  orderIdCurrent: number | null;
};

const CapturaComandaModal: React.FC<Props> = ({
  visible,
  onClose,
  mesa,
  detalle_cheque,
  setDetalle_cheque,
  mandarComanda,
  orderIdCurrent,
}) => {
  function makeOrderItem(opts: {
    orderId: number | null;
    product: Producto;
    qty: number;
    unitPrice: number;
    course: number;
    // flags nuevos:
    compositeProductId: number | null;
    isModifier: boolean;
    isCompositeProductMain: boolean;
    half: half;
    // opcionales:
    notes?: string | null;
    status?: string | null;
  }): OrderItem {
    const total = Number((opts.qty * opts.unitPrice).toFixed(2));

    return {
      orderId: opts.orderId,
      productId: opts.product.id,
      qty: opts.qty,
      unitPrice: opts.unitPrice,
      total,
      notes: opts.notes ?? null,
      course: opts.course,
      discountType: null,
      discountValue: null,
      discountAmount: null,
      discountAppliedBy: null,
      discountReason: null,
      product: opts.product,
      status: opts.status ?? null,
      route_area_id: opts.product.printArea,
      // nuevos campos:
      compositeProductId: opts.compositeProductId,
      isModifier: opts.isModifier,
      isCompositeProductMain: opts.isCompositeProductMain,
      half: opts.half,
    };
  }

  const { user } = useAuth();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [cantidadSeleccionada, setCantidadSeleccionada] = useState(1);
  const [tiempoSeleccionado, setTiempoSeleccionado] = useState(1);
  const [comentarioIndex, setComentarioIndex] = useState<number | null>(null);
  const [modalComentarioVisible, setModalComentarioVisible] = useState(false);

  const [buscando, setBuscando] = useState<"grupo" | "producto" | null>(null);
  const [busquedaGrupo, setBusquedaGrupo] = useState("");
  const [busquedaProducto, setBusquedaProducto] = useState("");

  const incrementar = () => setCantidadSeleccionada((prev) => prev + 1);
  const decrementar = () =>
    setCantidadSeleccionada((prev) => Math.max(1, prev - 1));

  const tiempos = [
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

  // Si esta función se usa en varios lugares, conviene memorizarla con useCallback
  const fetchProducts = async () => {
    try {
      const res = await apiOrder.get("/kiosk/products");
      const productosHabilitados = res.data.filter(
        (p: { group?: { isEnabled?: boolean }; isEnabled: boolean }) =>
          (p.group?.isEnabled ?? true) && p.isEnabled
      );
      setProductos(productosHabilitados);
    } catch (error) {
      console.error(error);
      message.error("No se pudieron cargar productos");
    }
  };

  // carga cuando el modal se abre
  useEffect(() => {
    if (visible) fetchProducts();
  }, [visible]);

  // Sigue igual tu efecto de carga inicial
  useEffect(() => {
    if (visible) fetchProducts();
  }, [visible]);

  const applyFilters = () => {
    const productosFiltrados = productos.filter(
      (p) =>
        (busquedaGrupo === "" ||
          p.group.name.toLowerCase().includes(busquedaGrupo.toLowerCase())) &&
        (busquedaProducto === "" ||
          p.name.toLowerCase().includes(busquedaProducto.toLowerCase()))
    );
    setProductosFiltrados(productosFiltrados);
  };
  useEffect(() => {
    applyFilters();
  }, [productos, busquedaProducto, busquedaGrupo]);
  const getGrupos = () => {
    const nombresHabilitados = productos
      .filter((p) => p.group?.isEnabled) // solo grupos habilitados
      .map((p) => p.group!.name); // ya sabemos que existe, así que ! está OK

    setGrupos([...new Set(nombresHabilitados)]);
  };

  useEffect(() => {
    getGrupos();
  }, [productos]);

  const [isModalCompuest, setIsModalCompuest] = useState<boolean>(false);

  const [configModifiersCurrentProduct, setConfigModifiersCurrentProduct] =
    useState<ProductModifierGroups[]>([]);

  // ------------------------
  // ESTADO ADICIONAL
  // ------------------------
  const [productoCompuestoActual, setProductoCompuestoActual] =
    useState<Producto | null>(null);

  // HELPERS

  // Ya tienes estos estados:
  const [selectedByGroup, setSelectedByGroup] = useState<
    Record<number, SelectedMod[]>
  >({});
  const [halfByGroup, sethalfByGroup] = useState<Record<number, 1 | 2 | 3>>({});

  const getSelected = (groupId: number) => selectedByGroup[groupId] ?? [];
  const halfFactor = (m: 1 | 2 | 3) => (m === 1 ? 1 : 0.5);

  // Suma de pesos seleccionados en el grupo
  const groupWeight = (groupId: number) =>
    getSelected(groupId).reduce((s, it) => s + halfFactor(it.half), 0);

  // ¿Agregar con el scope actual excedería el máximo por peso?
  const wouldExceed = (cfg: ProductModifierGroups, scope: 1 | 2 | 3) =>
    groupWeight(cfg.modifierGroupId) + halfFactor(scope) > cfg.maxQty + EPS;

  // Peso incluido efectivamente (gratis) en el grupo, aplicando orden de selección.
  // NO hay inclusión parcial: si queda 0.5 y el item pesa 1, no se incluye nada de ese item.
  const includedUsedWeight = (cfg: ProductModifierGroups) => {
    const arr = getSelected(cfg.modifierGroupId);
    let remaining = cfg.includedQty;
    let used = 0;
    for (const item of arr) {
      const w = halfFactor(item.half);
      if (remaining + EPS >= w) {
        used += w;
        remaining -= w;
      } else {
        // no parcial: los siguientes ya no pueden ser incluidos
        // (orden de selección manda)
        // break; // podrías cortar aquí si quieres
      }
    }
    return used;
  };

  // ¿Este item ya seleccionado entra como "incluido" según su posición?
  const isItemIncludedByIndex = (
    cfg: ProductModifierGroups,
    idxSel: number
  ) => {
    const arr = getSelected(cfg.modifierGroupId);
    let prev = 0;
    for (let i = 0; i < arr.length && i <= idxSel; i++) {
      const w = halfFactor(arr[i].half);
      if (i === idxSel) {
        return prev + w <= cfg.includedQty + EPS;
      }
      if (prev + w <= cfg.includedQty + EPS) prev += w;
    }
    return false;
  };

  const configOrdenada = useMemo(
    () =>
      [...configModifiersCurrentProduct].sort(
        (a, b) => a.priority - b.priority
      ),
    [configModifiersCurrentProduct]
  );

  const EPS = 1e-6; // evita problemas 0.5+0.5=0.999999
  const canSubmit = useMemo(() => {
    return configOrdenada.every((cfg) => {
      const w = groupWeight(cfg.modifierGroupId);
      const maxOk = w <= cfg.maxQty + EPS;
      const forcedOk = !cfg.isForced || w > 0;
      const includedOk = w + EPS >= cfg.includedQty; // ¡clave!
      return maxOk && forcedOk && includedOk;
    });
  }, [configOrdenada, selectedByGroup]);

  const precioExtraDe = (m: Modifiers): number => m.priceDelta;

  const extrasSubtotalUnitario = useMemo(() => {
    return configOrdenada.reduce((acc, cfg) => {
      const selArr = getSelected(cfg.modifierGroupId); // en orden
      let remainingIncluded = cfg.includedQty;
      let sumaGrupo = 0;

      selArr.forEach((item) => {
        const mod = cfg.modifierGroup.modifiers.find((x) => x.id === item.id);
        if (!mod) return;
        const w = halfFactor(item.half);
        const price = precioExtraDe(mod);

        if (remainingIncluded + EPS >= w) {
          // incluido total (gratis)
          remainingIncluded -= w;
        } else {
          // no parcial: este item completo se cobra
          sumaGrupo += price * w;
        }
      });

      return acc + sumaGrupo;
    }, 0);
  }, [configOrdenada, selectedByGroup]);

  const totalUnitario =
    (productoCompuestoActual?.basePrice ?? 0) + extrasSubtotalUnitario;

  // ------------------------
  // TOGGLE DE SELECCIÓN
  // ------------------------
  const toggleModifier = (cfg: ProductModifierGroups, mod: Modifiers) => {
    const scope = (halfByGroup[cfg.modifierGroupId] ?? 1) as 1 | 2 | 3;

    setSelectedByGroup((prev) => {
      const arr = [...(prev[cfg.modifierGroupId] ?? [])];
      const idx = arr.findIndex((x) => x.id === mod.id);

      if (idx !== -1) {
        // quitar
        arr.splice(idx, 1);
        return { ...prev, [cfg.modifierGroupId]: arr };
      } else {
        // agregar respetando el máximo por PESO
        if (wouldExceed(cfg, scope)) {
          message.warning(
            `No puedes seleccionar más de ${cfg.maxQty} en “${cfg.modifierGroup.name}”.`
          );
          return prev;
        }
        arr.push({ id: mod.id, half: scope });
        return { ...prev, [cfg.modifierGroupId]: arr };
      }
    });
  };

  // ------------------------
  // ABRIR MODAL DESDE agregarProducto
  // -----------------------
  const agregarProducto = (product: Producto) => {
    const isCompuesto = product.productModifierGroups.length > 0;

    if (isCompuesto) {
      const config = product.productModifierGroups;
      setProductoCompuestoActual(product);
      setSelectedByGroup({});
      setConfigModifiersCurrentProduct(config);
      setProductIdCompuest(product.id);
      setIsModalCompuest(true);
    } else {
      const item = makeOrderItem({
        orderId: orderIdCurrent,
        product,
        qty: cantidadSeleccionada,
        unitPrice: product.basePrice,
        course: tiempoSeleccionado,

        compositeProductId: null,
        isModifier: false,
        isCompositeProductMain: true,
        half: 0,
        status: "sent",
      });

      setDetalle_cheque((prev: OrderItem[]) => [...prev, item]);
    }
  };

  // ------------------------
  // GUARDAR (OK DEL MODAL)
  // ------------------------
  const onRegistrarModifiers = () => {
    if (!productoCompuestoActual) return;

    const base = productoCompuestoActual;
    const lineas: OrderItem[] = [];

    // 1) Principal
    lineas.push(
      makeOrderItem({
        orderId: orderIdCurrent,
        product: base,
        qty: cantidadSeleccionada,
        unitPrice: base.basePrice,
        course: tiempoSeleccionado,
        compositeProductId: base.id,
        isModifier: false,
        isCompositeProductMain: true,
        half: 1, // 0 lo usas para principal si así lo definiste; ajusta si aplica
      })
    );

    // 2) Modifiers (INCLUSIÓN POR PESO: 1 = todo, 0.5 = mitad)
    configOrdenada.forEach((cfg) => {
      const selected = getSelected(cfg.modifierGroupId); // [{ id, half }] en orden de selección
      let remainingIncluded = cfg.includedQty;

      selected.forEach((item) => {
        const mod = cfg.modifierGroup.modifiers.find((x) => x.id === item.id);
        if (!mod) return;

        const w = halfFactor(item.half); // 1 o 0.5
        const fitsAsIncluded = remainingIncluded + EPS >= w; // ¿cabe completo?
        const unitPrice = fitsAsIncluded ? 0 : precioExtraDe(mod);
        const qty = (cantidadSeleccionada ?? 1) * w;

        lineas.push(
          makeOrderItem({
            orderId: orderIdCurrent,
            product: mod.modifier,
            qty, // 1 o 0.5 de la cantidad seleccionada
            unitPrice, // 0 si cabe en included, precio si no
            course: tiempoSeleccionado,
            compositeProductId: base.id,
            isModifier: true,
            isCompositeProductMain: false,
            half: item.half,
          })
        );

        if (fitsAsIncluded) remainingIncluded -= w; // consume cupo
      });
    });
    console.log(lineas);
    setDetalle_cheque((prev: OrderItem[]) => [...prev, ...lineas]);

    // Reset modal/estados
    setIsModalCompuest(false);
    setProductoCompuestoActual(null);
    setSelectedByGroup({});
    setConfigModifiersCurrentProduct([]);
    sethalfByGroup({});
  };

  const eliminarProducto = (index: number) => {
    setDetalle_cheque((prev: any) =>
      prev.filter((_: any, i: number) => i !== index)
    );
  };

  const cambiarComentario = (index: number, texto: string) => {
    const nueva = [...detalle_cheque];
    nueva[index].notes = texto;
    setDetalle_cheque(nueva);
    setComentarioIndex(null);
    setModalComentarioVisible(false);
  };
  const [modalDescuentoVisible, setModalDescuentoVisible] = useState(false);
  const [descuentoIndex, setDescuentoIndex] = useState<number | null>(null);

  const aplicarDescuento = (
    index: number,
    tipo: "percent" | "fixed",
    valor: number,
    comentario: string
  ) => {
    const nuevos = [...detalle_cheque];
    const item = nuevos[index];
    console.log(item);

    const subtotal = item.unitPrice * item.qty;
    const discountAmount =
      tipo === "percent" ? subtotal * (valor / 100) : valor;
    if (user) {
      nuevos[index] = {
        ...item,
        discountType: tipo,
        discountValue: valor,
        discountAmount,
        discountReason: comentario,
        discountAppliedBy: user?.id, // si lo tienes en contexto
      };

      setDetalle_cheque(nuevos);
      setModalDescuentoVisible(false);
      setDescuentoIndex(null);
    }
  };

  const columnas = [
    {
      title: "Acción",
      render: (_: any, __: any, index: number) => (
        <div className="flex gap-1">
          {/* <Button
            size="small"
            onClick={() => {
              setDescuentoIndex(index);
              setModalDescuentoVisible(true);
            }}
          >
            💸 Descuento
          </Button> */}
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => eliminarProducto(index)}
          />
        </div>
      ),
    },
    {
      title: "Producto",
      render: (_: any, __: any, index: number) => {
        const item = detalle_cheque[index];
        const isModifier = item.isModifier;
        return isModifier ? `>>>${item.product.name}` : `${item.product.name}`;
      },
    },
    { title: "Cant", dataIndex: "qty" },
    { title: "P. Unitario", dataIndex: "unitPrice" },
    { title: "Total", dataIndex: "total" },
    {
      title: "Tiempo",
      dataIndex: "course",
      render: (tiempo: number) => {
        const tas = tiempos.find((t) => t.value === tiempo);
        return <Tag> {tas?.label}</Tag>;
      },
    },
    // {
    //   title: "Descuento",
    //   render: (_: any, __: any, index: number) => {
    //     const item = detalle_cheque[index];
    //     console.log(item);
    //     if (item.discountValue !== null && item.discountValue > 0) {
    //       return (
    //         <Tag color="green">
    //           {item.discountType === "percent"
    //             ? `${item.discountValue}%`
    //             : `-$${item.discountAmount}`}
    //         </Tag>
    //       );
    //     }
    //     return <Tag color="default">Sin descuento</Tag>;
    //   },
    // },
    {
      title: "Comentario",
      render: (_: any, __: any, index: number) => (
        <Button
          size="small"
          onClick={() => {
            setComentarioIndex(index);
            setModalComentarioVisible(true);
          }}
        >
          💬 {detalle_cheque[index].notes ? "✔️" : ""}
        </Button>
      ),
    },
  ];
  const sumarTotalComanda = () => {
    const sumaTotal = detalle_cheque.reduce((acc, item) => acc + item.total, 0);
    return sumaTotal.toFixed(2);
  };

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
        <div className="w-5/12">
          <div className="w-full gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">Cantidad:</span>
              <Space.Compact>
                <Button onClick={decrementar}>-</Button>
                <InputNumber
                  min={1}
                  value={cantidadSeleccionada}
                  onChange={(value) => {
                    if (typeof value === "number" && value >= 1)
                      setCantidadSeleccionada(value);
                  }}
                />
                <Button onClick={incrementar}>+</Button>
              </Space.Compact>
            </div>
            <div className="w-full my-2">
              <span className="font-bold">Tiempo:</span>
              {tiempos.map((t) => (
                <Button
                  key={t.value}
                  type={t.value === tiempoSeleccionado ? "primary" : "default"}
                  onClick={() => setTiempoSeleccionado(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setDetalle_cheque([])}
            >
              Eliminar todo
            </Button>
            <Button
              onClick={() => mandarComanda()}
              type="primary"
              icon={<FaPrint />}
            >
              Comandar
            </Button>
          </div>
          <div className="w-full overflow-auto">
            {/* <Table
              className="w-full"
              dataSource={detalle_cheque}
              columns={columnas}
              rowKey={(_, i) => i?.toString() || ""}
              pagination={false}
              style={{ width: "100%" }}
            /> */}
            <ComandaTable
              detalle_cheque={detalle_cheque}
              eliminarProducto={eliminarProducto}
              setComentarioIndex={setComentarioIndex}
              setModalComentarioVisible={setModalComentarioVisible}
              tiempos={tiempos}
            />
          </div>
          <p className="text-2xl font-bold">Total: {sumarTotalComanda()}</p>
        </div>

        <div className="w-7/12 max-h-[650px] overflow-y-auto pr-2 border-l-2 border-gray-200 pl-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {grupos.map((g, index) => (
              <button
                className={`cursor-pointer rounded px-2 py-2  ${g === busquedaGrupo ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"}`}
                key={index}
                onClick={() => setBusquedaGrupo(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="mb-2">
            <div className="mb-1 font-semibold">Buscar producto</div>
            <input
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              onClick={() => setBuscando("producto")}
              className="w-full px-2 py-1 border rounded mb-4"
              placeholder="Toca para buscar producto..."
            />
            <button
              className="px-3 py-2 rounded bg-gray-200 text-gray-900 text-sm"
              onClick={() => fetchProducts()}
            >
              Refresh
            </button>
            {buscando === "producto" ? (
              <>
                <button
                  onClick={() => setBuscando(null)}
                  className="bg-gray-100 text-gray-500 px-2 py-2 rounded"
                >
                  cerrar
                </button>
                <TecladoVirtual
                  text={busquedaProducto}
                  setTexto={setBusquedaProducto}
                  onKeyPress={(v) => {
                    setBusquedaProducto((prev) => prev + v);
                  }}
                  onBackspace={() => {
                    setBusquedaProducto((prev) => prev.slice(0, -1));
                  }}
                  onSpace={() => {
                    setBusquedaProducto((prev) => prev + " ");
                  }}
                  onClear={() => {
                    setBusquedaProducto("");
                  }}
                />
              </>
            ) : null}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarProducto(p)}
                className="bg-orange-400 hover:bg-orange-500 text-white py-3 px-2 rounded text-sm text-center"
              >
                {p.name} <br /> ${p.basePrice}
              </button>
            ))}
          </div>
        </div>
      </div>

      {comentarioIndex !== null && (
        <ComentarioProductoModal
          visible={modalComentarioVisible}
          comentarioInicial={detalle_cheque[comentarioIndex]?.notes || ""}
          onClose={() => {
            setModalComentarioVisible(false);
            setComentarioIndex(null);
          }}
          onGuardar={(texto) => cambiarComentario(comentarioIndex, texto)}
        />
      )}
      {descuentoIndex !== null && (
        <DescuentoProductoModal
          visible={true}
          onClose={() => {
            setModalDescuentoVisible(false);
            setDescuentoIndex(null);
          }}
          descuentoInicial={{
            tipo: detalle_cheque[descuentoIndex].discountType as any,
            valor: detalle_cheque[descuentoIndex].discountValue,
            comentario: detalle_cheque[descuentoIndex].discountReason || "",
          }}
          onGuardar={(tipo, valor, comentario) =>
            aplicarDescuento(descuentoIndex, tipo, valor, comentario)
          }
        />
      )}
      <Modal
        open={isModalCompuest}
        onCancel={() => {
          setIsModalCompuest(false);
          setProductoCompuestoActual(null);
          setSelectedByGroup({});
        }}
        okText="Guardar cambios"
        onOk={onRegistrarModifiers}
        okButtonProps={{ disabled: !canSubmit }}
      >
        <h1 className="text-lg font-semibold mb-2">
          Modificadores{" "}
          {productoCompuestoActual ? `— ${productoCompuestoActual.name}` : ""}
        </h1>

        <div className="space-y-4">
          {configOrdenada.map((cfg) => {
            const selArr = getSelected(cfg.modifierGroupId); // [{id, half}]
            const weight = selArr.reduce((s, x) => s + halfFactor(x.half), 0);
            const gratisWeight = includedUsedWeight(cfg); // puede ser 0.5, 1, etc.
            const faltanObligatorios = cfg.isForced && weight <= 0;

            return (
              <div key={cfg.modifierGroupId} className="border rounded-xl p-3">
                <div className="flex items-center justify-end gap-2 mt-2 text-xs">
                  <span className="text-gray-600">Aplicar a:</span>
                  <select
                    className="border rounded-md px-2 py-1"
                    value={halfByGroup[cfg.modifierGroupId] ?? 1}
                    onChange={(e) =>
                      sethalfByGroup((prev) => ({
                        ...prev,
                        [cfg.modifierGroupId]: Number(e.target.value) as
                          | 1
                          | 2
                          | 3,
                      }))
                    }
                  >
                    <option value={1}>Todo</option>
                    <option value={2}>1ra half</option>
                    <option value={3}>2da half</option>
                  </select>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      {cfg.modifierGroup.code}
                    </div>
                    <div className="text-base font-semibold">
                      {cfg.modifierGroup.name}
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div>
                      Incluye: <b>{cfg.includedQty}</b>
                    </div>
                    <div>
                      Máx: <b>{cfg.maxQty}</b>
                    </div>
                    {cfg.isForced ? (
                      <span
                        className={`font-medium ${faltanObligatorios ? "text-red-600" : "text-green-600"}`}
                      >
                        {faltanObligatorios
                          ? "Obligatorio (pendiente)"
                          : "Obligatorio (ok)"}
                      </span>
                    ) : (
                      <span className="text-gray-500">Opcional</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  {cfg.modifierGroup.modifiers.map((m) => {
                    const selArr = getSelected(cfg.modifierGroupId);
                    const idxSel = selArr.findIndex((x) => x.id === m.id);
                    const selObj = idxSel !== -1 ? selArr[idxSel] : null;

                    // ¿Puede clickear? (si ya está seleccionado, siempre; si no, que no exceda el peso)
                    const scope = (halfByGroup[cfg.modifierGroupId] ?? 1) as
                      | 1
                      | 2
                      | 3;
                    const canPick = idxSel !== -1 || !wouldExceed(cfg, scope);

                    // Label:
                    let label = "";
                    if (selObj) {
                      // seleccionado: usa su propia half y si entra como "incluido" según orden/peso
                      const w = halfFactor(selObj.half);
                      const esIncluido = isItemIncludedByIndex(cfg, idxSel);
                      label = esIncluido
                        ? `Incluido${selObj.half !== 1 ? " · 1/2" : ""}`
                        : `+ $${(precioExtraDe(m) * w).toFixed(2)}${selObj.half !== 1 ? " · 1/2" : ""}`;
                    } else {
                      // preview no seleccionado: ¿con el scope actual entraría como incluido completo?
                      const used = includedUsedWeight(cfg);
                      const w = halfFactor(scope);
                      const previewIncluido = used + w <= cfg.includedQty + EPS;
                      const previewPrice = previewIncluido
                        ? 0
                        : precioExtraDe(m) * w;

                      label = previewIncluido
                        ? `Incluido${scope !== 1 ? " · 1/2" : ""}`
                        : `+ $${previewPrice.toFixed(2)}${scope !== 1 ? " · 1/2" : ""}`;
                    }

                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModifier(cfg, m)}
                        disabled={!canPick}
                        className={`border rounded-lg p-2 text-left transition
        ${idxSel !== -1 ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400"}
        ${!canPick && idxSel === -1 ? "opacity-50 cursor-not-allowed" : ""}
      `}
                      >
                        <div className="font-medium leading-tight">
                          {m.modifier.name}
                        </div>
                        <div className="text-xs">{label}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs mt-2 text-gray-600">
                  Seleccionados:{" "}
                  <b>{Number.isInteger(weight) ? weight : weight.toFixed(1)}</b>{" "}
                  / {cfg.maxQty} — Gratis:{" "}
                  <b>
                    {Number.isInteger(gratisWeight)
                      ? gratisWeight
                      : gratisWeight.toFixed(1)}
                  </b>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t pt-3 mt-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Precio base</span>
            <span>
              ${Number(productoCompuestoActual?.basePrice).toFixed(2) ?? "0.00"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Extras (unidad)</span>
            <span>${Number(extrasSubtotalUnitario).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total (unidad)</span>
            <span>${Number(totalUnitario).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total x cantidad</span>
            <span>
              ${Number(totalUnitario * (cantidadSeleccionada ?? 1)).toFixed(2)}
            </span>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

export default CapturaComandaModal;
