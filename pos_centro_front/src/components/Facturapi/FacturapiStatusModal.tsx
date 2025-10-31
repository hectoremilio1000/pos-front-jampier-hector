import {
  Modal,
  Descriptions,
  Tag,
  Upload,
  Form,
  Input,
  Button,
  message,
  Popconfirm,
  Space,
} from "antd";
import {
  getOrgStatus,
  uploadCsd,
  updateLegal,
  deleteCsd,
} from "@/apis/apiFacturapi";
import { useEffect, useState } from "react";

export default function FacturapiStatusModal({
  open,
  onClose,
  restaurant,
  getRestaurants,
}: any) {
  const [loading, setLoading] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getOrgStatus(restaurant.id);
      setOrg(res.data);
      // 👇 prefill legales siempre que existan
      form.setFieldsValue({
        name: res.data?.legal?.name,
        legal_name: res.data?.legal?.legal_name,
        tax_system: res.data?.legal?.tax_system,
        address: res.data?.legal?.address,
      });
    } catch {
      message.error("No se pudo consultar el estado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load(); /* eslint-disable-next-line */
  }, [open]);
  // arriba del componente (o fuera)
  const normFileList = (e: any) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };
  const onUploadCsd = async (values: any) => {
    const cerFile = values.cer?.[0]?.originFileObj;
    const keyFile = values.key?.[0]?.originFileObj;
    const password = values.password;

    if (!cerFile || !keyFile || !password) {
      message.error("Falta .cer, .key o password");
      return;
    }

    const fd = new FormData();
    fd.append("cer", cerFile, cerFile.name || "archivo.cer");
    fd.append("key", keyFile, keyFile.name || "archivo.key");
    fd.append("password", password);

    await uploadCsd(restaurant.id, fd);
    message.success(org?.certificate ? "CSD reemplazado" : "CSD subido");
    form.resetFields(["cer", "key", "password"]);
    await load();
    await getRestaurants();
  };

  const onUpdateLegal = async (values: any) => {
    await updateLegal(restaurant.id, values);
    message.success("Datos legales actualizados");
    await load();
  };

  const onDeleteCsd = async () => {
    await deleteCsd(restaurant.id);
    message.success("CSD eliminado");
    await load();
  };

  const hasCsd = !!org?.certificate;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Estado Facturapi"
      width={720}
      confirmLoading={loading}
      destroyOnClose // ← limpia los Upload al cerrar
    >
      {org && (
        <>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID">{org.id}</Descriptions.Item>
            <Descriptions.Item label="Producción lista?">
              <Tag color={org.is_production_ready ? "green" : "orange"}>
                {org.is_production_ready ? "Sí" : "Pendiente"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Pendientes">
              {(org.pending_steps || []).map((s: any) => s.type).join(", ") ||
                "—"}
            </Descriptions.Item>
            <Descriptions.Item label="RFC asignado por CSD">
              {org?.legal?.tax_id || "—"}
            </Descriptions.Item>

            {/* 👇 Detalle de CSD si existe */}
            <Descriptions.Item label="CSD">
              {hasCsd ? (
                <Space direction="vertical" size={2}>
                  <div>
                    <b>Vence:</b> {org?.certificate?.expires_at || "—"}
                  </div>
                  {org?.certificate?.serial_number && (
                    <div>
                      <b>Serie:</b> {org.certificate.serial_number}
                    </div>
                  )}
                  <Space>
                    <Popconfirm
                      title="¿Eliminar CSD?"
                      description="Esto dejará a la organización sin sello hasta que subas otro."
                      onConfirm={onDeleteCsd}
                      okText="Eliminar"
                      cancelText="Cancelar"
                    >
                      <Button danger>Eliminar CSD</Button>
                    </Popconfirm>
                  </Space>
                </Space>
              ) : (
                <Tag>Sin CSD</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>

          <h4 style={{ marginTop: 16 }}>Actualizar datos legales</h4>
          <Form layout="vertical" form={form} onFinish={onUpdateLegal}>
            <Form.Item
              name="name"
              label="Nombre comercial"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="legal_name"
              label="Razón social"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="tax_system"
              label="Régimen (clave SAT)"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name={["address", "zip"]}
              label="CP"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Button htmlType="submit" type="primary">
              Guardar legales
            </Button>
          </Form>

          <h4 style={{ marginTop: 16 }}>
            {hasCsd ? "Reemplazar CSD" : "Subir CSD"}
          </h4>
          <Form layout="vertical" onFinish={onUploadCsd}>
            <Form.Item
              name="cer"
              label=".cer"
              valuePropName="fileList"
              getValueFromEvent={normFileList}
              rules={[{ required: true, message: "Sube el archivo .cer" }]}
            >
              <Upload
                beforeUpload={() => false} // evita upload automático
                multiple={false}
                maxCount={1}
                accept=".cer"
                listType="text"
              >
                <Button>Elegir .cer</Button>
              </Upload>
            </Form.Item>

            <Form.Item
              name="key"
              label=".key"
              valuePropName="fileList"
              getValueFromEvent={normFileList}
              rules={[{ required: true, message: "Sube el archivo .key" }]}
            >
              <Upload
                beforeUpload={() => false}
                multiple={false}
                maxCount={1}
                accept=".key"
                listType="text"
              >
                <Button>Elegir .key</Button>
              </Upload>
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
            <Button htmlType="submit" type="primary">
              {hasCsd ? "Reemplazar CSD" : "Subir CSD"}
            </Button>
          </Form>
        </>
      )}
    </Modal>
  );
}
