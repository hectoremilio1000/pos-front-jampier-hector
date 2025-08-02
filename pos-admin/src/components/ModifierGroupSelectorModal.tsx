import { useEffect, useState } from "react";
import { Modal, Collapse, Checkbox, Spin, message } from "antd";
import apiOrder from "./apis/apiOrder";

const { Panel } = Collapse;

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSave: (ids: number[]) => void;
}

export default function ModifierGroupSelectorModal({
  open,
  onClose,
  selectedIds,
  onSave,
}: Props) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempSelected, setTempSelected] = useState<number[]>(selectedIds);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await apiOrder.get("/modifier-groups");
        const full = await Promise.all(
          res.data.map(async (g: any) => {
            const detail = await apiOrder.get(`/modifier-groups/${g.id}`);
            return { ...g, modifiers: detail.data.modifiers };
          })
        );
        setGroups(full);
        setTempSelected(selectedIds); // Resetea al abrir
      } catch {
        message.error("Error al cargar modificadores");
      }
      setLoading(false);
    };

    if (open) fetch();
  }, [open, selectedIds]);
  console.log(tempSelected);
  return (
    <Modal
      title="Seleccionar grupos de modificadores"
      open={open}
      onCancel={onClose}
      onOk={() => {
        onSave(tempSelected);
        onClose();
      }}
      width={600}
    >
      <Spin spinning={loading}>
        <Checkbox.Group
          value={tempSelected}
          onChange={(checked) => setTempSelected(checked as number[])}
          className="w-full"
        >
          <Collapse accordion>
            {groups.map((group) => {
              const alreadySelected = selectedIds.includes(group.id);
              if (alreadySelected) return null;

              return (
                <Panel header={group.name} key={group.id}>
                  <ul className="pl-4 list-disc text-sm">
                    {group.modifiers.map((m: any) => (
                      <li key={m.id}>
                        {m.name}
                        {m.priceDelta > 0 && (
                          <span className="text-green-600">
                            {" "}
                            (+${m.priceDelta})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <Checkbox value={group.id}>Asignar este grupo</Checkbox>
                  </div>
                </Panel>
              );
            })}
          </Collapse>
        </Checkbox.Group>
      </Spin>
    </Modal>
  );
}
