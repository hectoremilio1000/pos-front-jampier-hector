import { Button, Card, Space, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function ApplyStep3Practical({
  practicalToken,
  onDone,
}: {
  practicalToken: string;
  onDone: () => void;
}) {
  return (
    <Card>
      <Title level={4}>Paso 3: Examen práctico</Title>
      <Paragraph>Responde todas las preguntas y envía el examen.</Paragraph>

      <Space direction="vertical" style={{ width: "100%" }}>
        <a
          href={`/exam/practical/${practicalToken}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir examen en pestaña
        </a>
        <Button type="primary" onClick={onDone}>
          Ya envié el práctico
        </Button>
      </Space>
    </Card>
  );
}
