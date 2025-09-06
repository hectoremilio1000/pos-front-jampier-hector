import { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Modal,
  Select,
  Tag,
  Switch,
  message,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiAuth from "@/components/apis/apiAuth";

interface Role {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  status: string;
}

export default function Usuarios() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role_code: "",
  });

  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    status: "active",
    role_code: "",
  });
  const [editId, setEditId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiAuth.get("/users");
      setUsers(res.data);
    } catch {
      message.error("Error al cargar usuarios");
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const res = await apiAuth.get("/roles");
      setRoles(res.data);
    } catch {
      message.error("Error al cargar roles");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const filtered = users.filter((u) =>
    `${u.fullName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await apiAuth.post("/users", createForm);
      message.success("Usuario creado");
      setIsCreateModalOpen(false);
      fetchUsers();
    } catch {
      message.error("Error al crear usuario");
    }
  };

  const openEditModal = (user: User) => {
    setEditForm({
      full_name: user.fullName,
      email: user.email,
      status: user.status,
      role_code: user.role.code,
    });
    setEditId(user.id);
    setIsEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await apiAuth.put(`/users/${editId}`, editForm);
      message.success("Usuario actualizado");
      setIsEditModalOpen(false);
      setEditId(null);
      fetchUsers();
    } catch {
      message.error("Error al actualizar usuario");
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await apiAuth.delete(`/users/${id}`);
      message.success("Usuario eliminado");
      fetchUsers();
    } catch {
      message.error("Error al eliminar usuario");
    }
  };

  const columns = [
    {
      title: "Nombre",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Correo",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Rol",
      dataIndex: ["role", "name"],
      key: "role",
    },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (status: string) =>
        status === "active" ? (
          <Tag color="green">Activo</Tag>
        ) : (
          <Tag color="red">Bloqueado</Tag>
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: User) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteUser(record.id)}>
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
          placeholder="Buscar por nombre o correo"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => {
            setCreateForm({
              full_name: "",
              email: "",
              password: "",
              role_code: "",
            });
            setIsCreateModalOpen(true);
          }}
        >
          Agregar usuario
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
      />

      {/* Modal Crear Usuario */}
      <Modal
        title="Nuevo usuario"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={handleCreate}
        okText="Crear"
      >
        <div className="space-y-3">
          <Input
            placeholder="Nombre completo"
            value={createForm.full_name}
            onChange={(e) =>
              setCreateForm({ ...createForm, full_name: e.target.value })
            }
          />
          <Input
            placeholder="Correo"
            value={createForm.email}
            onChange={(e) =>
              setCreateForm({ ...createForm, email: e.target.value })
            }
          />
          <Input.Password
            placeholder="Contraseña"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm({ ...createForm, password: e.target.value })
            }
          />
          <Select
            placeholder="Rol"
            value={createForm.role_code}
            onChange={(val) => setCreateForm({ ...createForm, role_code: val })}
            className="w-full"
            options={roles.map((r) => ({ value: r.code, label: r.name }))}
          />
        </div>
      </Modal>

      {/* Modal Editar Usuario */}
      <Modal
        title="Editar usuario"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        onOk={handleEdit}
        okText="Actualizar"
      >
        <div className="space-y-3">
          <Input
            placeholder="Nombre completo"
            value={editForm.full_name}
            onChange={(e) =>
              setEditForm({ ...editForm, full_name: e.target.value })
            }
          />
          <Input
            placeholder="Correo"
            value={editForm.email}
            onChange={(e) =>
              setEditForm({ ...editForm, email: e.target.value })
            }
          />
          <Select
            placeholder="Rol"
            value={editForm.role_code}
            onChange={(val) => setEditForm({ ...editForm, role_code: val })}
            className="w-full"
            options={roles.map((r) => ({ value: r.code, label: r.name }))}
          />
          <div className="flex items-center gap-2">
            <span>¿Activo?</span>
            <Switch
              checked={editForm.status === "active"}
              onChange={(checked) =>
                setEditForm({
                  ...editForm,
                  status: checked ? "active" : "blocked",
                })
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
