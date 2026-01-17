import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { App, Card, Steps, Typography } from "antd";
import ApplyStep1 from "./steps/ApplyStep1";
import ExamRunner from "./exams/ExamRunner";

const { Title, Paragraph } = Typography;

type Session = {
  candidateId: number;
  roleCode: string;
  psychToken: string;
  practicalToken: string;
  step: 1 | 2 | 3;
};

const LS_KEY = "rrhh_apply_session_v1";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(s: Session) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

function clearSession() {
  localStorage.removeItem(LS_KEY);
}

export default function ApplyWizard() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const { step = "1" } = useParams();
  const stepNum = Number(step || 1) as 1 | 2 | 3;

  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = loadSession();
    if (s) setSession(s);
  }, []);

  // Si el usuario intenta ir a paso 2/3 sin sesión, lo regresamos
  if ((stepNum === 2 || stepNum === 3) && !session) {
    return <Navigate to="/apply/1" replace />;
  }

  const current = stepNum - 1;

  return (
    <Card style={{ maxWidth: 980, margin: "24px auto" }}>
      <Title level={3}>Solicitud de empleo</Title>
      <Paragraph>Completa los 3 pasos para finalizar tu postulación.</Paragraph>

      <Steps
        current={current}
        items={[
          { title: "Solicitud + Referencias" },
          { title: "Psicométrico" },
          { title: "Práctico" },
        ]}
        style={{ marginBottom: 16 }}
      />

      {stepNum === 1 ? (
        <ApplyStep1
          onDone={(data) => {
            const s: Session = {
              candidateId: data.candidateId,
              roleCode: data.roleCode,
              psychToken: data.psychToken,
              practicalToken: data.practicalToken,
              step: 2,
            };
            saveSession(s);
            setSession(s);
            nav("/apply/2", { replace: true });
          }}
        />
      ) : stepNum === 2 && session ? (
        <ExamRunner
          type="psychometric"
          token={session.psychToken}
          titlePrefix="Paso 2"
          onSubmitted={() => {
            const s = { ...session, step: 3 as const };
            saveSession(s);
            setSession(s);
            nav("/apply/3", { replace: true });
          }}
        />
      ) : stepNum === 3 && session ? (
        <ExamRunner
          type="practical"
          token={session.practicalToken}
          titlePrefix="Paso 3"
          onSubmitted={() => {
            message.success("Listo. Evaluaciones enviadas.");
            clearSession();
            nav(`/apply/1`, { replace: true });
          }}
        />
      ) : null}
    </Card>
  );
}
