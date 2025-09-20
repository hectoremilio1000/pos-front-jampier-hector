import { DatePicker, Input, Modal, Space } from "antd";
import type { Dayjs } from "dayjs";

type Props = {
  open: boolean;
  loading?: boolean;
  value: Dayjs | null;
  notes: string;
  onChangeDate: (d: Dayjs | null) => void;
  onChangeNotes: (txt: string) => void;
  onCancel: () => void;
  onSubmit: () => Promise<void> | void;
};

export default function InvoiceDueModal({
  open,
  loading,
  value,
  notes,
  onChangeDate,
  onChangeNotes,
  onCancel,
  onSubmit,
}: Props) {
  return (
    <Modal
      title="Editar vencimiento"
      open={open}
      confirmLoading={!!loading}
      onCancel={onCancel}
      onOk={onSubmit}
      okText="Guardar"
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <DatePicker
          showTime
          style={{ width: "100%" }}
          value={value}
          onChange={onChangeDate}
        />
        <Input.TextArea
          rows={3}
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
        />
      </Space>
    </Modal>
  );
}
