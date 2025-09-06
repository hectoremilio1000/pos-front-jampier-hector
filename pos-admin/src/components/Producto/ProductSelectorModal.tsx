import { useEffect, useState } from "react";
import {
  Modal,
  Input,
  List,
  Button,
  message,
  Space,
  Tabs,
  Select,
  InputNumber,
  Switch,
} from "antd";
import apiOrder from "../apis/apiOrder";
import { nextCodeForGroup } from "@/utils/nextCode";

/* ---- tipo con los campos completos ---- */
export interface ProductMod {
  id: number | null; // < null mientras no exista en la BD
  groupId: number;
  subgroupId: number | null;
  code: string;
  name: string;
  basePrice: number;
  taxRate: number;
  isEnabled: boolean;
  isNew: boolean; // < marca para tu save()
}

interface Props {
  open: boolean;
  onClose: () => void;
  excludeIds: number[]; // productos que NO se muestran
  onSelect: (p: ProductMod) => void; // retorna UNO por vez
  parentGroupId: number;
  modifiersGroups: any;
}

/* Modal buscador / creador rápido de productos‑modificador */
export default function ProductSelectorModal({
  open,
  onClose,
  excludeIds,
  onSelect,
  parentGroupId,
  modifiersGroups,
}: Props) {
  /* pestaña: 'search' | 'new' */
  const [mode, setMode] = useState<"search" | "new">("search");

  /* catálogo */
  const [products, setProducts] = useState<ProductMod[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  /* búsqueda */
  const [q, setQ] = useState("");

  /* campos NUEVO producto */
  const [groupId, setGroupId] = useState<number>(0);
  const [subgroupId, setSubgroupId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    const groupCode = groups.find((g) => g.id === groupId)?.code ?? "";
    if (!groupCode) return;

    const isSameAsParent = groupId === parentGroupId;
    const lengthProductsGroup = products.filter(
      (p) => p.groupId === groupId
    ).length;

    const totalModifiers = modifiersGroups.reduce((acc: any, group: any) => {
      return acc + group.modifiers.length;
    }, 0);

    const offset = isSameAsParent
      ? lengthProductsGroup + totalModifiers + 1 + 1
      : 1;

    const newCode = nextCodeForGroup(groupCode, products, groupId, offset);
    setCode(newCode);
  }, [groupId, parentGroupId, groups, products]);

  /* cargar catálogos una vez al abrir */
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [prods, grps] = await Promise.all([
          apiOrder.get("/products"),
          apiOrder.get("/groups"),
        ]);
        setProducts(prods.data);
        setGroups(grps.data);
      } catch {
        message.error("Error cargando datos");
      }
    })();
  }, [open]);

  const subgroups = groups.find((g) => g.id === groupId)?.subgroups || [];

  /* --- filtrado --- */
  const lower = q.toLowerCase();
  const filtered = products.filter(
    (p) =>
      !excludeIds.includes(p.id ?? 0) &&
      (p.name.toLowerCase().includes(lower) ||
        p.code.toLowerCase().includes(lower))
  );

  /* --- seleccionar existente --- */
  const choose = (p: any) => {
    onSelect({ ...p, isNew: false }); // devolvemos tal cual
    onClose();
  };

  /* --- crear en memoria --- */
  const saveNew = () => {
    if (!groupId || !code.trim() || !name.trim()) {
      return message.warning("Grupo, código y nombre son obligatorios");
    }

    const tmp: ProductMod = {
      id: null, // aún no existe en BD
      groupId,
      subgroupId,
      code,
      name,
      basePrice,
      taxRate,
      isEnabled,
      isNew: true,
    };

    onSelect(tmp);
    /* reseteamos */
    setGroupId(0);
    setSubgroupId(null);
    setCode("");
    setName("");
    setBasePrice(0);
    setTaxRate(0);
    setIsEnabled(true);
    setMode("search");
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={mode === "search" ? undefined : saveNew}
      okText="Crear"
      cancelText="Cerrar"
      width={600}
      title="Seleccione o cree un modificador"
    >
      <Tabs
        activeKey={mode}
        onChange={(k) => setMode(k as "search" | "new")}
        items={[
          { key: "search", label: "Buscar existente" },
          { key: "new", label: "Crear nuevo" },
        ]}
      />

      {/* -------- BUSCAR -------- */}
      {mode === "search" && (
        <>
          <Input
            placeholder="Buscar por nombre o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
          />

          <List
            className="mt-3"
            dataSource={filtered}
            locale={{ emptyText: "Sin resultados" }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button size="small" type="link" onClick={() => choose(item)}>
                    Elegir
                  </Button>,
                ]}
              >
                <Space direction="vertical" size={0}>
                  <span className="font-medium">
                    {item.name}{" "}
                    <span className="text-gray-400">({item.code})</span>
                  </span>
                </Space>
              </List.Item>
            )}
          />
        </>
      )}

      {/* -------- CREAR NUEVO -------- */}
      {mode === "new" && (
        <Space direction="vertical" className="w-full" size="small">
          <Select
            placeholder="Grupo *"
            className="w-full"
            value={groupId || undefined}
            onChange={(v) => {
              setGroupId(v);
              setSubgroupId(null); // reset subgrupo
            }}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />

          <Select
            placeholder="Subgrupo (opcional)"
            className="w-full"
            allowClear
            value={subgroupId ?? undefined}
            onChange={(v) => setSubgroupId(v ?? null)}
            options={subgroups.map((s: any) => ({
              value: s.id,
              label: s.name,
            }))}
          />

          <Input
            placeholder="Código *"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Input
            placeholder="Nombre *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <InputNumber
            className="w-full"
            addonBefore="$"
            placeholder="Precio base"
            value={basePrice}
            onChange={(v) => setBasePrice(v ?? 0)}
          />
          <InputNumber
            className="w-full"
            addonAfter="%"
            placeholder="IVA"
            value={taxRate}
            onChange={(v) => setTaxRate(v ?? 0)}
          />

          <div className="flex items-center gap-2">
            <span>Activo</span>
            <Switch checked={isEnabled} onChange={setIsEnabled} />
          </div>

          <Button type="primary" block onClick={saveNew}>
            Crear y usar este producto
          </Button>
        </Space>
      )}
    </Modal>
  );
}
