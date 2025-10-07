import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios, { AxiosError } from "axios";
import apiAuth from "@/components/apis/apiAuth";
import UserModal, {
  type UserFormValues,
  type RoleOption,
  type RestaurantOption,
} from "@/pages/Users/UserModal";

type UserRole = "owner" | "admin" | "cashier" | "superadmin";
type UserStatus = "active" | "inactive" | null | undefined;

type Restaurant = { id: number; name: string };
type Role = { id: number; code: string; name: string };

type User = {
  id: number;
  fullName: string;
  email: string;
  role?: Role; // relación
  roleCode?: UserRole; // algunos controladores ya lo devuelven directo
  status?: UserStatus;
  restaurant?: Restaurant; // relación
  restaurantId?: number; // a veces plano
  created_at?: string;
  createdAt?: string;
};

type PageMeta = { total: number; page: number; perPage: number };

const normalizeStatus = (s: UserStatus): "active" | "inactive" =>
  s === "inactive" ? "inactive" : "active";

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleString("es-MX") : "—");

type UserApiPayload = {
  full_name: string;
  email: string;
  role_code: string;
  status: "active" | "inactive";
  restaurant_id?: number;
  password?: string;
};

export default function Users(): React.ReactElement {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [meta, setMeta] = useState<PageMeta>({
    total: 0,
    page: 1,
    perPage: 10,
  });

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [initialValues, setInitialValues] = useState<Partial<UserFormValues>>(
    {}
  );

  // Select options
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [restaurantOptions, setRestaurantOptions] = useState<
    RestaurantOption[]
  >([]);

  // ---- data fetching ----
  const fetchRoles = async (): Promise<void> => {
    try {
      const res = await apiAuth.get("/roles");
      const list: Role[] = res.data.data ?? res.data;
      setRoleOptions(
        list.map((r) => ({ value: r.code, label: r.name ?? r.code }))
      );
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar roles");
    }
  };

  const fetchRestaurants = async (): Promise<void> => {
    try {
      const res = await apiAuth.get("/restaurants", {
        params: { perPage: 1000 },
      });
      const list: Restaurant[] = res.data.data ?? res.data;
      setRestaurantOptions(list.map((r) => ({ value: r.id, label: r.name })));
    } catch (e) {
      console.error(e);
      message.error("No se pudieron cargar restaurantes");
    }
  };

  const fetchList = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiAuth.get("/users", {
        params: { page, perPage: pageSize, search },
      });
      const raw: User[] = res.data.data ?? res.data;
      const m = res.data.meta ?? { total: raw.length, page, perPage: pageSize };
      const list = raw.map((u) => ({
        ...u,
        created_at: u.created_at ?? u.createdAt,
      }));
      setData(list);
      setMeta({
        total: Number(m.total ?? list.length),
        page: Number(m.page ?? page),
        perPage: Number(m.perPage ?? pageSize),
      });
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  useEffect(() => {
    fetchRoles();
    fetchRestaurants();
  }, []);

  // ---- actions ----
  const onSearch = (): void => {
    setPage(1);
    fetchList();
  };

  const onRefresh = async (): Promise<void> => {
    await fetchList();
  };

  const openCreate = (): void => {
    setEditing(null);
    // default: status activo, rol sugerido (puedes cambiarlo a 'admin' si prefieres)
    setInitialValues({ status: "active", roleCode: "owner" });
    setOpenModal(true);
  };

  const openEdit = (row: User): void => {
    setEditing(row);
    const roleCode = (row.roleCode ?? row.role?.code) as string | undefined;
    const restaurantId = row.restaurantId ?? row.restaurant?.id;

    setInitialValues({
      fullName: row.fullName,
      email: row.email,
      roleCode,
      restaurantId: roleCode === "superadmin" ? undefined : restaurantId,
      status: normalizeStatus(row.status),
    });
    setOpenModal(true);
  };

  const handleSubmit = async (values: UserFormValues): Promise<void> => {
    try {
      setSaving(true);

      const payloadApi: UserApiPayload = {
        full_name: values.fullName,
        email: values.email,
        role_code: values.roleCode,
        status: values.status,
      };

      // Asociar restaurante solo si el rol NO es superadmin
      if (values.roleCode !== "superadmin" && values.restaurantId != null) {
        payloadApi.restaurant_id = values.restaurantId;
      }

      // En edición la contraseña es opcional
      if (values.password) payloadApi.password = values.password;

      if (editing) {
        await apiAuth.put(`/users/${editing.id}`, payloadApi);
        message.success("Usuario actualizado");
      } else {
        await apiAuth.post("/users", payloadApi);
        message.success("Usuario creado");
      }
      setOpenModal(false);
      fetchList();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const ax = err as AxiosError<{
          message?: string;
          errors?: Array<{ message?: string }>;
        }>;
        const msg =
          ax.response?.data?.errors?.[0]?.message ||
          ax.response?.data?.message ||
          "No se pudo guardar";
        console.error(
          "❌ Axios /users:",
          ax.response?.status,
          ax.response?.data
        );
        message.error(msg);
      } else {
        console.error("❌ Error /users:", err);
        message.error("No se pudo guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: User): Promise<void> => {
    try {
      await apiAuth.delete(`/users/${row.id}`);
      message.success("Usuario eliminado");
      if (data.length === 1 && page > 1) setPage((p) => p - 1);
      else fetchList();
    } catch (e) {
      console.error(e);
      message.error("No se pudo eliminar");
    }
  };

  // ---- table ----
  const columns: ColumnsType<User> = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "fullName",
        key: "fullName",
        render: (v: string) => <strong>{v}</strong>,
      },
      { title: "Email", dataIndex: "email", key: "email" },
      {
        title: "Rol",
        key: "role",
        width: 120,
        render: (_: unknown, row) => {
          const code = row.roleCode ?? row.role?.code;
          return <Tag color="blue">{code}</Tag>;
        },
      },
      {
        title: "Restaurante",
        key: "restaurant",
        render: (_: unknown, row) => row.restaurant?.name ?? "—",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (v: UserStatus) =>
          v === "inactive" ? (
            <Tag color="red">inactive</Tag>
          ) : (
            <Tag color="green">{v ?? "active"}</Tag>
          ),
      },
      {
        title: "Creado",
        dataIndex: "created_at",
        key: "created_at",
        width: 200,
        render: (v?: string) => fmtDate(v),
      },
      {
        title: "Acciones",
        key: "actions",
        width: 200,
        render: (_: unknown, row: User) => (
          <Space>
            <Button size="small" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <Button size="small" danger onClick={() => handleDelete(row)}>
              Eliminar
            </Button>
          </Space>
        ),
      },
    ],
    [] // columnas estáticas
  );
  const ownerRestaurantIds = useMemo(() => {
    const set = new Set<number>();
    for (const u of data) {
      const code = (u.roleCode ?? u.role?.code)?.toLowerCase();
      const rid = u.restaurantId ?? u.restaurant?.id;
      if (code === "owner" && typeof rid === "number") {
        if (!editing || editing.id !== u.id) set.add(rid); // no bloquear al que edito
      }
    }
    return Array.from(set);
  }, [data, editing]);

  return (
    <Card
      title="Usuarios / Centro de Control"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={onSearch}
            style={{ width: 260 }}
          />
          <Button onClick={onRefresh}>Refrescar</Button>
          <Button type="primary" onClick={openCreate}>
            Nuevo usuario
          </Button>
        </Space>
      }
    >
      <Table<User>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total: meta.total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <UserModal
        open={openModal}
        loading={saving}
        isEditing={!!editing}
        initialValues={initialValues}
        title={editing ? `Editar: ${editing.fullName}` : "Nuevo usuario"}
        okText={editing ? "Guardar" : "Crear"}
        roleOptions={roleOptions}
        restaurantOptions={restaurantOptions}
        ownerRestaurantIds={ownerRestaurantIds}
        onCancel={() => setOpenModal(false)}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
