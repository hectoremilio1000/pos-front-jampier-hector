import { useEffect, useState } from "react";
import { Table, Input, Button, Modal, message, Space, InputNumber } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
// tu instancia configurada de axios

interface AreaImpresion {
  id: number;
  name: string;
  sortOrder: number;
}

export default function AreasImpresion() {
  const [areas, setAreas] = useState<AreaImpresion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Crear área
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    sortOrder: 1,
  });

  // Editar área
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    sortOrder: 1,
  });

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/areasImpresion");
      setAreas(res.data);
    } catch (error) {
      message.error("Error al cargar las áreas");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const filtered = areas.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
    },

    {
      title: "Orden",
      dataIndex: "sortOrder",
      key: "sortOrder",
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: AreaImpresion) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button
            size="small"
            danger
            onClick={() => deleteAreaImpresion(record.id)}
          >
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  const handleCreate = async () => {
    try {
      await apiOrder.post("/areasImpresion", {
        ...createForm,
        // lo ignoro si no lo usas
      });
      message.success("Área creada");
      setIsCreateModalOpen(false);
      fetchAreas();
    } catch (err) {
      message.error("Error al crear área");
    }
  };

  const openEditModal = (area: AreaImpresion) => {
    setEditId(area.id);
    setEditForm({
      name: area.name,
      sortOrder: area.sortOrder,
    });
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await apiOrder.put(`/areasImpresion/${editId}`, {
        ...editForm,
      });
      message.success("Área actualizada");
      setIsEditModalOpen(false);
      setEditId(null);
      fetchAreas();
    } catch {
      message.error("Error al actualizar área");
    }
  };

  const deleteAreaImpresion = async (id: number) => {
    try {
      await apiOrder.delete(`/areasImpresion/${id}`);
      message.success("Área eliminada");
      fetchAreas();
    } catch {
      message.error("Error al eliminar área");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar por nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => {
            setCreateForm({ name: "", sortOrder: 1 });
            setIsCreateModalOpen(true);
          }}
        >
          Agregar área
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
      />

      {/* Modal crear */}
      <Modal
        title="Nueva área"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <AreaForm formData={createForm} setFormData={setCreateForm} />
      </Modal>

      {/* Modal editar */}
      <Modal
        title="Editar área"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <AreaForm formData={editForm} setFormData={setEditForm} />
      </Modal>
    </div>
  );
}

function AreaForm({
  formData,
  setFormData,
}: {
  formData: any;
  setFormData: (val: any) => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        placeholder="Nombre del área"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <InputNumber
        min={1}
        placeholder="Orden"
        value={formData.sortOrder}
        onChange={(val) => setFormData({ ...formData, sortOrder: val || 1 })}
        className="w-full"
      />
    </div>
  );
}
