import React, {
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  useMemo,
} from "react";
import { Modal, Button, Table, Tag, message, Space, InputNumber } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import TecladoVirtual from "./TecladoVirtual";
import ComentarioProductoModal from "./ComentarioProductoModal (1)";
import apiOrder from "./apis/apiOrder";
import { FaPrint } from "react-icons/fa";
import DescuentoProductoModal from "./DescuentoProductoModal";
import { useAuth } from "./Auth/AuthContext";

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
type Producto = {
  id: number;
  name: string;
  group: Grupo;
  subgrupo?: string;
  categoria: "alimentos" | "bebidas" | "otros";
  unidad: string;
  basePrice: number;
  contieneIVA: boolean;
  areaImpresion: "cocina" | "barra";
  suspendido: boolean;
  isEnabled: boolean;
  modifierGroups: ModifierGroups[];
  modifiers: Modifiers[];
  productModifierGroups: ProductModifierGroups[];
};
type Mitad = 0 | 1 | 2 | 3;
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
  idproductocompuesto: number; // id del producto principal al que pertenece el item
  ismodificador: boolean; // true si es una línea de modifier
  isproductocompuestoprincipal: boolean; // true si es la línea principal del compuesto
  mitad: Mitad; // 0/1/2/3 (ver arriba)
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
    idproductocompuesto: number;
    ismodificador: boolean;
    isproductocompuestoprincipal: boolean;
    mitad: Mitad;
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

      // nuevos campos:
      idproductocompuesto: opts.idproductocompuesto,
      ismodificador: opts.ismodificador,
      isproductocompuestoprincipal: opts.isproductocompuestoprincipal,
      mitad: opts.mitad,
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
      const res = await apiOrder.get("/products");

      // Filtra productos cuyo grupo exista y esté habilitado
      const productosHabilitados = res.data.filter(
        (p: { group?: { isEnabled?: boolean }; isEnabled: boolean }) =>
          p.group?.isEnabled && p.isEnabled
      );

      setProductos(productosHabilitados);
    } catch (error) {
      message.error("No se pudieron cargar productos");
    }
  };

  // Sigue igual tu efecto de carga inicial
  useEffect(() => {
    fetchProducts();
  }, []);

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

  const [productIdCompuest, setProductIdCompuest] = useState<number | null>(
    null
  );
  const [isModalCompuest, setIsModalCompuest] = useState<boolean>(false);

  const [configModifiersCurrentProduct, setConfigModifiersCurrentProduct] =
    useState<ProductModifierGroups[]>([]);

  // ------------------------
  // ESTADO ADICIONAL
  // ------------------------
  const [productoCompuestoActual, setProductoCompuestoActual] =
    useState<Producto | null>(null);

  // selectedByGroup: { [modifierGroupId]: number[] }  --> array de IDs de Modifiers en orden de selección
  const [selectedByGroup, setSelectedByGroup] = useState<
    Record<number, number[]>
  >({});
  // NUEVO estado:
  const [mitadByGroup, setMitadByGroup] = useState<Record<number, 1 | 2 | 3>>(
    {}
  );

  // Ya lo tienes:
  // const [configModifiersCurrentProduct, setConfigModifiersCurrentProduct] = useState<ProductModifierGroups[]>([]);
  // const [isModalCompuest, setIsModalCompuest] = useState(false);

  // ------------------------
  // DERIVADOS / HELPERS
  // ------------------------
  const mitadFactor = (m: 1 | 2 | 3) => (m === 1 ? 1 : 0.5);
  const configOrdenada = useMemo(
    () =>
      [...configModifiersCurrentProduct].sort(
        (a, b) => a.priority - b.priority
      ),
    [configModifiersCurrentProduct]
  );

  const getSelectedIds = (groupId: number) => selectedByGroup[groupId] ?? [];

  const canSubmit = useMemo(() => {
    // Todos los obligatorios deben tener al menos 1 seleccionado y ningún grupo debe superar su maxQty
    return configOrdenada.every((cfg) => {
      const cnt = getSelectedIds(cfg.modifierGroupId).length;
      const maxOk = cnt <= cfg.maxQty;
      const forcedOk = !cfg.isForced || cnt >= 1;
      return maxOk && forcedOk;
    });
  }, [configOrdenada, selectedByGroup]);

  const precioExtraDe = (m: Modifiers): number => {
    // Si no hay priceDelta, usamos el basePrice del producto del modifier como respaldo
    return m.priceDelta;
  };

  // const extrasSubtotalUnitario = useMemo(() => {
  //   // Suma de todos los seleccionados que EXCEDEN includedQty en cada grupo
  //   return configOrdenada.reduce((acc, cfg) => {
  //     const selIds = getSelectedIds(cfg.modifierGroupId);
  //     const mods = selIds
  //       .map((id) => cfg.modifierGroup.modifiers.find((x) => x.id === id))
  //       .filter(Boolean) as Modifiers[];

  //     const sumaGrupo = mods.reduce((suma, mod, idx) => {
  //       // Los primeros "includedQty" son gratis; del resto se cobra
  //       const costo = idx < cfg.includedQty ? 0 : precioExtraDe(mod);
  //       return suma + costo;
  //     }, 0);

  //     return acc + sumaGrupo;
  //   }, 0);
  // }, [configOrdenada, selectedByGroup]);
  const extrasSubtotalUnitario = useMemo(() => {
    return configOrdenada.reduce((acc, cfg) => {
      const selIds = getSelectedIds(cfg.modifierGroupId);
      const mMitad = mitadByGroup[cfg.modifierGroupId] ?? 1; // 1 = todo
      const factor = mitadFactor(mMitad);

      const modsSel = selIds
        .map((id) => cfg.modifierGroup.modifiers.find((x) => x.id === id))
        .filter(Boolean) as Modifiers[];

      const sumaGrupo = modsSel.reduce((suma, mod, idx) => {
        const base = idx < cfg.includedQty ? 0 : precioExtraDe(mod);
        return suma + base * factor;
      }, 0);

      return acc + sumaGrupo;
    }, 0);
  }, [configOrdenada, selectedByGroup, mitadByGroup]);

  const totalUnitario =
    Number(productoCompuestoActual?.basePrice ?? 0) +
    Number(extrasSubtotalUnitario);

  // ------------------------
  // TOGGLE DE SELECCIÓN
  // ------------------------
  const toggleModifier = (cfg: ProductModifierGroups, mod: Modifiers) => {
    setSelectedByGroup((prev) => {
      const arr = prev[cfg.modifierGroupId]
        ? [...prev[cfg.modifierGroupId]]
        : [];
      const idx = arr.indexOf(mod.id);

      if (idx > -1) {
        // deseleccionar
        arr.splice(idx, 1);
      } else {
        // agregar si no se pasó el max
        if (arr.length >= cfg.maxQty) {
          // opcional: podrías mostrar un aviso UI
          return prev;
        }
        arr.push(mod.id);
      }
      return { ...prev, [cfg.modifierGroupId]: arr };
    });
  };

  // ------------------------
  // ABRIR MODAL DESDE agregarProducto
  // ------------------------
  // const agregarProducto = (product: Producto) => {
  //   const isCompuesto = product.productModifierGroups.length > 0;

  //   if (isCompuesto) {
  //     const config = product.productModifierGroups;

  //     setProductoCompuestoActual(product);
  //     setSelectedByGroup({}); // limpiar selecciones previas
  //     setConfigModifiersCurrentProduct(config);
  //     setProductIdCompuest(product.id);
  //     setIsModalCompuest(true);
  //   } else {
  //     setDetalle_cheque((prev: any) => [
  //       ...prev,
  //       {
  //         productId: product.id,
  //         product,
  //         qty: cantidadSeleccionada,
  //         course: tiempoSeleccionado,
  //         orderId: orderIdCurrent,
  //         unitPrice: product.basePrice,
  //       },
  //     ]);
  //   }
  // };
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

        idproductocompuesto: product.id,
        ismodificador: false,
        isproductocompuestoprincipal: true,
        mitad: 0,
      });

      setDetalle_cheque((prev: OrderItem[]) => [...prev, item]);
    }
  };

  // ------------------------
  // GUARDAR (OK DEL MODAL)
  // ------------------------
  // const onRegistrarModifiers = () => {
  //   if (!productoCompuestoActual) return;

  //   const lineas: any[] = [];

  //   // Línea del producto base
  //   lineas.push({
  //     productId: productoCompuestoActual.id,
  //     product: productoCompuestoActual,
  //     qty: cantidadSeleccionada,
  //     course: tiempoSeleccionado,
  //     orderId: orderIdCurrent,
  //     unitPrice: productoCompuestoActual.basePrice,
  //   });

  //   // Líneas de modifiers (gratis vs extras)
  //   configOrdenada.forEach((cfg) => {
  //     const selIds = getSelectedIds(cfg.modifierGroupId);
  //     selIds.forEach((id, idx) => {
  //       const mod = cfg.modifierGroup.modifiers.find((x) => x.id === id);
  //       if (!mod) return;

  //       const unitPrice = idx < cfg.includedQty ? 0 : precioExtraDe(mod);

  //       lineas.push({
  //         productId: mod.modifier.id, // el ID del producto del modifier
  //         product: mod.modifier, // el producto del modifier
  //         qty: cantidadSeleccionada, // misma qty que el producto base
  //         course: tiempoSeleccionado,
  //         orderId: orderIdCurrent,
  //         unitPrice,
  //       });
  //     });
  //   });

  //   setDetalle_cheque((prev: any) => [...prev, ...lineas]);

  //   // Reset modal
  //   setIsModalCompuest(false);
  //   setProductoCompuestoActual(null);
  //   setSelectedByGroup({});
  //   setConfigModifiersCurrentProduct([]);
  // };
  const onRegistrarModifiers = () => {
    if (!productoCompuestoActual) return;

    const base = productoCompuestoActual;
    const lineas: OrderItem[] = [];

    // 1) Producto principal (mitad=0)
    lineas.push(
      makeOrderItem({
        orderId: orderIdCurrent,
        product: base,
        qty: cantidadSeleccionada, // entero
        unitPrice: base.basePrice,
        course: tiempoSeleccionado,
        idproductocompuesto: base.id,
        ismodificador: false,
        isproductocompuestoprincipal: true,
        mitad: 0,
      })
    );

    // 2) Modifiers (incluidos y extras; MITAD afecta qty)
    configOrdenada.forEach((cfg) => {
      const selIds = getSelectedIds(cfg.modifierGroupId);
      const mitad = (mitadByGroup[cfg.modifierGroupId] ?? 1) as 1 | 2 | 3;
      const factor = mitadFactor(mitad);

      selIds.forEach((id, idx) => {
        const mod = cfg.modifierGroup.modifiers.find((x) => x.id === id);
        if (!mod) return;

        const isIncluido = idx < cfg.includedQty;
        const unitPrice = isIncluido ? 0 : precioExtraDe(mod); // usa priceDelta o basePrice del modifier
        const qty = (cantidadSeleccionada ?? 1) * factor; // 1 o 0.5

        lineas.push(
          makeOrderItem({
            orderId: orderIdCurrent,
            product: mod.modifier,
            qty,
            unitPrice,
            course: tiempoSeleccionado,
            idproductocompuesto: base.id,
            ismodificador: true,
            isproductocompuestoprincipal: false,
            mitad,
          })
        );
      });
    });

    setDetalle_cheque((prev: OrderItem[]) => [...prev, ...lineas]);

    // Reset modal
    setIsModalCompuest(false);
    setProductoCompuestoActual(null);
    setSelectedByGroup({});
    setConfigModifiersCurrentProduct([]);
    setMitadByGroup({});
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
    { title: "Producto", dataIndex: ["producto", "name"] },
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
    {
      title: "Acción",
      render: (_: any, __: any, index: number) => (
        <div className="flex gap-1">
          <Button
            size="small"
            onClick={() => {
              setDescuentoIndex(index);
              setModalDescuentoVisible(true);
            }}
          >
            💸 Descuento
          </Button>
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => eliminarProducto(index)}
          />
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
            <Table
              className="w-full"
              dataSource={detalle_cheque}
              columns={columnas}
              rowKey={(_, i) => i?.toString() || ""}
              pagination={false}
              style={{ width: "100%" }}
            />
          </div>
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
            const selIds = getSelectedIds(cfg.modifierGroupId);
            const seleccionados = selIds.length;
            const incluidos = Math.min(cfg.includedQty, seleccionados);
            const faltanObligatorios = cfg.isForced && seleccionados < 1;

            return (
              <div key={cfg.modifierGroupId} className="border rounded-xl p-3">
                <div className="flex items-center justify-end gap-2 mt-2 text-xs">
                  <span className="text-gray-600">Aplicar a:</span>
                  <select
                    className="border rounded-md px-2 py-1"
                    value={mitadByGroup[cfg.modifierGroupId] ?? 1}
                    onChange={(e) =>
                      setMitadByGroup((prev) => ({
                        ...prev,
                        [cfg.modifierGroupId]: Number(e.target.value) as
                          | 1
                          | 2
                          | 3,
                      }))
                    }
                  >
                    <option value={1}>Todo</option>
                    <option value={2}>1ra mitad</option>
                    <option value={3}>2da mitad</option>
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
                    const isSelected = selIds.includes(m.id);
                    const idx = selIds.indexOf(m.id);
                    const esGratis = isSelected && idx < cfg.includedQty;
                    const precioMostrado = esGratis ? 0 : precioExtraDe(m);
                    const puedeElegirMas =
                      !isSelected && selIds.length < cfg.maxQty;

                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleModifier(cfg, m)}
                        className={`border rounded-lg p-2 text-left transition
                    ${isSelected ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400"}
                    ${!isSelected && !puedeElegirMas ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                        disabled={!isSelected && !puedeElegirMas}
                      >
                        <div className="font-medium leading-tight">
                          {m.modifier.name}
                        </div>
                        <div className="text-xs">
                          {isSelected
                            ? esGratis
                              ? "Incluido"
                              : `+ $${precioMostrado}`
                            : precioMostrado
                              ? `+ $${precioMostrado}`
                              : "+ $0"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs mt-2 text-gray-600">
                  Seleccionados: <b>{seleccionados}</b> / {cfg.maxQty} — Gratis:{" "}
                  <b>{incluidos}</b>
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
