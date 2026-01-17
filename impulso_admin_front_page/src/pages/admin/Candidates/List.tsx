import { useEffect, useState } from "react";
import { Button, Card, Input, Space, Table, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { listCandidates } from "@/lib/rrhhApi";
import { useNavigate } from "react-router-dom";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  // ajusta a tu preferencia: solo fecha, o fecha+hora
  return d.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CandidatesList() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
  });

  async function load(
    page = pagination.current,
    pageSize = pagination.pageSize,
    query = q
  ) {
    setLoading(true);
    try {
      const res = await listCandidates(query, undefined, page, pageSize);
      setRows(res.data || []);
      const meta = res.meta || {};
      const total =
        meta.total ??
        meta.count ??
        meta.totalItems ??
        meta.totalCount ??
        meta.pagination?.total ??
        0;
      const currentPage = Number(meta.page ?? page);
      const perPage = Number(meta.limit ?? pageSize);

      setPagination({
        current: Number.isFinite(currentPage) ? currentPage : 1,
        pageSize: Number.isFinite(perPage) ? perPage : pageSize,
        total: Number(total || res.data?.length || 0),
      });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    {
      title: "Nombre",
      render: (_: any, r: any) => `${r.firstName ?? ""} ${r.lastName ?? ""}`,
    },
    { title: "Teléfono", dataIndex: "phone", width: 140 },
    { title: "WhatsApp", dataIndex: "whatsapp", width: 140 },
    { title: "Rol deseado", dataIndex: "desiredRole", width: 160 },

    {
      title: "Etapa",
      width: 150,
      render: (_: any, r: any) => (
        <Tag color="blue">
          {r.currentStage?.name ?? r.currentStageId ?? "—"}
        </Tag>
      ),
    },
    {
      title: "Creado",
      dataIndex: "createdAt",
      width: 180,
      render: (v: string) => fmtDate(v),
      sorter: (a: any, b: any) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
      defaultSortOrder: "descend", // opcional si quieres ordenar por defecto
    },

    {
      title: "Acciones",
      width: 120,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => nav(`/admin/candidates/${r.id}`)}>
          Editar
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar (nombre, email, rol, tel)"
            onPressEnter={() => load(1, pagination.pageSize, q)}
          />
          <Button
            icon={<SearchOutlined />}
            onClick={() => load(1, pagination.pageSize, q)}
          >
            Buscar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav("/admin/candidates/0")}
          >
            Nuevo
          </Button>
        </Space.Compact>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns as any}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            onChange: (page, pageSize) => load(page, pageSize),
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total}`,
          }}
        />
      </Card>
    </Space>
  );
}
