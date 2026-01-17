import { useParams } from "react-router-dom";
import { Card, Typography } from "antd";
import ExamRunner from "./ExamRunner";

const { Text } = Typography;

export default function PublicExam() {
  const { type = "", token = "" } = useParams();
  const isPsych = type === "psychometric";
  const isPractical = type === "practical";

  if (!isPsych && !isPractical) {
    return (
      <Card style={{ maxWidth: 900, margin: "24px auto" }}>
        Tipo inválido. Usa <Text code>/exam/practical/:token</Text> o{" "}
        <Text code>/exam/psychometric/:token</Text>.
      </Card>
    );
  }

  if (!token) {
    return (
      <Card style={{ maxWidth: 900, margin: "24px auto" }}>
        Link inválido.
      </Card>
    );
  }

  return (
    <ExamRunner
      type={isPsych ? "psychometric" : "practical"}
      token={token}
    />
  );
}
