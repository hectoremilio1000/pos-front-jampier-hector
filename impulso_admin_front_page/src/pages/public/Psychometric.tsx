import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { App, Button, Card, Form, Input, Typography } from "antd";
import { publicPsychShow, publicPsychSubmit } from "@/lib/rrhhApi";

const { Title, Paragraph } = Typography;

export default function PublicPsychometric() {
  const { token = "" } = useParams();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    publicPsychShow(token)
      .then(setData)
      .catch((e) => message.error(e.message));
  }, [token]);

  async function onFinish(vals: any) {
    setLoading(true);
    try {
      const r = await publicPsychSubmit(token, { answers: vals });
      setResult(r);
      message.success("Enviado");
    } catch (e: any) {
      message.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!data) return null;

  return (
    <Card style={{ maxWidth: 720, margin: "24px auto" }}>
      <Title level={3}>Examen psicométrico</Title>
      <Paragraph>
        Candidato:{" "}
        <b>
          {data.candidate.firstName} {data.candidate.lastName}
        </b>{" "}
        · Test: <b>{data.test.testName}</b>
      </Paragraph>

      {result ? (
        <Paragraph>
          Resultado IA: <b>{result.score ?? "—"}</b> / 10 · Favorable:{" "}
          <b>{String(result.passed ?? "—")}</b>
        </Paragraph>
      ) : (
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="q1"
            label="¿Por qué quieres este trabajo?"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="q2"
            label="Describe una situación difícil en un trabajo y cómo la resolviste"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Enviar
          </Button>
        </Form>
      )}
    </Card>
  );
}
