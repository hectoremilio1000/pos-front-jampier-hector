import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  InputNumber,
  Switch,
  message,
  Tag,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

interface Category {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
}

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    sortOrder: 1,
    isEnabled: true,
  });

  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    sortOrder: 1,
    isEnabled: true,
  });

  const [editId, setEditId] = useState<number | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/categories");
      setCategories(res.data);
    } catch {
      message.error("Error al cargar categorías");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = categories.filter((c) =>
    `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await apiOrder.post("/categories", createForm);
      message.success("Categoría creada");
      setIsCreateModalOpen(false);
      fetchCategories();
    } catch {
      message.error("Error al crear categoría");
    }
  };

  const openEditModal = (category: Category) => {
    setEditForm({
      code: category.code,
      name: category.name,
      sortOrder: category.sortOrder,
      isEnabled: category.isEnabled,
    });
    setEditId(category.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await apiOrder.put(`/categories/${editId}`, editForm);
      message.success("Categoría actualizada");
      setIsEditModalOpen(false);
      setEditId(null);
      fetchCategories();
    } catch {
      message.error("Error al actualizar categoría");
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await apiOrder.delete(`/categories/${id}`);
      message.success("Categoría eliminada");
      fetchCategories();
    } catch {
      message.error("Error al eliminar categoría");
    }
  };

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
      title: "Orden",
      dataIndex: "sortOrder",
      key: "sortOrder",
    },
    {
      title: "Estado",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (val: boolean) =>
        val ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: Category) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteCategory(record.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
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
            setIsCreateModalOpen(true);
          }}
        >
          Agregar categoría
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Modal Crear */}
      <Modal
        title="Nueva categoría"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <CategoryForm
          categories={categories}
          formData={createForm}
          setFormData={setCreateForm}
        />
      </Modal>

      {/* Modal Editar */}
      <Modal
        title="Editar categoría"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <CategoryForm
          categories={categories}
          formData={editForm}
          setFormData={setEditForm}
        />
      </Modal>
    </div>
  );
}

function CategoryForm({
  categories,
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (val: any) => void;
  categories: any;
}) {
  useEffect(() => {
    const code = `${categories.length + 1}`;
    setFormData({ ...formData, code, sortOrder: code, name: "" });
  }, [0, categories]);

  return (
    <div className="space-y-3">
      <label htmlFor="nombre">Nombre</label>
      <Input
        placeholder="Nombre"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <label htmlFor="codigo">Codigo</label>
      <Input
        placeholder="Código"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
      />
      <label htmlFor="orden">Orden</label>
      <InputNumber
        placeholder="Orden"
        value={formData.sortOrder}
        onChange={(val) => setFormData({ ...formData, sortOrder: val || 1 })}
        className="w-full"
      />
      <div className="flex items-center gap-2">
        <span>¿Activo?</span>
        <Switch
          checked={formData.isEnabled}
          onChange={(val) => setFormData({ ...formData, isEnabled: val })}
        />
      </div>
    </div>
  );
}
