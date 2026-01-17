import { Button, Card, Space, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function ApplyStep2Psych({
  psychToken,
  onDone,
}: {
  psychToken: string;
  onDone: () => void;
}) {
  return (
    <Card>
      <Title level={4}>Paso 2: Examen psicométrico</Title>
      <Paragraph>Responde todas las preguntas y envía el examen.</Paragraph>

      {/* Reutilizamos PublicExam forzando type/token */}
      <PublicExamWrapper
        type="psychometric"
        token={psychToken}
        onDone={onDone}
      />
    </Card>
  );
}

function PublicExamWrapper({
  type,
  token,
  onDone,
}: {
  type: "psychometric" | "practical";
  token: string;
  onDone: () => void;
}) {
  // Truco: PublicExam usa useParams. Para no reescribirlo, lo más fácil es
  // crear una versión que reciba props. Si no quieres refactor, aquí solo te
  // dejo el patrón: refactor PublicExam a aceptar props opcionales.
  return (
    <>
      {/* 1) Recomendación: refactor PublicExam para aceptar props (typeOverride/tokenOverride)
          2) Mientras: simplemente muestra link y botón abrir.
      */}
      <Space direction="vertical" style={{ width: "100%" }}>
        <a href={`/exam/${type}/${token}`} target="_blank" rel="noreferrer">
          Abrir examen en pestaña
        </a>
        <Button type="primary" onClick={onDone}>
          Ya envié el psicométrico
        </Button>
      </Space>
    </>
  );
}
