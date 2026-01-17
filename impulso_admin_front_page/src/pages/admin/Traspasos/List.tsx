import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Popconfirm,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { listTraspasos } from "@/lib/api";
import { deleteTraspaso } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function TraspasosList() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  async function load(query?: string) {
    setLoading(true);
    try {
      const { data } = await listTraspasos(query);
      setRows(data);
      console.log(data);
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteTraspaso(id);
      message.success("Traspaso eliminado");
      load(q); // recarga la lista manteniendo el filtro
    } catch (e: any) {
      message.error(e?.message || "No se pudo eliminar");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Título", dataIndex: "title", ellipsis: true },
    {
      title: "Ubicación",
      render: (_: any, r: any) =>
        `${r.colonia ?? "—"} · ${r.alcaldia ?? "—"} · ${r.ciudad ?? "CDMX"}`,
    },
    { title: "m²", dataIndex: "metrosCuadrados", width: 90 },
    { title: "Renta", dataIndex: "rentaMx", width: 120 },
    { title: "Traspaso", dataIndex: "traspasoMx", width: 120 },
    {
      title: "Foto",
      dataIndex: "thumbUrl",
      width: 72,
      render: (url: string) => (
        <div
          style={{
            width: 56,
            height: 42,
            overflow: "hidden",
            borderRadius: 8,
            background: "#f1f5f9",
          }}
        >
          {url ? (
            <img
              src={url}
              alt=""
              width={56}
              height={42}
              style={{ objectFit: "cover" }}
            />
          ) : null}
        </div>
      ),
    },
    {
      title: "Estatus",
      dataIndex: "status",
      width: 120,
      render: (v: string) => (
        <Tag
          color={
            v === "published" ? "green" : v === "draft" ? "default" : "red"
          }
        >
          {v}
        </Tag>
      ),
    },
    {
      title: "Acciones",
      width: 150,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => nav(`/admin/traspasos/${r.id}`)}>
            Editar
          </Button>
          <Popconfirm
            title="Eliminar traspaso"
            description="¿Seguro que quieres eliminar este traspaso? Esta acción no se puede deshacer."
            okText="Sí, eliminar"
            cancelText="Cancelar"
            onConfirm={() => onDelete(r.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
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
            placeholder="Buscar (colonia, alcaldía, título)"
          />
          <Button icon={<SearchOutlined />} onClick={() => load(q)}>
            Buscar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav("/admin/traspasos/0")}
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
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Space>
  );
}
