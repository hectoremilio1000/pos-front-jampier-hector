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
  Select,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

interface ProductGroup {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
  category: { id: number; name: string };
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
}

export default function Grupos() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    categoryId: 0,
    code: "",
    name: "",
    sortOrder: 1,
    isEnabled: true,
  });

  const [editForm, setEditForm] = useState({
    categoryId: 0,
    code: "",
    name: "",
    sortOrder: 1,
    isEnabled: true,
  });

  const [editId, setEditId] = useState<number | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/groups");
      setGroups(res.data);
    } catch {
      message.error("Error al cargar grupos");
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await apiOrder.get("/categories");
      setCategories(res.data);
    } catch {
      message.error("Error al cargar categorías");
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchCategories();
  }, []);

  const filtered = groups.filter((g) =>
    `${g.name} ${g.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await apiOrder.post("/groups", createForm);
      message.success("Grupo creado");
      setIsCreateModalOpen(false);
      fetchGroups();
    } catch {
      message.error("Error al crear grupo");
    }
  };

  const openEditModal = (group: ProductGroup) => {
    setEditForm({
      categoryId: group.categoryId,
      code: group.code,
      name: group.name,
      sortOrder: group.sortOrder,
      isEnabled: group.isEnabled,
    });
    setEditId(group.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await apiOrder.put(`/groups/${editId}`, editForm);
      message.success("Grupo actualizado");
      setIsEditModalOpen(false);
      setEditId(null);
      fetchGroups();
    } catch {
      message.error("Error al actualizar grupo");
    }
  };

  const deleteGroup = async (id: number) => {
    try {
      await apiOrder.delete(`/groups/${id}`);
      message.success("Grupo eliminado");
      fetchGroups();
    } catch {
      message.error("Error al eliminar grupo");
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
      title: "Categoría",
      dataIndex: ["category", "name"],
      key: "category",
    },
    {
      title: "Orden",
      dataIndex: "sortOrder",
      key: "sortOrder",
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
      render: (_: any, record: ProductGroup) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteGroup(record.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
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
              ...createForm,
              name: "",
              categoryId: categories[0]?.id || 0,
            });
            setIsCreateModalOpen(true);
          }}
        >
          Agregar grupo
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
        title="Nuevo grupo"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <GroupForm
          formData={createForm}
          setFormData={setCreateForm}
          categories={categories}
          groups={groups}
        />
      </Modal>

      {/* Modal Editar */}
      <Modal
        title="Editar grupo"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <GroupForm
          groups={groups}
          formData={editForm}
          setFormData={setEditForm}
          categories={categories}
        />
      </Modal>
    </div>
  );
}

function GroupForm({
  formData,
  setFormData,
  categories,
  groups,
}: {
  formData: any;
  setFormData: (val: any) => void;
  categories: Category[];
  groups: any[];
}) {
  useEffect(() => {
    const code = `${groups.length + 1}`;
    setFormData({ ...formData, code, sortOrder: code, name: "" });
  }, [0, groups]);
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
      <label htmlFor="Categoria">Categoria</label>
      <Select
        className="w-full"
        placeholder="Categoría"
        value={formData.categoryId}
        onChange={(val) => setFormData({ ...formData, categoryId: val })}
        options={categories.map((cat) => ({
          value: cat.id,
          label: cat.name,
        }))}
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
