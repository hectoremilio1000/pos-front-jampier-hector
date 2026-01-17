import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
} from "antd";
import { QUESTION_BANK, type RoleCode } from "./questionBank";
import {
  publicPsychShow,
  publicPsychSubmit,
  publicPracticalShow,
  publicPracticalSubmit,
} from "@/lib/rrhhApi";

const { Title, Paragraph, Text } = Typography;

type ExamType = "psychometric" | "practical";

type Props = {
  type: ExamType;
  token: string;
  titlePrefix?: string; // opcional: para wizard "Paso 2"
  onSubmitted?: (result: any) => void; // opcional: avanzar al siguiente paso
};

function roleFromDesiredRole(s: string): RoleCode {
  const v = (s || "").toLowerCase();
  if (v.includes("capit")) return "captain";
  if (v.includes("cocin")) return "cook";
  if (v.includes("barman") || v.includes("bart")) return "barman";
  if (v.includes("chef")) return "chef_manager";
  return "waiter";
}

function roleFromTestName(s: string): RoleCode | null {
  const v = (s || "").toLowerCase();
  if (v.includes("_captain_")) return "captain";
  if (v.includes("_cook_")) return "cook";
  if (v.includes("_barman_")) return "barman";
  if (v.includes("_chef_")) return "chef_manager";
  if (v.includes("_waiter_")) return "waiter";
  return null;
}

export default function ExamRunner({
  type,
  token,
  titlePrefix,
  onSubmitted,
}: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [page, setPage] = useState(1);
  const answersDraftRef = useRef<Record<string, string>>({});
  const draftLoadedRef = useRef(false);

  const pageSize = 10;
  const isPsych = type === "psychometric";
  const isPractical = type === "practical";
  const draftKey = useMemo(
    () => `exam_draft_v1_${type}_${token}`,
    [type, token]
  );

  useEffect(() => {
    setResult(null);
    setPage(1);
    form.resetFields();
    answersDraftRef.current = {};

    (async () => {
      try {
        const data = isPsych
          ? await publicPsychShow(token)
          : await publicPracticalShow(token);
        setMeta(data);
      } catch (e: any) {
        message.error(e?.message || "Link inválido");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const ping = async () => {
      try {
        if (isPsych) {
          await publicPsychShow(token);
        } else {
          await publicPracticalShow(token);
        }
      } catch (e) {
        if (!cancelled) {
          // Evita ruido en UI; sólo registra en consola.
          console.warn("Heartbeat exam failed", e);
        }
      }
    };

    const id = window.setInterval(ping, 180_000); // ~3 min
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isPsych, isPractical, token]);

  const roleCode: RoleCode | null = useMemo(() => {
    if (!meta) return null;

    // 1) Preferir desiredRole
    const desiredRole = meta?.candidate?.desiredRole || "";
    if (desiredRole) return roleFromDesiredRole(desiredRole);

    // 2) Fallback por testName (PSYCH_WAITER_V1 / PRACTICAL_WAITER_V1)
    const testName = meta?.test?.testName || meta?.testName || "";
    return roleFromTestName(testName);
  }, [meta]);

  const questions: string[] = useMemo(() => {
    if (!roleCode) return [];
    if (isPsych) return QUESTION_BANK[roleCode].psychometric;
    if (isPractical) return QUESTION_BANK[roleCode].practical;
    return [];
  }, [roleCode, isPsych, isPractical]);

  const pageCount = Math.ceil(questions.length / pageSize);
  const slice = questions.slice((page - 1) * pageSize, page * pageSize);
  const currentFields = useMemo(
    () =>
      slice.map((_, idx) => `q${(page - 1) * pageSize + idx + 1}`),
    [page, pageSize, slice]
  );

  function persistDraft(next: Record<string, string>) {
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
    } catch (e) {
      console.warn("No se pudo guardar draft de examen", e);
    }
  }

  function saveCurrentDraft() {
    const currentVals = form.getFieldsValue();
    answersDraftRef.current = {
      ...answersDraftRef.current,
      ...currentVals,
    };
    persistDraft(answersDraftRef.current);
  }

  useEffect(() => {
    if (!questions.length) return;

    if (!draftLoadedRef.current) {
      draftLoadedRef.current = true;
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            answersDraftRef.current = parsed;
          }
        }
      } catch (e) {
        console.warn("No se pudo cargar draft de examen", e);
      }
    }

    const pageStart = (page - 1) * pageSize;
    const pageEnd = Math.min(pageStart + pageSize, questions.length);
    const init: Record<string, string> = {};
    for (let i = pageStart; i < pageEnd; i += 1) {
      const key = `q${i + 1}`;
      const val = answersDraftRef.current[key];
      init[key] = val ?? "";
    }
    form.setFieldsValue(init);
  }, [draftKey, form, page, pageSize, questions]);

  async function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > pageCount) return;
    saveCurrentDraft();
    setPage(nextPage);
  }

  async function handleNext() {
    try {
      await form.validateFields(currentFields);
      await goToPage(page + 1);
    } catch {
      // errores se muestran en los campos
    }
  }

  function handlePrev() {
    goToPage(page - 1);
  }

  async function onSubmit(vals: any) {
    try {
      setLoading(true);

      const answers: any = {};
      const allVals = { ...answersDraftRef.current, ...vals };
      questions.forEach((q, idx) => {
        const key = `q${idx + 1}`;
        answers[key] = { question: q, answer: allVals[key] ?? "" };
      });

      const r = isPsych
        ? await publicPsychSubmit(token, { answers })
        : await publicPracticalSubmit(token, { answers });

      setResult(r);
      message.success("Enviado");
      try {
        localStorage.removeItem(draftKey);
      } catch (e) {
        console.warn("No se pudo limpiar draft de examen", e);
      }
      onSubmitted?.(r);
    } catch (e: any) {
      message.error(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!meta) {
    return (
      <Card style={{ maxWidth: 980, margin: "12px auto" }}>Cargando...</Card>
    );
  }

  if (!roleCode) {
    return (
      <Card style={{ maxWidth: 980, margin: "12px auto" }}>
        No pude detectar el rol para cargar preguntas.
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
          {JSON.stringify(meta, null, 2)}
        </pre>
      </Card>
    );
  }

  const roleLabel = QUESTION_BANK[roleCode].label;

  return (
    <Card style={{ maxWidth: 980, margin: "12px auto" }}>
      <Title level={3}>
        {titlePrefix ? `${titlePrefix} — ` : ""}
        {isPractical ? "Examen práctico" : "Examen psicométrico"} — {roleLabel}
      </Title>

      <Paragraph>
        Candidato:{" "}
        <Text strong>
          {meta.candidate.firstName} {meta.candidate.lastName}
        </Text>
      </Paragraph>

      {result ? (
        <Card>
          <Title level={4}>Resultado</Title>
          <Paragraph>
            Score: <Text strong>{String(result.score ?? "—")}</Text> ·
            Favorable: <Text strong>{String(result.passed ?? "—")}</Text>
          </Paragraph>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(
              result.aiReport ?? result.aiReportJson ?? result,
              null,
              2
            )}
          </pre>
        </Card>
      ) : (
        <>
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            onValuesChange={(changed) => {
              answersDraftRef.current = {
                ...answersDraftRef.current,
                ...changed,
              };
              persistDraft(answersDraftRef.current);
            }}
          >
            {slice.map((q, idx) => {
              const globalIndex = (page - 1) * pageSize + idx + 1;
              const field = `q${globalIndex}`;
              return (
                <Form.Item
                  key={field}
                  name={field}
                  label={`${globalIndex}. ${q}`}
                  rules={[{ required: true, message: "Respuesta requerida" }]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
              );
            })}

            <Space
              style={{
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
              }}
            >
              <Button onClick={handlePrev} disabled={page <= 1}>
                Anterior
              </Button>
              <Paragraph style={{ margin: 0 }}>
                Página {page} de {pageCount}
              </Paragraph>
              {page < pageCount ? (
                <Button type="primary" onClick={handleNext}>
                  Siguiente
                </Button>
              ) : (
                <Button type="primary" htmlType="submit" loading={loading}>
                  Enviar examen completo
                </Button>
              )}
            </Space>
          </Form>

        </>
      )}
    </Card>
  );
}
