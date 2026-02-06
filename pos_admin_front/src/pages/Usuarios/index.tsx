// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos-admin/src/pages/Usuarios/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Table, Input, Button, Tag, message, Space, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import apiAuth from "@/components/apis/apiAuth";
import { useAuth } from "@/components/Auth/AuthContext";

import UserModal, { type UserFormValues, type RoleOption } from "./UserModal";

type UserRow = {
  id: number;
  fullName: string;
  email?: string | null;
  username?: string | null;
  role: RoleOption;
  status: "active" | "blocked";
};

function makeAliasEmail(local: string, restaurantId: number | string) {
  const l = String(local)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
  return `${l || "user"}@r${restaurantId}.pos`;
}

export default function Usuarios() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initial, setInitial] = useState<Partial<UserFormValues>>({});

  // ===== CHANGED: ya no filtramos aquí con user; guardamos crudo
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiAuth.get("/users");
      const data: UserRow[] = res.data ?? [];
      setRows(data);
    } catch {
      message.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiAuth.get("/roles");
      setRoles(res.data ?? []);
    } catch {
      message.error("Error al cargar roles");
    }
  };

  // ===== CHANGED: espera a que user esté listo y rehace fetch si cambia el rol
  useEffect(() => {
    if (!user?.id) return;
    fetchUsers();
    fetchRoles();
  }, [user?.id, user?.role?.code]);

  // ===== CHANGED: filtrado en render con el user más reciente
  const filtered = useMemo(() => {
    let out = rows;

    // Política de visibilidad según rol actual
    const roleCode = user?.role?.code?.toLowerCase();
    if (roleCode === "owner") {
      out = out.filter((u) => u.role.code.toLowerCase() !== "owner");
    } else {
      out = out.filter(
        (u) =>
          u.role.code.toLowerCase() !== "owner" &&
          u.role.code.toLowerCase() !== "admin"
      );
    }

    // Filtro de búsqueda
    const q = search.toLowerCase();
    if (q) {
      out = out.filter((u) =>
        `${u.fullName} ${u.email ?? ""} ${u.username ?? ""}`
          .toLowerCase()
          .includes(q)
      );
    }
    return out;
  }, [rows, search, user?.id, user?.role?.code]);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setInitial({
      full_name: "",
      password: "",
      role_code: "" as any,
      status: "active",
    });
    setModalOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setModalMode("edit");
    setEditingId(row.id);
    setInitial({
      full_name: row.fullName,
      password: "", // vacío = no cambiar
      role_code: row.role.code as any,
      status: row.status,
    });
    setModalOpen(true);
  };

  // ===== CHANGED: await fetchUsers() para ver la lista actualizada
  const handleDelete = async (id: number) => {
    try {
      await apiAuth.delete(`/users/${id}`);
      message.success("Usuario eliminado");
      await fetchUsers();
    } catch {
      message.error("Error al eliminar usuario solo lo puede hacer el dueño");
    }
  };

  const handleSubmit = async (vals: UserFormValues) => {
    const restaurantId =
      (user as any)?.restaurant?.id ?? (user as any)?.restaurantId ?? "x";

    const payload: any = {
      full_name: vals.full_name,
      role_code: vals.role_code,
      status: vals.status ?? "active",
      email: makeAliasEmail(vals.full_name || vals.role_code, restaurantId),
    };

    if (modalMode === "create" || (modalMode === "edit" && vals.password)) {
      payload.password = vals.password;
    }

    try {
      if (modalMode === "create") {
        await apiAuth.post("/users", payload);
        message.success("Usuario creado");
      } else if (editingId) {
        await apiAuth.put(`/users/${editingId}`, payload);
        message.success("Usuario actualizado");
      }
      setModalOpen(false);
      // ===== CHANGED: esperar al refetch
      await fetchUsers();
    } catch (e: any) {
      const err =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se pudo guardar el usuario";
      message.error(err);
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "fullName", key: "fullName" },
    { title: "Correo (alias)", dataIndex: "email", key: "email" },
    { title: "Rol", dataIndex: ["role", "name"], key: "role" },
    {
      title: "Estado",
      dataIndex: "status",
      key: "status",
      render: (s: UserRow["status"]) =>
        s === "active" ? (
          <Tag color="green">Activo</Tag>
        ) : (
          <Tag color="red">Bloqueado</Tag>
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, rec: UserRow) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(rec)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar usuario?"
            okText="Eliminar"
            cancelText="Cancelar"
            onConfirm={() => handleDelete(rec.id)}
          >
            <Button size="small" icon={<DeleteOutlined />} danger>
              Eliminar
            </Button>
          </Popconfirm>
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
        <Button icon={<PlusOutlined />} type="primary" onClick={openCreate}>
          Agregar usuario
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filtered}
        loading={loading}
      />

      <UserModal
        open={modalOpen}
        mode={modalMode}
        initial={initial}
        roles={roles}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        currentUserRoleCode={user?.role?.code}
      />
    </div>
  );
}
