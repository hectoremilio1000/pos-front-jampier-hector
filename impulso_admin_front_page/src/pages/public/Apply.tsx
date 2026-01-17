import { useState } from "react";
import { App, Button, Card, Form, Input, Upload, Typography } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { publicApplyCandidate } from "@/lib/rrhhApi";

const { Title, Paragraph } = Typography;

export default function PublicApply() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [file, setFile] = useState<any>(null);

  async function onFinish(vals: any) {
    if (!file) return message.error("CV obligatorio");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(vals).forEach(([k, v]) => fd.append(k, String(v ?? "")));
      fd.append("file", file);
      const r = await publicApplyCandidate(fd);
      setCandidateId(r.candidateId);
      message.success("Postulación enviada");
    } catch (e: any) {
      message.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ maxWidth: 720, margin: "24px auto" }}>
      <Title level={3}>Postúlate</Title>
      <Paragraph>Llena tus datos y sube tu CV (obligatorio).</Paragraph>

      {candidateId ? (
        <Paragraph>
          ✅ Listo. Folio candidato: <b>#{candidateId}</b>
        </Paragraph>
      ) : (
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="firstName"
            label="Nombre"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Apellidos"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono">
            <Input />
          </Form.Item>
          <Form.Item name="desiredRole" label="Puesto deseado">
            <Input />
          </Form.Item>

          <Form.Item label="CV (PDF/DOC/IMG) *">
            <Upload.Dragger
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              maxCount={1}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Arrastra tu CV o haz click</p>
            </Upload.Dragger>
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>
            Enviar
          </Button>
        </Form>
      )}
    </Card>
  );
}
