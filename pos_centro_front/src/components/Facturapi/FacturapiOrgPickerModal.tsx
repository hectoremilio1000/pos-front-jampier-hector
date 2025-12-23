// src/components/Facturapi/FacturapiOrgPickerModal.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import apiAuth from "@/components/apis/apiAuth";

type OrgRow = {
  id: string;
  name: string;
  legal_name?: string | null;
  is_production_ready: boolean;
  pending_steps?: any[];
  linkedRestaurantId?: number | null;
};

type Props = {
  open: boolean;
  restaurantId: string | number | null | undefined;
  restaurantName?: string;
  onClose: () => void;
  onLinked: () => void; // refrescar lista restaurants
  onCreateNew: () => void; // abre FacturapiLinkModal (crear org)
};

export default function FacturapiOrgPickerModal({
  open,
  restaurantId,
  restaurantName,
  onClose,
  onLinked,
  onCreateNew,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrgRow[]>([]);
  const [selected, setSelected] = useState<OrgRow | null>(null);

  const fetchOrgs = async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const res = await apiAuth.get(
        `/restaurants/${restaurantId}/facturapi/organizations`
      );
      const list: OrgRow[] = res.data?.data ?? [];
      setRows(list);
    } catch (e: any) {
      message.error(
        e?.response?.data?.error || "No se pudieron cargar organizaciones"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setQ("");
      setSelected(null);
      fetchOrgs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restaurantId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const a = (r.name ?? "").toLowerCase();
      const b = (r.legal_name ?? "").toLowerCase();
      return a.includes(s) || b.includes(s) || String(r.id).includes(s);
    });
  }, [rows, q]);

  const linkSelected = async () => {
    if (!restaurantId || !selected) return;
    if (selected.linkedRestaurantId) {
      message.error("Esa organización ya está ligada a otro restaurante");
      return;
    }
    setLinking(true);
    try {
      await apiAuth.post(
        `/restaurants/${restaurantId}/facturapi/link-existing`,
        {
          orgId: selected.id,
        }
      );
      message.success("Organización ligada correctamente");
      onClose();
      onLinked();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "No se pudo ligar");
    } finally {
      setLinking(false);
    }
  };

  const columns: ColumnsType<OrgRow> = [
    {
      title: "Org",
      key: "org",
      render: (_: any, r: OrgRow) => (
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 700 }}>{r.name}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {r.legal_name ? r.legal_name : `ID: ${r.id}`}
          </div>
        </div>
      ),
    },
    {
      title: "Producción",
      key: "prod",
      width: 140,
      render: (_: any, r: OrgRow) =>
        r.is_production_ready ? (
          <Tag color="green">READY</Tag>
        ) : (
          <Tag color="orange">PENDING</Tag>
        ),
    },
    {
      title: "Estado",
      key: "state",
      width: 160,
      render: (_: any, r: OrgRow) =>
        r.linkedRestaurantId ? (
          <Tag color="red">OCUPADA</Tag>
        ) : (
          <Tag color="blue">DISPONIBLE</Tag>
        ),
    },
  ];

  return (
    <Modal
      open={open}
      title={`Seleccionar organización Facturapi${
        restaurantName ? ` – ${restaurantName}` : ""
      }`}
      onCancel={onClose}
      width={820}
      footer={
        <Space>
          <Button onClick={onCreateNew} type="dashed">
            Crear organización
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
          <Button
            type="primary"
            disabled={!selected || !!selected.linkedRestaurantId}
            loading={linking}
            onClick={linkSelected}
          >
            Ligar selección
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          placeholder="Buscar por nombre / razón social / id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          allowClear
        />

        <Table<OrgRow>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8 }}
          rowSelection={{
            type: "radio",
            selectedRowKeys: selected ? [selected.id] : [],
            onChange: (_keys, selectedRows) => {
              setSelected(selectedRows?.[0] ?? null);
            },
            getCheckboxProps: (r) => ({
              disabled: !!r.linkedRestaurantId, // 👈 no deja seleccionar ocupadas
            }),
          }}
        />
      </Space>
    </Modal>
  );
}
