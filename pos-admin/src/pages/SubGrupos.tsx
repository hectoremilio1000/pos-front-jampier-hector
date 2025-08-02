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

interface Subgrupo {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
  groupId: number;
  group?: { id: number; name: string };
}

interface Grupo {
  id: number;
  name: string;
}

export default function Subgrupos() {
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    groupId: 0,
    code: "",
    name: "",
    sortOrder: 1,
    isEnabled: true,
  });

  const [editForm, setEditForm] = useState({
    groupId: 0,
    code: "",
    name: "",
    sortOrder: 1,
    isEnabled: true,
  });

  const [editId, setEditId] = useState<number | null>(null);

  const fetchSubgrupos = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/subgroups");
      setSubgrupos(res.data);
    } catch {
      message.error("Error al cargar subgrupos");
    }
    setLoading(false);
  };

  const fetchGrupos = async () => {
    try {
      const res = await apiOrder.get("/groups");
      setGrupos(res.data);
    } catch {
      message.error("Error al cargar grupos");
    }
  };

  useEffect(() => {
    fetchSubgrupos();
    fetchGrupos();
  }, []);

  const filtered = subgrupos.filter((s) =>
    `${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await apiOrder.post("/subgroups", createForm);
      message.success("Subgrupo creado");
      setIsCreateModalOpen(false);
      fetchSubgrupos();
    } catch {
      message.error("Error al crear subgrupo");
    }
  };

  const openEditModal = (sub: Subgrupo) => {
    setEditForm({
      groupId: sub.groupId,
      code: sub.code,
      name: sub.name,
      sortOrder: sub.sortOrder,
      isEnabled: sub.isEnabled,
    });
    setEditId(sub.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await apiOrder.put(`/subgroups/${editId}`, editForm);
      message.success("Subgrupo actualizado");
      setIsEditModalOpen(false);
      setEditId(null);
      fetchSubgrupos();
    } catch {
      message.error("Error al actualizar subgrupo");
    }
  };

  const deleteSubgrupo = async (id: number) => {
    try {
      await apiOrder.delete(`/subgroups/${id}`);
      message.success("Subgrupo eliminado");
      fetchSubgrupos();
    } catch {
      message.error("Error al eliminar subgrupo");
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
      title: "Grupo",
      dataIndex: ["group", "name"],
      key: "group",
      render: (_: any, record: Subgrupo) => record.group?.name || "-",
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
      render: (_: any, record: Subgrupo) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteSubgrupo(record.id)}>
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
              groupId: grupos[0]?.id || 0,
            });
            setIsCreateModalOpen(true);
          }}
        >
          Agregar subgrupo
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
        title="Nuevo subgrupo"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <SubgrupoForm
          formData={createForm}
          setFormData={setCreateForm}
          grupos={grupos}
          subgrupos={subgrupos}
        />
      </Modal>

      {/* Modal Editar */}
      <Modal
        title="Editar subgrupo"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <SubgrupoForm
          subgrupos={subgrupos}
          formData={editForm}
          setFormData={setEditForm}
          grupos={grupos}
        />
      </Modal>
    </div>
  );
}

function SubgrupoForm({
  formData,
  setFormData,
  grupos,
  subgrupos,
}: {
  formData: any;
  setFormData: (val: any) => void;
  grupos: Grupo[];
  subgrupos: any[];
}) {
  useEffect(() => {
    const code = `${subgrupos.length + 1}`;
    setFormData({ ...formData, code, sortOrder: code, name: "" });
  }, [0, subgrupos]);
  return (
    <div className="space-y-3">
      <label htmlFor="nombre">Nombre</label>
      <Input
        placeholder="Nombre"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <label htmlFor="code">Codigo</label>
      <Input
        placeholder="Código"
        value={formData.code}
        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
      />
      <label htmlFor="grupo">Grupo</label>
      <Select
        className="w-full"
        placeholder="Grupo"
        value={formData.groupId}
        onChange={(val) => setFormData({ ...formData, groupId: val })}
        options={grupos.map((g) => ({ value: g.id, label: g.name }))}
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
