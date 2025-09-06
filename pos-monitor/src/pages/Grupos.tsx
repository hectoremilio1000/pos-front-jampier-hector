import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  InputNumber,
  Switch,
  Tag,
  message,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

interface ProductGroup {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
}

export default function Grupos() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
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

  useEffect(() => {
    fetchGroups();
  }, []);

  const filtered = groups.filter((g) =>
    `${g.name} ${g.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await apiOrder.post("/groups", {
        ...createForm,
        categoryId: 1, // si no tienes selector, fija 1 o el default permitido
      });
      message.success("Grupo creado");
      setIsCreateModalOpen(false);
      fetchGroups();
    } catch {
      message.error("Error al crear grupo");
    }
  };

  const openEditModal = (group: ProductGroup) => {
    setEditForm({
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
      await apiOrder.put(`/groups/${editId}`, {
        ...editForm,
        categoryId: 1,
      });
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
              code: "",
              name: "",
              sortOrder: 1,
              isEnabled: true,
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
      />

      {/* Modal Crear */}
      <Modal
        title="Nuevo grupo"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <GroupForm formData={createForm} setFormData={setCreateForm} />
      </Modal>

      {/* Modal Editar */}
      <Modal
        title="Editar grupo"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <GroupForm formData={editForm} setFormData={setEditForm} />
      </Modal>
    </div>
  );
}

function GroupForm({
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
