import { useEffect, useState } from "react";
import { App, Card, Space, Button } from "antd";
import {
  setCandidateStage,
  createInterview,
  createPsychTest,
  getCandidate,
} from "@/lib/rrhhApi";

const isoNow = () => new Date().toISOString();
const isoPlusDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

type Props = {
  candidateId: number;
  currentStageCode?: string | null; // 👈 nuevo
  onChanged?: (stageCode: string) => void;
};

export default function StageActions({
  candidateId,
  currentStageCode,
  onChanged,
}: Props) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState<string | null>(null);
  const [lastInterviewId, setLastInterviewId] = useState<number | null>(null);
  const [lastPsychTestId, setLastPsychTestId] = useState<number | null>(null);
  const [activeCode, setActiveCode] = useState<string | undefined>(
    currentStageCode || undefined
  ); // 👈 local

  useEffect(() => {
    setActiveCode(currentStageCode || undefined);
  }, [currentStageCode]); // 👈 sync prop→state

  function btnType(code: string) {
    return activeCode === code ? "primary" : "default";
  }

  async function fetchLastIds(): Promise<{
    iid: number | null;
    tid: number | null;
  }> {
    const data = await getCandidate(candidateId);
    const interviews = Array.isArray(data.interviews) ? data.interviews : [];
    interviews.sort(
      (a: any, b: any) =>
        (b.scheduledAt ?? "").localeCompare?.(a.scheduledAt ?? "") ||
        b.id - a.id
    );
    const iid = interviews[0]?.id ?? null;

    const tests = Array.isArray(data.psychTests) ? data.psychTests : [];
    tests.sort(
      (a: any, b: any) =>
        (b.assignedAt ?? "").localeCompare?.(a.assignedAt ?? "") || b.id - a.id
    );
    const tid = tests[0]?.id ?? null;

    setLastInterviewId(iid);
    setLastPsychTestId(tid);
    return { iid, tid };
  }
  useEffect(() => {
    fetchLastIds().catch(() => {});
  }, [candidateId]);

  async function go(stageCode: string, extra?: any) {
    setLoading(stageCode);
    try {
      if (stageCode === "interview_scheduled") {
        const interview = await createInterview(candidateId, {
          type: "onsite",
          scheduledAt: isoPlusDays(1),
          interviewerName: "RRHH",
          location: "Oficina",
        });
        setLastInterviewId(interview.id);
        await setCandidateStage(candidateId, {
          stageCode,
          interviewId: interview.id,
          scheduledAt: interview.scheduledAt,
          notes: "Entrevista agendada",
        });
      } else if (stageCode === "interviewed") {
        let iid = lastInterviewId;
        if (!iid) {
          const r = await fetchLastIds();
          iid = r.iid;
        }
        if (!iid) return message.warning("Primero agenda una entrevista");
        await setCandidateStage(candidateId, {
          stageCode,
          interviewId: iid,
          interviewOutcome: extra?.interviewOutcome || "showed",
          notes: "Resultado de entrevista",
        });
      } else if (stageCode === "psychometric_assigned") {
        const test = await createPsychTest(candidateId, {
          testName: extra?.testName || "DISC",
          assignedAt: isoNow(),
        });
        setLastPsychTestId(test.id);
        await setCandidateStage(candidateId, {
          stageCode,
          psychTestId: test.id,
          testName: test.testName,
          notes: "Psicométrico asignado",
        });
      } else if (
        stageCode === "psychometric_passed" ||
        stageCode === "psychometric_failed"
      ) {
        let tid = lastPsychTestId;
        if (!tid) {
          const r = await fetchLastIds();
          tid = r.tid;
        }
        if (!tid) return message.warning("Primero asigna un psicométrico");
        await setCandidateStage(candidateId, {
          stageCode,
          psychTestId: tid,
          testPassed: stageCode === "psychometric_passed",
          notes: "Resultado psicométrico",
        });
      } else {
        await setCandidateStage(candidateId, { stageCode, ...extra });
      }

      setActiveCode(stageCode); // 👈 resalta inmediatamente
      onChanged?.(stageCode); // 👈 y pide al padre recargar si quiere
      message.success(`Etapa: ${stageCode}`);
    } catch (e: any) {
      message.error(e.message || "No se pudo cambiar la etapa");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card title="Etapas rápidas">
      <Space wrap>
        <Button
          type={btnType("contacted")}
          loading={loading === "contacted"}
          onClick={() => go("contacted", { via: "whatsapp" })}
        >
          Contactado
        </Button>
        <Button
          type={btnType("interview_scheduled")}
          loading={loading === "interview_scheduled"}
          onClick={() => go("interview_scheduled")}
        >
          Entrevista agendada
        </Button>
        <Button
          type={btnType("interviewed")}
          loading={loading === "interviewed"}
          onClick={() => go("interviewed", { interviewOutcome: "showed" })}
        >
          Entrevistado
        </Button>
        <Button
          type={btnType("psychometric_assigned")}
          loading={loading === "psychometric_assigned"}
          onClick={() => go("psychometric_assigned", { testName: "DISC" })}
        >
          Psicométrico asignado
        </Button>
        <Button
          type={btnType("psychometric_passed")}
          loading={loading === "psychometric_passed"}
          onClick={() => go("psychometric_passed")}
        >
          Psicométrico aprobado
        </Button>
        <Button type={btnType("offer_made")} onClick={() => go("offer_made")}>
          Oferta realizada
        </Button>
        <Button
          type={btnType("hired")}
          onClick={() => go("hired", { decision: "hired" })}
        >
          Contratado
        </Button>
        <Button
          type={btnType("rejected")}
          onClick={() =>
            go("rejected", { decision: "rejected", reasonCode: "other" })
          }
        >
          Rechazado
        </Button>
      </Space>
    </Card>
  );
}
