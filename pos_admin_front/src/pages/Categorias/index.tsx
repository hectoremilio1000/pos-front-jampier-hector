// src/pages/Categorias/index.tsx
import { useEffect, useState } from "react";
import { Table, Input, Button, message, Tag, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import apiOrder from "@/components/apis/apiOrder";
import CategoryModal, { type CategoryValues } from "./CategoryModal";

interface Category {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
}

type CategoryPayload = {
  code: string;
  name: string;
  sortOrder: number;
  isEnabled: boolean;
};

function buildNextCategoryCode(categories: Category[]) {
  const used = new Set(
    categories.map((c) => String(c.code || "").trim().toUpperCase()).filter(Boolean)
  );

  let maxNumericSuffix = 0;
  for (const category of categories) {
    const code = String(category.code || "").trim().toUpperCase();
    const match = code.match(/(\d+)$/);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n)) maxNumericSuffix = Math.max(maxNumericSuffix, n);
  }

  let candidate = maxNumericSuffix + 1;
  while (candidate <= maxNumericSuffix + 5000) {
    const code = `CAT-${String(candidate).padStart(3, "0")}`;
    if (!used.has(code)) return code;
    candidate += 1;
  }

  return `CAT-${Date.now()}`;
}

function getNextSortOrder(categories: Category[]) {
  const max = categories.reduce(
    (acc, category) => Math.max(acc, Number(category.sortOrder) || 0),
    0
  );
  return max + 1;
}

function isDuplicateCodeError(err: any) {
  const msg = String(
    err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      ""
  ).toLowerCase();

  return (
    msg.includes("duplicate") ||
    msg.includes("unique") ||
    msg.includes("already exists") ||
    msg.includes("product_categories_restaurant_id_code_unique")
  );
}

export default function Categorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<CategoryValues | undefined>(
    undefined
  );

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/categories");
      setCategories(res.data);
    } catch {
      message.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  const filtered = categories.filter((c) =>
    `${c.name} ${c.code}`.toLowerCase().includes(search.toLowerCase())
  );

  const onDuplicateCheck = (v: CategoryValues) => {
    const dup = categories.some(
      (c) => c.id !== editId && c.name.trim().toLowerCase() === v.name.trim().toLowerCase()
    );
    return dup ? "Nombre ya existe" : null;
  };

  const handleCreate = async (vals: CategoryValues) => {
    setSaving(true);
    try {
      let currentCategories = categories;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const payload: CategoryPayload = {
          name: vals.name,
          isEnabled: vals.isEnabled,
          code: buildNextCategoryCode(currentCategories),
          sortOrder: getNextSortOrder(currentCategories),
        };

        try {
          await apiOrder.post("/categories", payload);
          message.success("Categoría creada");
          setCreateOpen(false);
          await fetchCategories();
          return;
        } catch (err) {
          if (!isDuplicateCodeError(err) || attempt === 3) throw err;

          const latest = await apiOrder.get("/categories");
          currentCategories = latest.data;
        }
      }
    } catch {
      message.error("Error al crear categoría");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (category: Category) => {
    setEditId(category.id);
    setEditInitial({
      name: category.name,
      isEnabled: category.isEnabled,
    });
    setEditOpen(true);
  };

  const handleEdit = async (vals: CategoryValues) => {
    if (!editId) return;
    setSaving(true);
    try {
      const current = categories.find((c) => c.id === editId);
      if (!current) {
        message.error("No se encontró la categoría a editar");
        return;
      }

      const payload: CategoryPayload = {
        name: vals.name,
        isEnabled: vals.isEnabled,
        code: current.code,
        sortOrder: current.sortOrder,
      };

      await apiOrder.put(`/categories/${editId}`, payload);
      message.success("Categoría actualizada");
      setEditOpen(false);
      setEditId(null);
      fetchCategories();
    } catch {
      message.error("Error al actualizar categoría");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await apiOrder.delete(`/categories/${id}`);
      message.success("Categoría eliminada");
      fetchCategories();
    } catch {
      message.error("Error al eliminar categoría");
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Código", dataIndex: "code", key: "code" },
    { title: "Orden", dataIndex: "sortOrder", key: "sortOrder" },
    {
      title: "Estado",
      dataIndex: "isEnabled",
      key: "isEnabled",
      render: (val: boolean) =>
        val ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
    },
    {
      title: "Acciones",
      key: "actions",
      render: (_: any, record: Category) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Editar
          </Button>
          <Button size="small" danger onClick={() => deleteCategory(record.id)}>
            Eliminar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => setCreateOpen(true)}
        >
          Agregar categoría
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns as any}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <CategoryModal
        open={createOpen}
        mode="create"
        initial={{}}
        confirmLoading={saving}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        onDuplicateCheck={onDuplicateCheck}
      />

      <CategoryModal
        open={editOpen}
        mode="edit"
        initial={editInitial}
        confirmLoading={saving}
        onCancel={() => {
          setEditOpen(false);
          setEditId(null);
        }}
        onOk={handleEdit}
        onDuplicateCheck={onDuplicateCheck}
      />
    </div>
  );
}
