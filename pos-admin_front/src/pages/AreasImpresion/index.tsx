import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table, Input, Button, Space, Popconfirm, message, Tag } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import AreaModal, { type AreaImpresion } from "./AreaModal";
import { listAreas, removeArea } from "./areasImpresion.api";

// Si prefieres mantener los tipos aquí, puedes copiarlos desde AreaModal,
// pero reutilizarlos evita inconsistencias.

export default function AreasImpresionPage() {
  const [rows, setRows] = useState<AreaImpresion[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AreaImpresion | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await listAreas();
      setRows(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Error al cargar las áreas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())),
    [rows, q]
  );

  const columns: ColumnsType<AreaImpresion> = [
    {
      title: "Nombre",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },

    {
      title: "Impresora",
      dataIndex: "printerName",
      render: (_, rec) =>
        rec.printerName ? (
          <Space size="small">
            <span>{rec.printerName}</span>
            {rec.printerShared && <Tag color="blue">Compartida</Tag>}
            {rec.printerDefault && <Tag color="green">Predeterminada</Tag>}
          </Space>
        ) : (
          <span style={{ color: "#999" }}>Sin asignar</span>
        ),
    },
    {
      title: "Acciones",
      width: 220,
      render: (_, rec) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(rec);
              setOpen(true);
            }}
          >
            Editar
          </Button>
          <Popconfirm
            title={`¿Eliminar área "${rec.name}"?`}
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              try {
                await removeArea(rec.id);
                message.success("Área eliminada");
                fetchRows();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } catch (e: any) {
                message.error(
                  e?.response?.data?.message || "Error al eliminar área"
                );
              }
            }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input
          allowClear
          placeholder="Buscar área"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Nueva área
        </Button>
      </div>

      <Table<AreaImpresion>
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        className="bg-white rounded-xl shadow"
      />

      <AreaModal
        open={open}
        initial={editing ?? undefined}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          fetchRows();
        }}
      />
    </div>
  );
}
