import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  message,
  Space,
  Select,
  Switch,
  InputNumber,
  Popconfirm,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import { nextCodeForGroup } from "@/utils/nextCode";

interface AreaImpresion {
  id: number;
  name: string;
  restaurantId: number;
}
interface ProductoForm {
  name: string;
  code: string;
  groupId: number | null;
  printArea: number | null;
  subgroupId: number | null;
  price: number;
  taxRate: number;
  enabled: boolean;
}
interface Producto {
  id: number;
  name: string;
  code: string;
  groupId: number;
  printArea: number | null;
  areaImpresion: AreaImpresion | null;
  subgroupId: number | null;
  price: number;
  taxRate: number;
  enabled: boolean;
}
interface ModifierForm {
  //  crear el modifierForm
  modifierGroupId: number | null;
  modifierId: number | null;
  priceDelta: number;
  isEnabled: boolean;
}
export interface ModifierItem {
  id: number;
  modifierGroupId: number; // id de producto existente (o null si es nuevo)
  modifierId: number; // id de producto existente (o null si es nuevo)
  /* datos de la relación */
  priceDelta: number;
  isEnabled: boolean;
  modifier: Producto;
}

interface ModifierGroup {
  id: number;
  name: string;
  code: string;
  modifiers: ModifierItem[];
}

export default function ModificadoresPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isShowModifiersModal, setIsShowModifiersModal] = useState(false);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);

  const [editingModifier, setEditingModifier] = useState<ModifierItem | null>(
    null
  );

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    code: "",
  });
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [modifiersCurrent, setModifiersCurrent] = useState<ModifierItem[]>([]);
  const [catalogGroups, setCatalogGroups] = useState<any[]>([]);

  const [productForm, setProductForm] = useState<ProductoForm>({
    name: "",
    code: "",
    groupId: null,
    printArea: null,
    subgroupId: null,
    price: 0,
    taxRate: 0,
    enabled: false,
  });
  const [products, setProducts] = useState<Producto[]>([]);
  const patchProduct = (p: Partial<ProductoForm>) =>
    setProductForm({ ...productForm, ...p });
  const subgroups =
    catalogGroups.find((g) => g.id === productForm.groupId)?.subgroups || [];

  const patchModifier = (m: Partial<ModifierForm>) =>
    setModifierForm({ ...modifierForm, ...m });

  const [currentGroup, setCurrentGroup] = useState<ModifierGroup | null>(null);

  const fetchModifierGroups = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/modifier-groups");
      console.log(res);
      setGroups(res.data);
    } catch {
      message.error("Error al cargar modificadores");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModifierGroups();
  }, []);
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/products");
      console.log(res);
      setProducts(res.data);
    } catch {
      message.error("Error al cargar modificadores");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/groups");
      console.log(res);
      setCatalogGroups(res.data);
    } catch {
      message.error("Error al cargar grupos de productos");
    }
    setLoading(false);
  };

  const [areasImpresions, setAreasImpresions] = useState<AreaImpresion[]>([]);
  const fetchAreasImpresions = async () => {
    try {
      const res = await apiOrder.get("/areasImpresions");
      console.log(res);
      setAreasImpresions(res.data);
    } catch (error) {
      console.log(error);
      message.error("Ocurrio un error al traer las areas de impresion");
    }
  };
  useEffect(() => {
    fetchAreasImpresions();
  }, []);
  function groupCodeById(id: number) {
    return catalogGroups.find((g) => g.id === id)?.code ?? "";
  }
  useEffect(() => {
    if (!productForm.groupId) return;

    const groupCode = groupCodeById(productForm.groupId);
    if (!groupCode) return;

    const newCode = nextCodeForGroup(
      groupCode,
      products,
      productForm.groupId,
      1
    );
    setProductForm((f) => ({ ...f, code: newCode }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productForm.groupId, products]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateGroupModal = () => {
    let nextCode = String(groups.length + 1);
    setIsEditingGroup(false);
    setGroupForm({ name: "", code: nextCode });
    setIsGroupModalOpen(true);
  };

  const handleGroupSave = async () => {
    try {
      if (isEditingGroup && editGroupId) {
        await apiOrder.put(`/modifier-groups/${editGroupId}`, groupForm);
        message.success("Grupo actualizado");
      } else {
        await apiOrder.post("/modifier-groups", groupForm);
        message.success("Grupo creado");
      }
      setIsGroupModalOpen(false);
      await fetchModifierGroups();
    } catch {
      message.error("Error al guardar grupo");
    }
  };
  const showModifiers = (group: ModifierGroup) => {
    setCurrentGroup(group);
    const modifiersList = group.modifiers;
    setModifiersCurrent(modifiersList);
    setIsShowModifiersModal(true);
  };
  const handleGroupEdit = (group: ModifierGroup) => {
    setIsEditingGroup(true);
    setEditGroupId(group.id);
    setGroupForm({
      name: group.name,
      code: group.code,
    });
    setIsGroupModalOpen(true);
  };

  const handleGroupDelete = async (id: number) => {
    try {
      await apiOrder.delete(`/modifier-groups/${id}`);
      message.success("Grupo eliminado");
      await fetchModifierGroups();
    } catch {
      message.error("Error al eliminar grupo");
    }
  };

  const columns = [
    {
      title: "Nombre",
      dataIndex: "name",
    },
    {
      title: "Code",
      dataIndex: "code",
    },
    {
      title: "Acciones",
      render: (_: any, record: ModifierGroup) => (
        <Space>
          <Button size="small" onClick={() => showModifiers(record)}>
            Modificadores
          </Button>
          <Button size="small" onClick={() => handleGroupEdit(record)}>
            Editar
          </Button>
          <Button
            size="small"
            danger
            onClick={() => handleGroupDelete(record.id)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];
  const columnsModifiers = [
    {
      title: "Producto/Modificador",
      render: (_: any, record: any) => {
        return `${record.modifier.code} ${record.modifier.name}`;
      },
    },
    {
      title: "priceDelta",
      dataIndex: "priceDelta",
    },
    {
      title: "Activo",
      render: (_: any, record: ModifierItem) => (
        <Button type={record.isEnabled ? "primary" : "default"} size="small">
          {record.isEnabled ? "SI" : "NO"}
        </Button>
      ),
    },
    {
      title: "Acciones",
      render: (_: any, record: ModifierItem) => (
        <Space>
          <Button size="small" onClick={() => handleModifierEdit(record)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar este modifier?"
            description="Esta acción no se puede deshacer."
            okText="Sí"
            cancelText="No"
            onConfirm={() => handleModifierDelete(record.id)} // aquí llama a tu función
          >
            <Button size="small" danger>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
  // modifier
  const [savingModifier, setSavingModifier] = useState(false);
  const [isEditingModifier, setIsEditingModifier] = useState(false);
  const [editModifierId, setEditModifierId] = useState<number | null>(null);
  const [modifierForm, setModifierForm] = useState<ModifierForm>({
    modifierGroupId: null,
    modifierId: null,
    priceDelta: 0,
    isEnabled: false,
  });
  const handleCreateModifier = () => {
    setIsModifiersModalOpen(true);
    setModifierForm({
      ...modifierForm,
      modifierGroupId: currentGroup?.id ? currentGroup.id : null,
    });
  };
  useEffect(() => {
    const newCurrentGroup = groups.find((g) => g.id === currentGroup?.id);

    setCurrentGroup(newCurrentGroup ? newCurrentGroup : null);
  }, [groups]);
  useEffect(() => {
    const newModifiers = currentGroup?.modifiers;

    setModifiersCurrent(newModifiers ? newModifiers : []);
  }, [currentGroup]);

  const saveModifier = async () => {
    console.log(modifierForm);
    setSavingModifier(true);
    try {
      if (isEditingModifier && editModifierId) {
        await apiOrder.put(`/modifiers/${editModifierId}`, modifierForm);
        message.success("Modificador actualizado");
      } else {
        await apiOrder.post("/modifiers", modifierForm);
        message.success("Modificador creado");
      }

      await fetchModifierGroups();
      setModifierForm({
        modifierGroupId: null,
        modifierId: null,
        priceDelta: 0,
        isEnabled: false,
      });
      setEditModifierId(null);
      setIsModifiersModalOpen(false);
    } catch (error) {
      console.log(error);
      message.error("Ha ocurrido un error contactar al admin");
    }
    setSavingModifier(false);
  };

  const handleModifierEdit = (modifier: ModifierItem) => {
    setIsEditingModifier(true);
    setEditModifierId(modifier.id);
    setModifierForm({
      modifierGroupId: modifier.modifierGroupId,
      modifierId: modifier.modifierId,
      priceDelta: modifier.priceDelta,
      isEnabled: modifier.isEnabled,
    });
    setIsModifiersModalOpen(true);
  };

  const handleModifierDelete = async (id: number) => {
    try {
      await apiOrder.delete(`/modifiers/${id}`);
      message.success("Modifier eliminado");
      await fetchModifierGroups();
    } catch {
      message.error("Error al eliminar modifier");
    }
  };

  // producto
  const [editProductId, seteditProductId] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const saveProduct = async () => {
    setSavingProduct(true);
    try {
      await apiOrder.post("/products", productForm);

      await fetchProducts();
      setProductForm({
        name: "",
        code: "",
        groupId: null,
        printArea: null,
        subgroupId: null,
        price: 0,
        taxRate: 0,
        enabled: false,
      });
      setIsProductoModalOpen(false);
    } catch (error) {
      console.log(error);
      message.error("Ha ocurrido un error contactar al admin");
    }
    setSavingProduct(false);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar conjunto de modificadores"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateGroupModal}
        >
          Crear conjunto
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
      />

      {/* Modal para grupo */}
      <Modal
        title={isEditingGroup ? "Editar grupo" : "Nuevo grupo"}
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        onOk={handleGroupSave}
        okText={isEditingGroup ? "Actualizar" : "Crear"}
      >
        <label htmlFor="nombre">Nombre</label>
        <Input
          placeholder="Nombre"
          value={groupForm.name}
          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
          className="mb-2"
        />
        <label htmlFor="code">Code</label>
        <Input
          placeholder="Code"
          value={groupForm.code}
          onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })}
          className="mb-2"
        />
      </Modal>

      {/* Modal modifiers */}
      <Modal
        title={"Modifiers"}
        open={isShowModifiersModal}
        onCancel={() => setIsShowModifiersModal(false)}
        footer={false}
        width={600}
      >
        <div className="flex w-full">
          <button
            onClick={() => handleCreateModifier()}
            className="px-3 py-2 bg-blue-600 text-white font-bold text-sm"
          >
            Crear
          </button>
        </div>
        <Table columns={columnsModifiers} dataSource={modifiersCurrent}></Table>
      </Modal>

      {/* -------- modal modifier-------- */}
      <Modal
        open={isModifiersModalOpen}
        title={editModifierId ? "Editar modificador" : "Nuevo modificador"}
        width={820}
        onCancel={() => {
          setIsModifiersModalOpen(false);
          setModifierForm({
            modifierGroupId: null,
            modifierId: null,
            priceDelta: 0,
            isEnabled: false,
          });
        }}
        footer={[
          <Button
            key="canc"
            onClick={() => {
              setIsModifiersModalOpen(false);
              setEditModifierId(null);
            }}
          >
            Cancelar
          </Button>,
          <Button
            key="ok"
            type="primary"
            loading={savingModifier}
            onClick={saveModifier}
          >
            {editModifierId ? "Guardar cambios" : "Crear"}
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div className="flex">
            <Select
              className="w-full"
              placeholder="Modificador"
              allowClear
              value={modifierForm.modifierId ?? undefined}
              onChange={(v) => patchModifier({ modifierId: v ?? null })}
              options={products.map((s: any, index: number) => ({
                key: index,
                value: s.id,
                label: `${s.code} ${s.name}`,
              }))}
            />{" "}
            <button
              onClick={() => setIsProductoModalOpen(true)}
              className="rounded px-3 py-2 text-white bg-blue-600"
            >
              +
            </button>
          </div>
          <InputNumber
            placeholder="PriceDelta"
            value={modifierForm.priceDelta}
            onChange={(e) => patchModifier({ priceDelta: e ?? 0 })}
          />

          <Switch
            checked={modifierForm.isEnabled}
            onChange={(v) => patchModifier({ isEnabled: v })}
            checkedChildren="Activo"
            unCheckedChildren="Off"
          />
        </div>
      </Modal>
      {/* -------- modal producto new-------- */}
      <Modal
        open={isProductoModalOpen}
        title={"Nuevo producto/modificador"}
        width={820}
        onCancel={() => {
          setIsModifiersModalOpen(false);
          setProductForm({
            name: "",
            code: "",
            groupId: null,
            printArea: null,
            subgroupId: null,
            price: 0,
            taxRate: 0,
            enabled: false,
          });
        }}
        footer={[
          <Button
            key="canc"
            onClick={() => {
              setIsProductoModalOpen(false);
              seteditProductId(null);
            }}
          >
            Cancelar
          </Button>,
          <Button
            key="ok"
            type="primary"
            loading={savingProduct}
            onClick={saveProduct}
          >
            {editProductId ? "Guardar cambios" : "Crear"}
          </Button>,
        ]}
      >
        {/* formulario in‑line */}
        <div className="space-y-4">
          <Input
            placeholder="Nombre"
            value={productForm.name}
            onChange={(e) => patchProduct({ name: e.target.value })}
          />
          <Input
            placeholder="Código"
            value={productForm.code}
            onChange={(e) => patchProduct({ code: e.target.value })}
          />
          <Select
            className="w-full"
            placeholder="Grupo"
            value={productForm.groupId || undefined}
            onChange={(v) => patchProduct({ groupId: v })}
            options={catalogGroups.map((g, index) => ({
              key: index,
              value: g.id,
              label: g.name,
            }))}
          />
          <Select
            className="w-full"
            placeholder="Subgrupo (opcional)"
            allowClear
            value={productForm.subgroupId ?? undefined}
            onChange={(v) => patchProduct({ subgroupId: v ?? null })}
            options={subgroups.map((s: any, index: number) => ({
              key: index,
              value: s.id,
              label: s.name,
            }))}
          />
          <Select
            className="w-full"
            placeholder="Area de impresion"
            allowClear
            value={productForm.printArea ?? undefined}
            onChange={(v) => patchProduct({ printArea: v ?? null })}
            options={areasImpresions.map((s: AreaImpresion, index: number) => ({
              key: index,
              value: s.id,
              label: s.name,
            }))}
          />
          <InputNumber
            className="w-full"
            addonBefore="$"
            placeholder="Precio"
            value={productForm.price}
            onChange={(v) => patchProduct({ price: v ?? 0 })}
          />
          <InputNumber
            className="w-full"
            addonAfter="%"
            placeholder="IVA"
            value={productForm.taxRate}
            onChange={(v) => patchProduct({ taxRate: v ?? 0 })}
          />
          <Switch
            checked={productForm.enabled}
            onChange={(v) => patchProduct({ enabled: v })}
            checkedChildren="Activo"
            unCheckedChildren="Off"
          />
        </div>
      </Modal>
    </div>
  );
}
