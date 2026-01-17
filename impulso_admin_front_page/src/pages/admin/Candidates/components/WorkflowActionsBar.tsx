import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  createInterview,
  createOffer,
  createPsychTest,
  getCandidate,
  setCandidateStage,
} from "@/lib/rrhhApi";

const { Text } = Typography;

type Props = {
  candidateId: number;
  currentStageCode?: string | null;
  onChanged?: () => void; // 👈 el padre recarga candidato y actualiza Tag
};

type CandidateSnapshot = {
  interviews: any[];
  psychTests: any[];
  offers?: any[];
  currentStage?: any;
  currentStageId?: any;
};

export default function WorkflowActionsBar({
  candidateId,
  currentStageCode,
  onChanged,
}: Props) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState<string | null>(null);
  const [snap, setSnap] = useState<CandidateSnapshot | null>(null);

  // Modales
  const [openInterview, setOpenInterview] = useState(false);
  const [openPsych, setOpenPsych] = useState(false);
  const [openOffer, setOpenOffer] = useState(false);
  const [openPsychResult, setOpenPsychResult] = useState(false);

  const [interviewForm] = Form.useForm();
  const [psychForm] = Form.useForm();
  const [offerForm] = Form.useForm();

  async function reload() {
    const data = await getCandidate(candidateId);
    setSnap({
      interviews: Array.isArray(data.interviews) ? data.interviews : [],
      psychTests: Array.isArray(data.psychTests) ? data.psychTests : [],
      offers: Array.isArray(data.offers) ? data.offers : [],
      currentStage: data.currentStage ?? null,
      currentStageId: data.currentStageId ?? null,
    });
  }

  useEffect(() => {
    reload().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const stageCode = useMemo(() => {
    return (
      currentStageCode ||
      snap?.currentStage?.code ||
      (snap?.currentStageId ? String(snap.currentStageId) : "received")
    );
  }, [currentStageCode, snap]);

  const isTerminal = stageCode === "hired" || stageCode === "rejected";

  const lastInterview = useMemo(() => {
    const arr = [...(snap?.interviews || [])];
    arr.sort(
      (a: any, b: any) =>
        (b.scheduledAt ?? "").localeCompare?.(a.scheduledAt ?? "") ||
        b.id - a.id
    );
    return arr[0] ?? null;
  }, [snap]);

  const lastTest = useMemo(() => {
    const arr = [...(snap?.psychTests || [])];
    arr.sort(
      (a: any, b: any) =>
        (b.assignedAt ?? "").localeCompare?.(a.assignedAt ?? "") || b.id - a.id
    );
    return arr[0] ?? null;
  }, [snap]);

  const lastOffer = useMemo(() => {
    const arr = [...(snap?.offers || [])];
    arr.sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0));
    return arr[0] ?? null;
  }, [snap]);

  const canReject =
    !isTerminal &&
    [
      "interview_scheduled",
      "interviewed",
      "psychometric_assigned",
      "psychometric_passed",
      "psychometric_failed",
      "offer_made",
    ].includes(stageCode);

  async function run<T>(actionKey: string, fn: () => Promise<T>) {
    setLoading(actionKey);
    try {
      await fn(); // ✅ puede devolver lo que sea, lo ignoramos
      await reload();
      onChanged?.();
      message.success("Listo");
    } catch (e: any) {
      message.error(e?.message ?? "Error");
    } finally {
      setLoading(null);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Acciones simples por stage
  // ─────────────────────────────────────────────────────────────

  const showContacted =
    !isTerminal && ["received", "contacted"].includes(stageCode);
  const showScheduleInterview =
    !isTerminal && ["contacted"].includes(stageCode);

  const showInterviewed =
    !isTerminal && ["interview_scheduled"].includes(stageCode);

  const showAssignPsych =
    !isTerminal && ["interview_scheduled", "interviewed"].includes(stageCode);

  const showPsychResult =
    !isTerminal &&
    [
      "psychometric_assigned",
      "psychometric_passed",
      "psychometric_failed",
    ].includes(stageCode);

  const showOffer = !isTerminal && ["psychometric_passed"].includes(stageCode);

  const showOfferLink = !isTerminal && ["offer_made"].includes(stageCode);

  // ─────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────

  return (
    <Card
      title={
        <Space>
          <span>Flujo de trabajo</span>
          <Tag color={isTerminal ? "red" : "blue"}>{stageCode}</Tag>
        </Space>
      }
      extra={<Button onClick={() => reload()}>Refrescar</Button>}
    >
      {isTerminal ? (
        <div style={{ opacity: 0.75 }}>
          Etapa terminal: <b>{stageCode}</b>. No hay más acciones.
        </div>
      ) : (
        <Space wrap>
          {/* 1) Contactado */}
          {showContacted && stageCode !== "contacted" && (
            <Button
              type="primary"
              loading={loading === "contacted"}
              onClick={() =>
                run("contacted", () =>
                  setCandidateStage(candidateId, {
                    stageCode: "contacted",
                    via: "whatsapp",
                  })
                )
              }
            >
              Marcar como Contactado
            </Button>
          )}

          {/* 2) Agendar entrevista (modal) */}
          {showScheduleInterview && (
            <Button
              type="primary"
              onClick={() => {
                interviewForm.setFieldsValue({
                  type: "onsite",
                  scheduledAt: dayjs().add(1, "day"),
                  interviewerName: "RRHH",
                  location: "Oficina",
                  meetingLink: "",
                  notes: "",
                });
                setOpenInterview(true);
              }}
            >
              Agendar entrevista
            </Button>
          )}

          {/* 3) Marcar entrevistado (usa último interviewId) */}
          {showInterviewed && (
            <Button
              loading={loading === "interviewed"}
              onClick={() => {
                if (!lastInterview?.id) {
                  return message.warning("No hay entrevista creada");
                }
                Modal.confirm({
                  title: "Marcar como entrevistado",
                  okText: "Marcar",
                  cancelText: "Cancelar",
                  content: (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        Se usará la última entrevista #{lastInterview.id}.
                      </Text>
                    </div>
                  ),
                  onOk: async () => {
                    await run("interviewed", () =>
                      setCandidateStage(candidateId, {
                        stageCode: "interviewed",
                        interviewId: lastInterview.id,
                        interviewOutcome: "showed",
                        notes: "Entrevista realizada",
                      })
                    );
                  },
                });
              }}
            >
              Marcar entrevistado
            </Button>
          )}

          {/* 4) Asignar psicométrico (modal) */}
          {showAssignPsych && (
            <Button
              onClick={() => {
                // Si YA existe un psych test, NO queremos "crear" otro:
                // queremos permitir marcar la etapa como "psychometric_assigned"
                if (lastTest?.id) {
                  Modal.confirm({
                    title: "Marcar psicométrico asignado",
                    content: (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">
                          Ya existe un psicométrico (#{lastTest.id}). Esto solo
                          marcará la etapa.
                        </Text>
                      </div>
                    ),
                    okText: "Marcar etapa",
                    cancelText: "Cancelar",
                    onOk: async () => {
                      await run("mark_psych_assigned", () =>
                        setCandidateStage(candidateId, {
                          stageCode: "psychometric_assigned",
                          psychTestId: lastTest.id,
                          notes:
                            "Etapa marcada manualmente (test ya existente)",
                        })
                      );
                    },
                  });
                  return;
                }

                // Si NO existe, entonces sí abrimos modal para crear uno (tu flujo normal)
                if (!lastInterview?.id)
                  return message.warning("Primero agenda una entrevista");
                psychForm.setFieldsValue({ testName: "DISC" });
                setOpenPsych(true);
              }}
            >
              {lastTest?.id
                ? "Marcar psicométrico asignado"
                : "Asignar psicométrico"}
            </Button>
          )}

          {/* 5) Ver resultados + aprobar/desaprobar (manual) */}
          {showPsychResult && (
            <Button
              onClick={() => {
                if (!lastTest?.id)
                  return message.warning("No hay psicométrico asignado");
                setOpenPsychResult(true);
              }}
            >
              Ver resultado psicométrico
            </Button>
          )}

          {/* 6) Enviar oferta (modal) */}
          {showOffer && (
            <Button
              type="primary"
              onClick={() => {
                offerForm.setFieldsValue({
                  roleOffered: "",
                  salaryOfferMx: null,
                  weeklyTipsOfferMx: null,
                  startDate: dayjs().add(7, "day"),
                  notes: "",
                });
                setOpenOffer(true);
              }}
            >
              Enviar oferta
            </Button>
          )}

          {/* 7) Oferta enviada: mostrar link si existe */}
          {showOfferLink && (
            <Button
              onClick={() => {
                // Cuando ya implementes public_token, aquí puedes copiar link:
                // `${location.origin}/offer/${lastOffer.publicToken}`
                if (!lastOffer?.publicToken) {
                  return message.info(
                    "Aún no hay publicToken (falta implementar en backend)."
                  );
                }
                const url = `${window.location.origin}/offer/${lastOffer.publicToken}`;
                navigator.clipboard?.writeText(url);
                message.success("Link copiado");
              }}
            >
              Copiar link de oferta
            </Button>
          )}

          {/* Rechazar (desde interview_scheduled en adelante) */}
          {canReject && (
            <Popconfirm
              title="¿Rechazar candidato?"
              okText="Sí, rechazar"
              cancelText="Cancelar"
              onConfirm={() =>
                run("rejected", () =>
                  setCandidateStage(candidateId, {
                    stageCode: "rejected",
                    decision: "rejected",
                    reasonCode: "other",
                    notes: "Rechazado manualmente",
                  })
                )
              }
            >
              <Button danger loading={loading === "rejected"}>
                Rechazar
              </Button>
            </Popconfirm>
          )}
        </Space>
      )}

      {/* ───────── Modal: Agendar entrevista ───────── */}
      <Modal
        title="Agendar entrevista"
        open={openInterview}
        onCancel={() => setOpenInterview(false)}
        okText="Crear entrevista"
        confirmLoading={loading === "createInterview"}
        onOk={async () => {
          const v = await interviewForm.validateFields();
          await run("createInterview", async () => {
            // ✅ OJO: createInterview en backend YA crea interview y cambia a interview_scheduled.
            await createInterview(candidateId, {
              type: v.type,
              scheduledAt: v.scheduledAt.toISOString(),
              interviewerName: v.interviewerName || "RRHH",
              location: v.location || null,
              meetingLink: v.meetingLink || null,
              notes: v.notes || null,
            });
            setOpenInterview(false);
          });
        }}
      >
        <Form layout="vertical" form={interviewForm}>
          <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "onsite", label: "Presencial" },
                { value: "phone", label: "Teléfono" },
                { value: "video", label: "Video" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="scheduledAt"
            label="Fecha y hora"
            rules={[{ required: true }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="interviewerName" label="Entrevistador">
            <Input placeholder="RRHH" />
          </Form.Item>

          <Form.Item name="location" label="Lugar (opcional)">
            <Input placeholder="Oficina / Sucursal" />
          </Form.Item>

          <Form.Item name="meetingLink" label="Link (si es video)">
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ───────── Modal: Asignar psicométrico ───────── */}
      <Modal
        title="Asignar psicométrico"
        open={openPsych}
        onCancel={() => setOpenPsych(false)}
        okText="Asignar"
        confirmLoading={loading === "createPsych"}
        onOk={async () => {
          const v = await psychForm.validateFields();
          await run("createPsych", async () => {
            // ✅ createPsychTest en backend YA crea test y cambia stage a psychometric_assigned
            await createPsychTest(candidateId, {
              testName: v.testName,
              assignedAt: new Date().toISOString(),
              notes: v.notes || null,
            });
            setOpenPsych(false);
          });
        }}
      >
        <Form layout="vertical" form={psychForm}>
          <Form.Item
            name="testName"
            label="Tipo de test"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "DISC", label: "DISC" },
                { value: "BIG5", label: "Big Five" },
                { value: "CUSTOM", label: "Personalizado" },
              ]}
            />
          </Form.Item>
          <Form.Item name="notes" label="Notas (opcional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ───────── Modal: Resultado psicométrico + aprobar/desaprobar manual ───────── */}
      <Modal
        title="Resultado psicométrico"
        open={openPsychResult}
        onCancel={() => setOpenPsychResult(false)}
        footer={[
          <Button key="close" onClick={() => setOpenPsychResult(false)}>
            Cerrar
          </Button>,
          <Button
            key="fail"
            danger
            disabled={!lastTest?.id || isTerminal}
            loading={loading === "psych_fail"}
            onClick={() => {
              if (!lastTest?.id) return;
              run("psych_fail", async () => {
                await setCandidateStage(candidateId, {
                  stageCode: "psychometric_failed",
                  psychTestId: lastTest.id,
                  testPassed: false,
                  notes: "Psicométrico no aprobado (manual)",
                });
                setOpenPsychResult(false);
              });
            }}
          >
            Marcar NO aprobado
          </Button>,
          <Button
            key="pass"
            type="primary"
            disabled={!lastTest?.id || isTerminal}
            loading={loading === "psych_pass"}
            onClick={() => {
              if (!lastTest?.id) return;
              run("psych_pass", async () => {
                await setCandidateStage(candidateId, {
                  stageCode: "psychometric_passed",
                  psychTestId: lastTest.id,
                  testPassed: true,
                  notes: "Psicométrico aprobado (manual)",
                });
                setOpenPsychResult(false);
              });
            }}
          >
            Marcar APROBADO
          </Button>,
        ]}
      >
        {!lastTest ? (
          <div>No hay psicométrico.</div>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            <div>
              <b>Test:</b> {lastTest.testName ?? "—"} · <b>ID:</b> #
              {lastTest.id}
            </div>
            <div>
              <b>Score:</b> {String(lastTest.score ?? "—")} · <b>Passed:</b>{" "}
              {String(lastTest.passed ?? "—")}
            </div>
            <div style={{ opacity: 0.7 }}>
              <b>AI report:</b>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(
                  lastTest.aiReportJson ?? lastTest.aiReport ?? null,
                  null,
                  2
                )}
              </pre>
            </div>
          </Space>
        )}
      </Modal>

      {/* ───────── Modal: Enviar oferta ───────── */}
      <Modal
        title="Enviar oferta"
        open={openOffer}
        onCancel={() => setOpenOffer(false)}
        okText="Crear oferta"
        confirmLoading={loading === "createOffer"}
        onOk={async () => {
          const v = await offerForm.validateFields();
          await run("createOffer", async () => {
            // ✅ createOffer en backend YA crea offer y cambia a offer_made
            await createOffer(candidateId, {
              roleOffered: v.roleOffered || null,
              salaryOfferMx: v.salaryOfferMx ?? null,
              weeklyTipsOfferMx: v.weeklyTipsOfferMx ?? null,
              startDate: v.startDate ? v.startDate.format("YYYY-MM-DD") : null,
              notes: v.notes || null,
            });
            setOpenOffer(false);
          });
        }}
      >
        <Form layout="vertical" form={offerForm}>
          <Form.Item
            name="roleOffered"
            label="Puesto ofrecido"
            rules={[{ required: true }]}
          >
            <Input placeholder="Mesero / Bartender / Cocina..." />
          </Form.Item>

          <Form.Item
            name="salaryOfferMx"
            label="Sueldo mensual (MXN)"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          <Form.Item name="weeklyTipsOfferMx" label="Propinas semanales (MXN)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="Fecha de inicio"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="notes" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
