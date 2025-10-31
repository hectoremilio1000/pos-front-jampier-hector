// /Users/hectoremilio/Proyectos/growthsuitecompleto/jampiertest/pos-front-jampier-hector/pos_centro_front/src/pages/sa/Restaurants.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import apiAuth, {
  getPairingCode,
  rotatePairingCode,
} from "@/components/apis/apiAuth";
import RestaurantFormModal, {
  type RestaurantFormValues,
} from "@/pages/Restaurants/RestaurantFormModal";
import FacturapiLinkModal from "@/components/Facturapi/FacturapiLinkModal";
import FacturapiStatusModal from "@/components/Facturapi/FacturapiStatusModal";
import {
  registerLiveSecret,
  renewLiveSecret,
  setRestaurantMode,
} from "@/components/apis/apiFacturaMode";

/* ---------- Tipos ---------- */

type NormalizedStatus = "active" | "inactive";
type RestaurantStatus = NormalizedStatus | null | undefined;

type RestaurantApi = {
  id: number | string; // ← tu API manda "1" como string
  name: string;
  slug?: string | null;

  // snake_case
  legal_name?: string | null;
  address_line1?: string | null;
  logo_url?: string | null;
  created_at?: string;
  updated_at?: string;

  // camelCase (por si Lucid serializa así)
  legalName?: string | null;
  addressLine1?: string | null;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;

  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  currency?: string | null;
  plan?: string | null;
  status?: string | null;

  // 🔗 Facturapi (acepta snake/camel)
  facturapi_org_id?: string | null;
  facturapi_ready?: boolean | null;
  facturapi_pending_steps?: any[] | null;

  facturapiOrgId?: string | null;
  facturapiReady?: boolean | null;
  facturapiPendingSteps?: any[] | null;

  // 👇 nuevos (si tu backend los serializa)
  facturapi_mode?: "test" | "live";
  facturapi_live_enabled?: boolean;
  facturapi_live_secret?: string | null; // ⚠️ idealmente NO enviar el valor completo por seguridad (puedes enviar booleano en su lugar)
};

type Restaurant = {
  id: number | string; // para no cascar con "1"
  name: string;
  slug?: string | null;
  legalName?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  timezone?: string | null;
  currency?: string | null;
  plan?: string | null;
  status?: RestaurantStatus;
  logoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;

  // 🔗 Facturapi en UI
  facturapiOrgId?: string | null;
  facturapiReady?: boolean;
  facturapiPendingSteps?: any[];
  facturapiMode?: "test" | "live";
  facturapiLiveEnabled?: boolean;

  facturapiLiveSecret?: string | null;
};

/** Shape para enviar al backend en create/update (sin id/fechas) */
type RestaurantUpsertApi = Omit<
  RestaurantApi,
  "id" | "created_at" | "updated_at"
>;

type PageMeta = { total: number; page: number; perPage: number };

/* ---------- Helpers ---------- */

const apiStatusToRestaurantStatus = (
  s: string | null | undefined
): RestaurantStatus => {
  if (s === "active" || s === "inactive") return s;
  if (s === null) return null;
  return undefined;
};

const normalizeStatus = (s: RestaurantStatus): NormalizedStatus =>
  s === "inactive" ? "inactive" : "active";

/** API -> UI (snake_case a camelCase) */
const fromApi = (row: RestaurantApi): Restaurant => ({
  id: row.id,
  name: row.name,
  slug: row.slug ?? null,
  legalName: row.legal_name ?? row.legalName ?? null,
  addressLine1: row.address_line1 ?? row.addressLine1 ?? null,
  city: row.city ?? null,
  state: row.state ?? null,
  phone: row.phone ?? null,
  email: row.email ?? null,
  timezone: row.timezone ?? null,
  currency: row.currency ?? null,
  plan: row.plan ?? null,
  status: apiStatusToRestaurantStatus(row.status),
  logoUrl: row.logo_url ?? row.logoUrl ?? null,
  createdAt: row.created_at ?? row.createdAt ?? undefined,
  updatedAt: row.updated_at ?? row.updatedAt ?? undefined,

  // 🔗 Facturapi
  facturapiOrgId: row.facturapi_org_id ?? row.facturapiOrgId ?? null,
  facturapiReady: (row.facturapi_ready ??
    row.facturapiReady ??
    false) as boolean,
  facturapiPendingSteps: (row.facturapi_pending_steps ??
    row.facturapiPendingSteps ??
    []) as any[],
  facturapiMode:
    (row as any).facturapi_mode ?? (row as any).facturapiMode ?? "test",
  facturapiLiveEnabled:
    (row as any).facturapi_live_enabled ??
    (row as any).facturapiLiveEnabled ??
    false,
  facturapiLiveSecret:
    (row as any).facturapi_live_secret ??
    (row as any).facturapiLiveSecret ??
    null,
});

/** UI -> API (camelCase a snake_case) para crear/editar */
const toApi = (v: RestaurantFormValues): RestaurantUpsertApi => ({
  name: v.name,
  slug: v.slug ?? null,
  legal_name: v.legalName ?? null,
  address_line1: v.addressLine1 ?? null,
  city: v.city ?? null,
  state: v.state ?? null,
  phone: v.phone ?? null,
  email: v.email ?? null,
  timezone: v.timezone ?? "America/Mexico_City",
  currency: v.currency ?? "MXN",
  plan: v.plan === "basic" ? "standard" : (v.plan ?? "free"),
  status: v.status === "inactive" ? "suspended" : (v.status ?? "active"),
  logo_url: v.logoUrl ?? null,
});

/* ---------- Componente ---------- */

function PairingCodeButton({ restaurantId }: { restaurantId: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [rotatedAt, setRotatedAt] = useState<string | null>(null);

  const openModal = async () => {
    setLoading(true);
    try {
      const res = await getPairingCode(restaurantId);
      const maybe = res.pairingCode;
      setCode(maybe && maybe !== "PENDING" ? maybe : null);
      setRotatedAt(res.rotatedAt ?? null);
      setOpen(true);
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar el código maestro");
    } finally {
      setLoading(false);
    }
  };

  const doRotate = async () => {
    setLoading(true);
    try {
      const res = await rotatePairingCode(restaurantId);
      setCode(res.pairingCode);
      setRotatedAt(res.rotatedAt ?? null);
      message.success("Código maestro actualizado");
    } catch (e) {
      console.error(e);
      message.error("No se pudo rotar el código maestro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="small" onClick={openModal} loading={loading}>
        Código maestro
      </Button>
      <Modal
        title="Código maestro del restaurante"
        open={open}
        onCancel={() => setOpen(false)}
        footer={
          <Space>
            <Button
              onClick={() => {
                if (code) {
                  navigator.clipboard.writeText(code);
                  message.success("Copiado");
                }
              }}
              disabled={!code}
            >
              Copiar
            </Button>
            <Button danger onClick={doRotate} loading={loading}>
              Rotar código
            </Button>
          </Space>
        }
      >
        <div style={{ fontSize: 28, fontWeight: 700 }}>
          {code ?? "— (no asignado aún)"}
        </div>
        <div style={{ color: "#888", marginTop: 6 }}>
          {rotatedAt
            ? `Rotado: ${new Date(rotatedAt).toLocaleString("es-MX")}`
            : "Nunca rotado"}
        </div>
        <div style={{ marginTop: 12, color: "#666" }}>
          Este código se usa para el primer arranque de Caja/Comandero.
        </div>
      </Modal>
    </>
  );
}

export default function Restaurants() {
  const [data, setData] = useState<Restaurant[]>([]);
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

  // Modal state
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [initialValues, setInitialValues] = useState<
    Partial<RestaurantFormValues>
  >({});

  // estado:
  const [openLink, setOpenLink] = useState(false);
  const [openStatus, setOpenStatus] = useState(false);
  const [rowFx, setRowFx] = useState<Restaurant | null>(null);

  // Estado modal live secret
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [liveModalRow, setLiveModalRow] = useState<Restaurant | null>(null);
  const [liveSecretInput, setLiveSecretInput] = useState("");
  const [submittingLive, setSubmittingLive] = useState(false);

  const openLiveSecretModal = (row: Restaurant) => {
    setLiveModalRow(row);
    setLiveSecretInput("");
    setLiveModalOpen(true);
  };

  const submitLiveSecret = async () => {
    if (!liveModalRow?.id) return;
    if (!liveSecretInput || !liveSecretInput.startsWith("sk_live_")) {
      message.error("La Live Secret debe iniciar con sk_live_");
      return;
    }
    try {
      setSubmittingLive(true);
      await registerLiveSecret(liveModalRow.id, liveSecretInput.trim());
      message.success("Live Secret registrada");
      setLiveModalOpen(false);
      setLiveSecretInput("");
      fetchList();
    } catch (e: any) {
      message.error(
        e?.response?.data?.error || "No se pudo registrar la Live Secret"
      );
    } finally {
      setSubmittingLive(false);
    }
  };

  const openFacturapiLink = (row: Restaurant) => {
    setRowFx(row);
    setOpenLink(true);
  };
  const openFacturapiStatus = (row: Restaurant) => {
    setRowFx(row);
    setOpenStatus(true);
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiAuth.get("/restaurants", {
        params: { page, perPage: pageSize, search },
      });

      // soporta paginado (data/meta) o arreglo plano
      const rawList: RestaurantApi[] = (res.data?.data ??
        res.data ??
        []) as RestaurantApi[];
      const list = rawList.map(fromApi);

      const m = res.data?.meta ?? {
        total: Array.isArray(rawList) ? rawList.length : 0,
        page,
        perPage: pageSize,
      };

      setData(list);
      console.log(list);
      setMeta({
        total: Number(m.total ?? list.length),
        page: Number(m.page ?? page),
        perPage: Number(m.perPage ?? pageSize),
      });
    } catch (e) {
      console.error(e);
      message.error("No se pudo cargar restaurantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const onSearch = () => {
    setPage(1);
    fetchList();
  };
  const onRefresh = () => fetchList();

  const openCreate = () => {
    setEditing(null);
    setInitialValues({
      plan: "free",
      status: "active",
      timezone: "America/Mexico_City",
      currency: "MXN",
    });
    setOpenModal(true);
  };

  const openEdit = (row: Restaurant) => {
    setEditing(row);
    setInitialValues({
      name: row.name,
      slug: row.slug ?? undefined,
      legalName: row.legalName ?? undefined,
      addressLine1: row.addressLine1 ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      timezone: row.timezone ?? undefined,
      currency: row.currency ?? undefined,
      plan: row.plan ?? "free",
      status: normalizeStatus(row.status),
      logoUrl: row.logoUrl ?? undefined,
    });
    setOpenModal(true);
  };

  const handleSubmit = async (values: RestaurantFormValues) => {
    try {
      setSaving(true);
      const payload = toApi(values); // -> snake_case

      if (editing) {
        await apiAuth.put(`/restaurants/${editing.id}`, payload);
        message.success("Restaurante actualizado");
      } else {
        await apiAuth.post("/restaurants", payload);
        message.success("Restaurante creado");
      }

      setOpenModal(false);
      fetchList();
    } catch (err) {
      console.error(err);
      message.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Restaurant) => {
    try {
      await apiAuth.delete(`/restaurants/${row.id}`);
    } catch (e) {
      console.error(e);
      message.error("No se pudo eliminar");
      return;
    }
    message.success("Restaurante eliminado");
    if (data.length === 1 && page > 1) setPage((p) => p - 1);
    else fetchList();
  };
  const [renewingId, setRenewingId] = useState<string | number | null>(null);
  const columns: ColumnsType<Restaurant> = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "name",
        key: "name",
        render: (v: string) => <strong>{v}</strong>,
      },
      {
        title: "Plan",
        dataIndex: "plan",
        key: "plan",
        width: 120,
        render: (v) => <span>{v ?? "—"}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (v: RestaurantStatus) =>
          v === "inactive" ? (
            <Tag color="red">inactive</Tag>
          ) : (
            <Tag color="green">{v ?? "active"}</Tag>
          ),
      },
      {
        title: "Creado",
        dataIndex: "createdAt", // 👈
        key: "created_at",
        width: 200,
        render: (v?: string) => (v ? new Date(v).toLocaleString("es-MX") : "—"),
      },
      {
        title: "Facturapi",
        key: "facturapi",
        width: 420,
        render: (_: unknown, row: Restaurant) => {
          const canRenew = !!row.facturapiOrgId && !!row.facturapiReady;
          return (
            <Space wrap>
              {row.facturapiOrgId ? (
                <>
                  <Tag color={row.facturapiReady ? "green" : "orange"}>
                    {row.facturapiReady ? "Conectado" : "Pendiente"}
                  </Tag>
                  <Button size="small" onClick={() => openFacturapiStatus(row)}>
                    Estado
                  </Button>

                  {row.facturapiLiveSecret ? (
                    <Tag color="blue">Live Secret registrada</Tag>
                  ) : (
                    <Button
                      size="small"
                      type="dashed"
                      onClick={() => openLiveSecretModal(row)}
                    >
                      Registrar Live Secret
                    </Button>
                  )}

                  <Button
                    size="small"
                    loading={renewingId === row.id}
                    onClick={async () => {
                      if (!canRenew) {
                        message.warning(
                          "La organización aún no está lista para producción"
                        );
                        return;
                      }
                      try {
                        setRenewingId(row.id);
                        await renewLiveSecret(row.id);
                        message.success(
                          "Nueva Live API Key generada y guardada"
                        );
                        fetchList();
                      } catch (e: any) {
                        message.error(
                          e?.response?.data?.error ||
                            "No se pudo generar la Live API Key"
                        );
                      } finally {
                        setRenewingId(null);
                      }
                    }}
                    disabled={!canRenew}
                  >
                    Generar nueva Live API Key
                  </Button>
                </>
              ) : (
                <Button
                  type="primary"
                  size="small"
                  onClick={() => openFacturapiLink(row)}
                >
                  Conectar
                </Button>
              )}
            </Space>
          );
        },
      },
      {
        title: "Modo",
        key: "mode",
        width: 240,
        render: (_: unknown, row: Restaurant) => {
          const canLive =
            !!row.facturapiOrgId &&
            !!row.facturapiReady &&
            !!row.facturapiLiveSecret; // backend también valida live keys y readiness

          const disabledReason = !row.facturapiOrgId
            ? "Conecta Facturapi primero"
            : !row.facturapiReady
              ? "La organización no está lista para producción"
              : !row.facturapiLiveSecret
                ? "Registra una Live Secret (sk_live_)"
                : undefined;

          return (
            <Space wrap>
              <Tag color={row.facturapiMode === "live" ? "green" : "default"}>
                {row.facturapiMode?.toUpperCase()}
              </Tag>
              <Switch
                checked={row.facturapiMode === "live"}
                onChange={async (val) => {
                  try {
                    const target = val ? "live" : "test";
                    await setRestaurantMode(row.id, target as any);
                    message.success(`Modo ${target.toUpperCase()} establecido`);
                    fetchList();
                  } catch (e: any) {
                    message.error(
                      e?.response?.data?.error || "No se pudo cambiar modo"
                    );
                  }
                }}
                checkedChildren="Live"
                unCheckedChildren="Test"
                disabled={!canLive}
              />
              {disabledReason ? (
                <span style={{ fontSize: 12, color: "#999" }}>
                  {disabledReason}
                </span>
              ) : null}
            </Space>
          );
        },
      },

      {
        title: "Acciones",
        key: "actions",
        width: 200,
        render: (_: unknown, row: Restaurant) => (
          <Space>
            <Button size="small" onClick={() => openEdit(row)}>
              Editar
            </Button>
            <PairingCodeButton restaurantId={Number(row.id)} />
            <Button size="small" danger onClick={() => handleDelete(row)}>
              Eliminar
            </Button>
          </Space>
        ),
      },
    ],
    [data]
  );

  return (
    <Card
      title="Restaurantes"
      extra={
        <Space>
          <Input.Search
            allowClear
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={onSearch}
            style={{ width: 260 }}
          />
          <Button onClick={onRefresh}>Refrescar</Button>
          <Button type="primary" onClick={openCreate}>
            Nuevo restaurante
          </Button>
        </Space>
      }
    >
      <Table<Restaurant>
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
      <RestaurantFormModal
        open={openModal}
        loading={saving}
        initialValues={initialValues}
        title={editing ? `Editar: ${editing.name}` : "Nuevo restaurante"}
        okText={editing ? "Guardar" : "Crear"}
        onCancel={() => setOpenModal(false)}
        onSubmit={handleSubmit}
      />
      <FacturapiLinkModal
        open={openLink}
        onClose={() => setOpenLink(false)}
        restaurant={rowFx}
        onLinked={fetchList}
      />
      <FacturapiStatusModal
        open={openStatus}
        onClose={() => setOpenStatus(false)}
        restaurant={rowFx}
        getRestaurants={fetchList}
      />
      <Modal
        open={liveModalOpen}
        title={`Registrar Live Secret ${liveModalRow ? `– ${liveModalRow.name}` : ""}`}
        onCancel={() => setLiveModalOpen(false)}
        okText="Guardar Live Secret"
        confirmLoading={submittingLive}
        onOk={submitLiveSecret}
      >
        <Input.Password
          placeholder="Pega tu sk_live_… (solo se muestra una vez al crearla en Facturapi)"
          value={liveSecretInput}
          onChange={(e) => setLiveSecretInput(e.target.value)}
        />
        <p style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
          Recomendación: guarda esta llave de forma segura. Tu backend la
          utilizará para timbrar en producción.
        </p>
      </Modal>
    </Card>
  );
}
