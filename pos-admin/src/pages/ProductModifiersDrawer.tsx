import { useEffect, useState } from "react";
import {
  Modal,
  Table,
  Tag,
  Button,
  InputNumber,
  message,
  Checkbox,
  Divider,
  Collapse,
} from "antd";
import apiOrder from "@/components/apis/apiOrder";

const { Panel } = Collapse;

export default function ProductModifierGroupsManager({
  open,
  onClose,
  value = [],
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  value: number[];
  onChange: (modifierGroupIds: number[]) => void;
}) {
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>(value);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await apiOrder.get("/modifier-groups");
      const groupsWithModifiers = await Promise.all(
        res.data.map(async (group: any) => {
          const detail = await apiOrder.get(`/modifier-groups/${group.id}`);
          return { ...group, modifiers: detail.data.modifiers };
        })
      );
      setGroups(groupsWithModifiers);
      setSelected(value);
    } catch {
      message.error("Error al cargar grupos de modificadores");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchGroups();
  }, [open]);

  const toggleGroup = (id: number, checked: boolean) => {
    const newSelected = checked
      ? [...selected, id]
      : selected.filter((gid) => gid !== id);
    setSelected(newSelected);
    onChange(newSelected);
  };

  return (
    <Modal
      title="Asignar modificadores al producto"
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="Hecho"
      width={700}
      confirmLoading={loading}
    >
      <Collapse bordered accordion>
        {groups.map((group) => (
          <Panel
            header={
              <div className="flex justify-between items-center">
                <span>{group.name}</span>
                <Checkbox
                  checked={selected.includes(group.id)}
                  onChange={(e) => toggleGroup(group.id, e.target.checked)}
                >
                  Asignar
                </Checkbox>
              </div>
            }
            key={group.id}
          >
            <Divider plain>Modificadores</Divider>
            <Table
              rowKey="id"
              size="small"
              columns={[
                { title: "Nombre", dataIndex: "name" },
                {
                  title: "Precio extra",
                  dataIndex: "priceDelta",
                  render: (val: number) => `$${val.toFixed(2)}`,
                },
                {
                  title: "Estado",
                  dataIndex: "isEnabled",
                  render: (val: boolean) =>
                    val ? (
                      <Tag color="green">Activo</Tag>
                    ) : (
                      <Tag color="red">Inactivo</Tag>
                    ),
                },
              ]}
              dataSource={group.modifiers}
              pagination={false}
            />
          </Panel>
        ))}
      </Collapse>
    </Modal>
  );
}
