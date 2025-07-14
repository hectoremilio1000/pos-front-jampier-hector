import { useEffect, useState } from "react";
import { Table, Input, Button, Modal, Tag, Switch, message, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

interface Product {
  id: number;
  code: string;
  name: string;
  basePrice: number;
  taxRate: number;
  isEnabled: boolean;
  category?: string;
  modifierGroups: { id: number; name: string }[];
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Crear producto
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    price: 0,
    taxRate: 0,
    category: "",
    enabled: true,
  });

  // Editar producto
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    price: 0,
    taxRate: 0,
    category: "",
    enabled: true,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/products");
      setProducts(res.data);
    } catch (error) {
      message.error("Error al cargar productos");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter((p) =>
    `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Código",
      dataIndex: "code",
      key: "code",
    },
    {
      title: "Precio",
      dataIndex: "basePrice",
      key: "basePrice",
      render: (price: number) => `$${Number(price).toFixed(2)}`,
    },
    {
      title: "Categoría",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Modificadores",
      dataIndex: "modifierGroups",
      key: "modifierGroups",
      render: (groups: Product["modifierGroups"]) =>
        groups?.length
          ? groups.map((g) => <Tag key={g.id}>{g.name}</Tag>)
          : "-",
    },
    {
      title: "Activo",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: Product) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteProduct(record.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  const handleCreate = async () => {
    try {
      await apiOrder.post("/products", {
        ...createForm,
        price: createForm.price,
        enabled: createForm.enabled,
        modifierGroupIds: [], // luego implementamos
      });
      message.success("Producto creado");
      setIsCreateModalOpen(false);
      fetchProducts();
    } catch (err) {
      message.error("Error al crear producto");
    }
  };

  const openEditModal = (product: Product) => {
    setEditId(product.id);
    setEditForm({
      name: product.name,
      code: product.code,
      price: product.basePrice,
      taxRate: product.taxRate,
      category: product.category || "",
      enabled: product.isEnabled,
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await apiOrder.put(`/products/${editId}`, {
        ...editForm,
        price: editForm.price,
        enabled: editForm.enabled,
        modifierGroupIds: [],
      });
      message.success("Producto actualizado");
      setIsEditModalOpen(false);
      setEditId(null);
      fetchProducts();
    } catch {
      message.error("Error al actualizar producto");
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await apiOrder.delete(`/products/${id}`);
      message.success("Producto eliminado");
      fetchProducts();
    } catch {
      message.error("Error al eliminar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => {
            setCreateForm({
              name: "",
              code: "",
              price: 0,
              taxRate: 0,
              category: "",
              enabled: true,
            });
            setIsCreateModalOpen(true);
          }}
        >
          Agregar producto
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
      />

      {/* Modal para crear */}
      <Modal
        title="Nuevo producto"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <ProductForm formData={createForm} setFormData={setCreateForm} />
      </Modal>

      {/* Modal para editar */}
      <Modal
        title="Editar producto"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <ProductForm formData={editForm} setFormData={setEditForm} />
      </Modal>
    </div>
  );
}

/* Formulario reutilizable */
function ProductForm({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (val: any) => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Nombre"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <Input
        placeholder="Código"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
      />
      <Input
        placeholder="Precio"
        type="number"
        value={formData.price}
        onChange={(e) =>
          setFormData({ ...formData, price: parseFloat(e.target.value) })
        }
      />
      <Input
        placeholder="Impuesto (%)"
        type="number"
        value={formData.taxRate}
        onChange={(e) =>
          setFormData({ ...formData, taxRate: parseFloat(e.target.value) })
        }
      />
      <Input
        placeholder="Categoría"
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      />
      <div className="flex items-center gap-2">
        <span>¿Activo?</span>
        <Switch
          checked={formData.enabled}
          onChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
      </div>
    </div>
  );
}
