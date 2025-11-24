import { useEffect, useMemo, useState } from "react";
import { Table, Input, Button, message, Space, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import ServiceModal, { type ServiceValues } from "./ServiceModal";

type Service = {
  id: number;
  name: string;
  sortOrder?: number;
};

export default function ServicesIndex() {
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ServicesRes] = await Promise.all([apiOrder.get("/services")]);
      setServices(ServicesRes.data ?? []);
    } catch {
      message.error("Error al cargar servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredServices = useMemo(() => {
    return services
      .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const ao = a.sortOrder ?? 9999;
        const bo = b.sortOrder ?? 9999;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });
  }, [services, search]);

  const onDuplicateCheck = (v: ServiceValues) => {
    const dup = services.some(
      (a) =>
        a.id !== (editService?.id ?? -1) &&
        a.name.trim().toLowerCase() === v.name.trim().toLowerCase()
    );
    return dup ? "Ya existe un área con ese nombre" : null;
  };

  const handleCreate = async (vals: ServiceValues) => {
    try {
      await apiOrder.post("/services", vals);
      message.success("Área creada");
      setCreateOpen(false);
      fetchAll();
    } catch {
      message.error("Error al crear área");
    }
  };

  const openEdit = (a: Service) => {
    setEditService(a);
    setEditOpen(true);
  };

  const handleEdit = async (vals: ServiceValues) => {
    if (!editService) return;
    try {
      await apiOrder.put(`/services/${editService.id}`, vals);
      message.success("Área actualizada");
      setEditOpen(false);
      setEditService(null);
      fetchAll();
    } catch {
      message.error("Error al actualizar área");
    }
  };

  const deleteService = async (id: number) => {
    try {
      await apiOrder.delete(`/Services/${id}`);
      message.success("Área eliminada");
      fetchAll();
    } catch (e: any) {
      const err = e?.response?.data?.error ?? "Error al eliminar área";
      message.error(err);
    }
  };

  const columns = [
    { title: "Servicio", dataIndex: "name", key: "name" },

    { title: "Orden", dataIndex: "sortOrder", key: "sortOrder", width: 100 },

    {
      title: "Acciones",
      key: "actions",
      width: 280,
      render: (_: any, a: Service) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(a)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar área?"
            description="Se eliminará el área y (si no hay restricciones) sus mesas."
            okText="Sí, eliminar"
            cancelText="Cancelar"
            onConfirm={() => deleteService(a.id)}
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
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar por nombre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Space>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => setCreateOpen(true)}
          >
            Nuevo servicio
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filteredServices}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Crear servicio */}
      <ServiceModal
        open={createOpen}
        mode="create"
        initial={{}}
        confirmLoading={false}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        onDuplicateCheck={onDuplicateCheck}
      />

      {/* Editar servicio */}
      <ServiceModal
        open={editOpen}
        mode="edit"
        initial={
          editService
            ? {
                name: editService.name,
                sortOrder: editService.sortOrder ?? services.length + 1,
              }
            : undefined
        }
        confirmLoading={false}
        onCancel={() => {
          setEditOpen(false);
          setEditService(null);
        }}
        onOk={handleEdit}
        onDuplicateCheck={onDuplicateCheck}
      />
    </div>
  );
}
