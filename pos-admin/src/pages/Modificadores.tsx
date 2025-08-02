import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  message,
  Tag,
  Space,
  Switch,
  InputNumber,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";

interface Modifier {
  id: number;
  groupId: number;
  name: string;
  priceDelta: number;
  isEnabled: boolean;
}

interface ModifierGroup {
  id: number;
  name: string;
  isForced: boolean;
  maxQty: number;
  modifiers: Modifier[];
}

export default function ModificadoresPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    isForced: false,
    maxQty: 1,
  });
  const [editGroupId, setEditGroupId] = useState<number | null>(null);

  const [modifierForm, setModifierForm] = useState({
    name: "",
    priceDelta: 0,
    isEnabled: true,
  });
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);

  const fetchGroups = async () => {
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
    fetchGroups();
  }, []);

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateGroupModal = () => {
    setIsEditingGroup(false);
    setGroupForm({ name: "", isForced: false, maxQty: 1 });
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
      fetchGroups();
    } catch {
      message.error("Error al guardar grupo");
    }
  };

  const handleGroupEdit = (group: ModifierGroup) => {
    setIsEditingGroup(true);
    setEditGroupId(group.id);
    setGroupForm({
      name: group.name,
      isForced: group.isForced,
      maxQty: group.maxQty,
    });
    setIsGroupModalOpen(true);
  };

  const handleGroupDelete = async (id: number) => {
    try {
      await apiOrder.delete(`/modifier-groups/${id}`);
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
    },
    {
      title: "Forzado",
      dataIndex: "isForced",
      render: (val: boolean) =>
        val ? <Tag color="blue">Obligatorio</Tag> : <Tag>Opcional</Tag>,
    },
    {
      title: "Máx. cantidad",
      dataIndex: "maxQty",
    },
    {
      title: "Acciones",
      render: (_: any, record: ModifierGroup) => (
        <Space>
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
        <label htmlFor="maxQty">Maxima seleccion</label>
        <InputNumber
          min={1}
          placeholder="Máx. selección"
          value={groupForm.maxQty}
          onChange={(val) => setGroupForm({ ...groupForm, maxQty: val || 1 })}
          className="w-full mb-2"
        />
        <div className="flex items-center gap-2">
          <span>¿Obligatorio?</span>
          <Switch
            checked={groupForm.isForced}
            onChange={(val) => setGroupForm({ ...groupForm, isForced: val })}
          />
        </div>
      </Modal>
    </div>
  );
}
