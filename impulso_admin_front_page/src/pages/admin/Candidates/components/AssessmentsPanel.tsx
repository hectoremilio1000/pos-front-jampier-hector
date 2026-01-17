import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Modal, Space, Tag, Typography } from "antd";
import { getCandidate, listPracticalTests } from "@/lib/rrhhApi";

const { Text } = Typography;

type Props = {
  candidateId: number;
};

function statusTag(t: any, label: string) {
  if (!t) return <Tag>Sin {label}</Tag>;
  if (t.takenAt) return <Tag color="green">{label}: Completado</Tag>;
  return <Tag color="gold">{label}: Asignado</Tag>;
}

function scoreTag(t: any) {
  if (!t?.score) return null;
  const s = Number(t.score);
  if (Number.isNaN(s)) return <Tag>{String(t.score)}</Tag>;
  return <Tag color={s >= 8 ? "green" : "red"}>Score: {s}</Tag>;
}

function copy(text: string) {
  navigator.clipboard?.writeText(text);
}

export default function AssessmentsPanel({ candidateId }: Props) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const [psych, setPsych] = useState<any>(null);
  const [prac, setPrac] = useState<any>(null);

  const [openReport, setOpenReport] = useState<null | {
    title: string;
    report: any;
  }>(null);

  async function reload() {
    setLoading(true);
    try {
      const c = await getCandidate(candidateId);
      const psychTests = Array.isArray(c.psychTests) ? c.psychTests : [];
      psychTests.sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0));
      setPsych(psychTests[0] ?? null);

      const ptests = await listPracticalTests(candidateId);
      const arr = Array.isArray(ptests) ? ptests : [];
      arr.sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0));
      setPrac(arr[0] ?? null);
    } catch (e: any) {
      message.error(e?.message || "Error cargando evaluaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const psychLink = useMemo(() => {
    const token = psych?.accessToken ?? psych?.access_token ?? null;
    return token
      ? `${window.location.origin}/exam/psychometric/${token}`
      : null;
  }, [psych]);

  const pracLink = useMemo(() => {
    const token = prac?.accessToken ?? prac?.access_token ?? null;
    return token ? `${window.location.origin}/exam/practical/${token}` : null;
  }, [prac]);

  return (
    <Card
      title="Evaluaciones"
      extra={
        <Button onClick={reload} loading={loading}>
          Refrescar
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        {/* Psicométrico */}
        <Card
          size="small"
          title="Psicométrico"
          extra={statusTag(psych, "Psico")}
        >
          <Space wrap>
            {scoreTag(psych)}
            {psych?.takenAt ? (
              <Tag color="blue">Enviado: {String(psych.takenAt)}</Tag>
            ) : null}
            {psychLink ? (
              <Tag>Link listo</Tag>
            ) : (
              <Tag color="red">Sin link</Tag>
            )}
          </Space>

          <div style={{ marginTop: 10 }}>
            <Space wrap>
              <Button
                disabled={!psychLink}
                onClick={() => {
                  if (!psychLink) return;
                  copy(psychLink);
                  message.success("Link psicométrico copiado");
                }}
              >
                Copiar link
              </Button>

              <Button
                disabled={!psych?.aiReportJson && !psych?.ai_report_json}
                onClick={() => {
                  const rep =
                    psych?.aiReportJson ?? psych?.ai_report_json ?? null;
                  setOpenReport({
                    title: "Reporte psicométrico (IA)",
                    report: rep,
                  });
                }}
              >
                Ver reporte IA
              </Button>
            </Space>

            {psychLink ? (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Link:</Text>{" "}
                <Text code>{psychLink}</Text>
              </div>
            ) : null}
          </div>
        </Card>

        {/* Práctico */}
        <Card
          size="small"
          title="Examen práctico"
          extra={statusTag(prac, "Práctico")}
        >
          <Space wrap>
            {scoreTag(prac)}
            {prac?.takenAt ? (
              <Tag color="blue">Enviado: {String(prac.takenAt)}</Tag>
            ) : null}
            {pracLink ? <Tag>Link listo</Tag> : <Tag color="red">Sin link</Tag>}
          </Space>

          <div style={{ marginTop: 10 }}>
            <Space wrap>
              <Button
                disabled={!pracLink}
                onClick={() => {
                  if (!pracLink) return;
                  copy(pracLink);
                  message.success("Link práctico copiado");
                }}
              >
                Copiar link
              </Button>

              <Button
                disabled={!prac?.aiReportJson && !prac?.ai_report_json}
                onClick={() => {
                  const rep =
                    prac?.aiReportJson ?? prac?.ai_report_json ?? null;
                  setOpenReport({
                    title: "Reporte práctico (IA)",
                    report: rep,
                  });
                }}
              >
                Ver reporte IA
              </Button>
            </Space>

            {pracLink ? (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">Link:</Text> <Text code>{pracLink}</Text>
              </div>
            ) : null}
          </div>
        </Card>
      </Space>

      <Modal
        title={openReport?.title || ""}
        open={!!openReport}
        onCancel={() => setOpenReport(null)}
        onOk={() => setOpenReport(null)}
        okText="Cerrar"
        width={900}
      >
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(openReport?.report ?? null, null, 2)}
        </pre>
      </Modal>
    </Card>
  );
}
