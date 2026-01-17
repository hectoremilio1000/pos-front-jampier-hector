import { useEffect, useState } from "react";
import { Button, Card, Table, Space, Popconfirm, message } from "antd";
import { useNavigate } from "react-router-dom";
import { listBlogPosts, deleteBlogPost } from "@/lib/blogApi";

export default function BlogList() {
  const nav = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = (await listBlogPosts(100, 1, "all")) as {
        meta: any;
        data: any[];
      };
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const columns = [
    { title: "ID", dataIndex: "id", width: 70 },
    { title: "Título", dataIndex: "title" },
    { title: "Slug", dataIndex: "slug" },
    {
      title: "Autor",
      render: (_: any, r: any) => r.author?.name || r.authorName || "—",
    },
    {
      title: "Fecha",
      render: (_: any, r: any) =>
        r.publishedAt
          ? new Date(r.publishedAt).toLocaleDateString("es-MX")
          : "—",
    },
    {
      title: "Cover",
      dataIndex: "coverImage",
      render: (url: string) =>
        url ? (
          <img
            src={url}
            style={{
              width: 56,
              height: 42,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        ) : null,
      width: 72,
    },
    {
      title: "Acciones",
      width: 160,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => nav(`/admin/blog/${r.id}`)}>
            Editar
          </Button>
          <Popconfirm
            title="Eliminar post"
            okText="Sí"
            cancelText="No"
            onConfirm={async () => {
              await deleteBlogPost(r.id);
              message.success("Eliminado");
              load();
            }}
          >
            <Button danger size="small">
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        extra={
          <Button type="primary" onClick={() => nav("/admin/blog/0")}>
            Nuevo post
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={rows}
          columns={columns}
          loading={loading}
        />
      </Card>
    </Space>
  );
}
