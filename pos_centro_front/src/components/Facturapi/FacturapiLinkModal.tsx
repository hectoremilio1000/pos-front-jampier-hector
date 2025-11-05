import { Modal, Form, Input, message } from "antd";
import { linkOrganization } from "../apis/apiFacturapi";

export default function FacturapiLinkModal({
  open,
  onClose,
  restaurant,
  onLinked,
}: any) {
  const [form] = Form.useForm();

  const onOk = async () => {
    try {
      const { name } = await form.validateFields();
      await linkOrganization(restaurant.id, name || restaurant.name);
      message.success("Organización creada y vinculada");
      onLinked();
      onClose();
    } catch (e: any) {
      message.error(e?.response?.data?.error || "Error al vincular");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onOk}
      title="Conectar con Facturapi"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ name: restaurant?.name }}
      >
        <Form.Item
          name="name"
          label="Nombre comercial"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <p className="text-sm text-gray-500">
          Se creará una <b>Organization</b> en Facturapi y se guardará su{" "}
          <code>organization.id</code> en este Restaurante.
        </p>
      </Form>
    </Modal>
  );
}
