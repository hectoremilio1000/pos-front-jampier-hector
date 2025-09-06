import { useEffect, useState } from "react";
import { Modal, Collapse, Checkbox, Spin, message, Input, Button } from "antd";
import type { ModifierGroupConfig } from "./ModifierGroupCard";
import apiOrder from "../apis/apiOrder";

const { Panel } = Collapse;

interface Props {
  open: boolean;
  onClose: () => void;
  selectedIds: number[];
  onSave: (groups: ModifierGroupConfig[]) => void;
}

export default function SelectorModal({
  open,
  onClose,
  selectedIds,
  onSave,
}: Props) {
  /* estado */
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  /*  ► Carga SOLO los grupos */
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const res = await apiOrder.get("/modifier-groups");
        /* filtra los que ya estén asignados */
        setGroups(res.data.filter((g: any) => !selectedIds.includes(g.id)));
      } catch {
        message.error("Error cargando grupos");
      }
      setLoading(false);
      setPicked([]);
      setNewCode("");
      setNewName("");
    })();
  }, [open, selectedIds]);

  /* helper default */
  const toCfg = (g: any): ModifierGroupConfig => ({
    ...g,
    includedQty: 0,
    maxQty: 1,
    isForced: false,
    captureIncluded: false,
    priority: 0,
  });

  /* crear grupo temporal */
  const addTemp = () => {
    if (!newCode.trim() || !newName.trim()) {
      return message.warning("Código y nombre requeridos");
    }
    const tempId = Date.now() * -1; // id negativo temporal
    const temp = {
      id: tempId,
      code: newCode,
      name: newName,
      isNew: true,
    };
    console.log(groups);
    setGroups([...groups, temp]);
    setPicked([...picked, tempId]);
    setNewCode("");
    setNewName("");
  };

  /* confirmar */
  const confirm = () => {
    console.log(groups);
    const sel = groups.filter((g) => picked.includes(g.id)).map(toCfg);
    console.log(sel);
    onSave(sel);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Elegir / crear grupos"
      onCancel={onClose}
      onOk={confirm}
      okText="Agregar"
      width={500}
    >
      {/* crear rápido */}
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Código"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
        />
        <Input
          placeholder="Nombre del grupo"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="dashed" onClick={addTemp}>
          Crear
        </Button>
      </div>

      <Spin spinning={loading}>
        {groups.length === 0 ? (
          <p className="text-center text-gray-500">Sin grupos disponibles</p>
        ) : (
          <Checkbox.Group
            value={picked}
            onChange={(v) => setPicked(v as number[])}
            className="w-full"
          >
            <Collapse accordion>
              {groups.map((g) => (
                <Panel header={g.name} key={g.id}>
                  <Checkbox value={g.id}>Seleccionar</Checkbox>
                </Panel>
              ))}
            </Collapse>
          </Checkbox.Group>
        )}
      </Spin>
    </Modal>
  );
}
