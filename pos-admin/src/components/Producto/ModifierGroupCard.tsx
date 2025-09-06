import { Card, InputNumber, Switch, Button, Tag, Divider } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import ProductSelectorModal, { type ProductMod } from "./ProductSelectorModal";

export interface ModifierLine {
  modifierGroupId: number;
  modifierId: number | null;
  priceDelta: number;
  isEnabled: boolean;
  modifier: ProductMod;
}

export interface ModifierGroupConfig {
  id: number;
  name: string;
  code: string;
  includedQty: number;
  maxQty: number;
  isForced: boolean;
  captureIncluded: boolean;
  priority: number;
  modifiers: ModifierLine[];
  isNew: boolean;
}

export default function ModifierGroupCard({
  group,
  onRemove,
  onUpdate,
  parentProductGroupId,
  modifiersGroups,
}: {
  group: ModifierGroupConfig;
  onRemove: () => void;
  onUpdate: (updated: ModifierGroupConfig) => void;
  parentProductGroupId: number;
  modifiersGroups: any;
}) {
  const [selOpen, setSelOpen] = useState(false);
  const cfg = (k: keyof ModifierGroupConfig, v: any) =>
    onUpdate({ ...group, [k]: v });

  /* actualizar línea */
  const updLine = (idx: number, f: keyof ModifierLine, val: any) => {
    const copy = [...group.modifiers];
    copy[idx] = { ...copy[idx], [f]: val };
    onUpdate({ ...group, modifiers: copy });
  };

  // const delLine = (idx: number) => {
  //   const copy = [...group.modifiers];
  //   copy.splice(idx, 1);
  //   onUpdate({ ...group, modifiers: copy });
  // };

  return (
    <Card
      title={`${group.name} (${group.code})`}
      className="mb-4 shadow-md"
      extra={
        <Button size="small" danger onClick={onRemove}>
          Eliminar grupo
        </Button>
      }
    >
      {/* Configuración */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">Cantidad incluida</label>
          <InputNumber
            min={0}
            value={group.includedQty}
            onChange={(v) => cfg("includedQty", v ?? 0)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Cantidad máxima</label>
          <InputNumber
            min={0}
            value={group.maxQty}
            onChange={(v) => cfg("maxQty", v ?? 0)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mr-2">Obligatorio</label>
          <Switch
            checked={group.isForced}
            onChange={(v) => cfg("isForced", v)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mr-2">
            Captura modificadores incluidos
          </label>
          <Switch
            checked={group.captureIncluded}
            onChange={(v) => cfg("captureIncluded", v)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Prioridad</label>
          <InputNumber
            min={0}
            value={group.priority}
            onChange={(v) => cfg("priority", v ?? 0)}
            className="w-full"
          />
        </div>
      </div>

      <Divider>Modificadores</Divider>

      {group.modifiers.map((m, i) => (
        <div
          key={i}
          className="flex items-center justify-between mb-2 bg-gray-100 px-2 py-1 rounded"
        >
          <div className="flex-1">
            <div className="font-medium">{m.modifier.name}</div>
            <div className="text-sm">
              Extra $
              <InputNumber
                disabled
                size="small"
                min={0}
                value={m.priceDelta}
                onChange={(v) => updLine(i, "priceDelta", v ?? 0)}
              />
              <Switch
                size="small"
                disabled
                checked={m.isEnabled}
                onChange={(v) => updLine(i, "isEnabled", v)}
                className="ml-4"
              />
              {!m.isEnabled && <Tag color="red">Off</Tag>}
            </div>
          </div>
        </div>
      ))}

      {/* <Button
        icon={<PlusOutlined />}
        size="small"
        type="dashed"
        onClick={() => setSelOpen(true)}
      >
        Añadir modificador
      </Button> */}

      {selOpen && (
        <ProductSelectorModal
          modifiersGroups={modifiersGroups}
          open={selOpen}
          parentGroupId={parentProductGroupId}
          onClose={() => setSelOpen(false)}
          excludeIds={group.modifiers.map((m) => m.modifierId ?? 0)}
          onSelect={(prod) =>
            onUpdate({
              ...group,
              modifiers: [
                ...group.modifiers,
                {
                  modifierGroupId: group.id,
                  modifierId: prod.id, // null si es nuevo
                  priceDelta: 0,
                  isEnabled: true,
                  modifier: prod, // objeto completo
                },
              ],
            })
          }
        />
      )}
    </Card>
  );
}
