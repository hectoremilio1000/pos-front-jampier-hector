// pos-admin/src/pages/Productos/ModifierGroupSelectorModal.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  List,
  Checkbox,
  Space,
  Tag,
  Button,
  message,
  Typography,
} from "antd";
import apiOrder from "@/components/apis/apiOrder";
import type { ModifierGroupConfig, ModifierLine } from "./ModifierGroupCard";

const { Text } = Typography;

type Producto = {
  id: number;
  code: string;
  name: string;
  groupId: number;
  subgroupId: number | null;
  basePrice?: number;
  taxRate?: number;
  isEnabled?: boolean;
};

type ModItem = {
  id: number;
  modifierGroupId: number;
  modifierId: number;
  priceDelta: number;
  isEnabled: boolean;
  modifier?: Producto; // preload del backend
};

type RawGroup = {
  id: number;
  code: string;
  name: string;
  modifiers: ModItem[];
};

export default function ModifierGroupSelectorModal({
  open,
  onClose,
  selectedIds,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: number[]; // grupos ya agregados en el producto
  onSave: (newGroups: ModifierGroupConfig[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<RawGroup[]>([]);
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiOrder.get("/modifier-groups"); // preload('modifiers.modifier')
        const data: RawGroup[] = Array.isArray(res.data)
          ? res.data
          : (res.data?.data ?? []);
        setGroups(data);
        setChosen([]);
      } catch {
        message.error("No se pudieron cargar los grupos de modificadores");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter((g) =>
      `${g.name} ${g.code}`.toLowerCase().includes(s)
    );
  }, [q, groups]);

  const toggle = (id: number) =>
    setChosen((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleOk = () => {
    // Mapear a tu estructura ModifierGroupConfig
    const picked = groups.filter(
      (g) => chosen.includes(g.id) && !selectedIds.includes(g.id)
    );

    const result: ModifierGroupConfig[] = picked.map((g) => {
      const modifiers: ModifierLine[] = (g.modifiers ?? []).map((m) => ({
        modifierGroupId: g.id,
        modifierId: m.modifierId ?? null,
        priceDelta: Number(m.priceDelta ?? 0),
        isEnabled: !!m.isEnabled,
        // ProductMod mínimo para tu UI (si falta basePrice/taxRate, valores por defecto)
        modifier: {
          id: m.modifier?.id ?? null,
          groupId: m.modifier?.groupId ?? 0,
          subgroupId: m.modifier?.subgroupId ?? null,
          code: m.modifier?.code ?? "",
          name: m.modifier?.name ?? "",
          basePrice: m.modifier?.basePrice ?? 0,
          taxRate: m.modifier?.taxRate ?? 16,
          isEnabled: m.modifier?.isEnabled ?? true,
          isNew: false,
        } as any,
      }));

      // Defaults sensatos para la config del pivote
      return {
        id: g.id,
        name: g.name,
        code: g.code,
        includedQty: 0,
        maxQty: 0,
        isForced: false,
        captureIncluded: false,
        priority: 0,
        modifiers,
        isNew: false,
      };
    });

    if (result.length === 0) {
      message.info("No hay grupos nuevos seleccionados");
      return;
    }
    onSave(result);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Agregar"
      cancelText="Cancelar"
      title="Seleccionar grupos de modificadores"
      width={700}
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" className="w-full" size="small">
        <Input
          placeholder="Buscar por nombre o código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          allowClear
        />
        <List
          loading={loading}
          className="mt-2"
          dataSource={filtered}
          locale={{ emptyText: "No hay grupos" }}
          renderItem={(g) => {
            const already = selectedIds.includes(g.id);
            const disabled = already;
            const checked = chosen.includes(g.id);
            return (
              <List.Item
                actions={[
                  already ? (
                    <Tag color="blue" key="ya">
                      Ya agregado
                    </Tag>
                  ) : (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => toggle(g.id)}
                      key="sel"
                    >
                      {checked ? "Quitar" : "Elegir"}
                    </Button>
                  ),
                ]}
              >
                <Space direction="vertical" size={0} className="w-full">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={checked || already}
                      disabled={disabled}
                      onChange={() => toggle(g.id)}
                    />
                    <Text strong>
                      {g.name} <Text type="secondary">({g.code})</Text>
                    </Text>
                    <Tag>{(g.modifiers ?? []).length} mods</Tag>
                  </div>
                  <div className="text-xs text-gray-500">
                    Incluye los modificadores ya definidos en este grupo. Podrás
                    configurar cantidades incluidas, máximo, si es obligatorio,
                    etc., en el producto.
                  </div>
                </Space>
              </List.Item>
            );
          }}
        />
      </Space>
    </Modal>
  );
}
