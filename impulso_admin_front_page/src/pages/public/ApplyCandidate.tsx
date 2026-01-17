import { useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
  Select,
} from "antd";
import dayjs from "dayjs";
import { ROLE_OPTIONS, type RoleCode } from "./exams/questionBank";
import { publicApplyFull } from "@/lib/rrhhApi";

const { Title, Paragraph, Text } = Typography;

export default function ApplyCandidate() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    candidateId: number;
    roleCode: RoleCode;
    practicalToken: string;
    psychToken: string;
  }>(null);

  const [form] = Form.useForm();

  function origin() {
    return window.location.origin;
  }

  function formatDateValue(v: any) {
    if (!v) return null;
    const d = dayjs(v);
    return d.isValid() ? d.format("YYYY-MM-DD") : String(v);
  }

  async function onFinish(vals: any) {
    setLoading(true);
    try {
      const roleCode: RoleCode = vals.roleCode;

      const roleLabel =
        ROLE_OPTIONS.find((r) => r.value === roleCode)?.label ?? "Mesero";

      const payload = {
        roleCode, // backend lo puede usar para asignar tests correctos
        candidate: {
          firstName: vals.firstName,
          lastName: vals.lastName,
          email: vals.email || null,
          phone: vals.phone || null,
          whatsapp: vals.whatsapp || null,
          desiredRole: roleLabel,
          salaryExpectation: vals.salaryExpectation ?? null,
          desiredWeeklyTips: vals.desiredWeeklyTips ?? null,
          street: vals.street || null,
          extNumber: vals.extNumber || null,
          intNumber: vals.intNumber || null,
          neighborhood: vals.neighborhood || null,
          city: vals.city || null,
          state: vals.state || null,
          postalCode: vals.postalCode || null,
          country: vals.country || "MX",
          notes: vals.notes || null,
        },
        jobs: Array.isArray(vals.jobs)
          ? vals.jobs.map((job: any) => ({
              ...job,
              startDate: formatDateValue(job?.startDate),
              endDate: formatDateValue(job?.endDate),
            }))
          : [],
      };

      const r = await publicApplyFull(payload);

      setResult({
        candidateId: r.candidateId,
        roleCode: (r.roleCode || roleCode) as RoleCode,
        practicalToken: r.practicalToken,
        psychToken: r.psychToken,
      });

      message.success("Solicitud enviada");
    } catch (e: any) {
      message.error(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const practicalUrl = `${origin()}/exam/practical/${result.practicalToken}`;
    const psychUrl = `${origin()}/exam/psychometric/${result.psychToken}`;

    return (
      <Card style={{ maxWidth: 900, margin: "24px auto" }}>
        <Title level={3}>✅ Solicitud enviada</Title>
        <Paragraph>
          Tu folio de candidato es: <Text strong>#{result.candidateId}</Text>
        </Paragraph>

        <Paragraph>Ahora completa tus evaluaciones:</Paragraph>

        <Space direction="vertical" style={{ width: "100%" }}>
          <Card>
            <Title level={5}>Examen práctico</Title>
            <Text code style={{ display: "block", marginBottom: 8 }}>
              {practicalUrl}
            </Text>
            <Space>
              <Button
                type="primary"
                onClick={() => window.open(practicalUrl, "_blank")}
              >
                Abrir examen práctico
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(practicalUrl);
                  message.success("Link copiado");
                }}
              >
                Copiar link
              </Button>
            </Space>
          </Card>

          <Card>
            <Title level={5}>Examen psicométrico</Title>
            <Text code style={{ display: "block", marginBottom: 8 }}>
              {psychUrl}
            </Text>
            <Space>
              <Button
                type="primary"
                onClick={() => window.open(psychUrl, "_blank")}
              >
                Abrir examen psicométrico
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(psychUrl);
                  message.success("Link copiado");
                }}
              >
                Copiar link
              </Button>
            </Space>
          </Card>

          <Button
            onClick={() => {
              setResult(null);
              form.resetFields();
            }}
          >
            Enviar otra solicitud
          </Button>
        </Space>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 980, margin: "24px auto" }}>
      <Title level={3}>Solicitud de empleo</Title>
      <Paragraph>Llena tus datos y agrega referencias laborales.</Paragraph>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          country: "MX",
          roleCode: "waiter",
          jobs: [{ isCurrent: false, refConsent: false }],
        }}
      >
        <Title level={4}>Datos del candidato</Title>

        <Space wrap style={{ width: "100%" }}>
          <Form.Item
            name="firstName"
            label="Nombre"
            rules={[{ required: true }]}
          >
            <Input style={{ width: 220 }} />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Apellidos"
            rules={[{ required: true }]}
          >
            <Input style={{ width: 220 }} />
          </Form.Item>

          <Form.Item
            name="roleCode"
            label="Puesto"
            rules={[{ required: true }]}
          >
            <Select style={{ width: 220 }} options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="whatsapp" label="WhatsApp">
            <Input style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="salaryExpectation" label="Sueldo deseado (MXN)">
            <InputNumber min={0} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="desiredWeeklyTips" label="Propinas semanales (MXN)">
            <InputNumber min={0} style={{ width: 240 }} />
          </Form.Item>
        </Space>

        <Title level={4} style={{ marginTop: 12 }}>
          Referencias laborales
        </Title>

        <Form.List name="jobs">
          {(fields, { add, remove }) => (
            <>
              <Space style={{ marginBottom: 12 }}>
                <Button
                  onClick={() => add({ isCurrent: false, refConsent: false })}
                >
                  + Agregar trabajo
                </Button>
              </Space>

              {fields.map((f) => (
                <Card
                  key={f.key}
                  style={{ marginBottom: 12 }}
                  title={`Trabajo #${f.name + 1}`}
                  extra={
                    fields.length > 1 ? (
                      <Button danger onClick={() => remove(f.name)}>
                        Eliminar
                      </Button>
                    ) : null
                  }
                >
                  <Space wrap style={{ width: "100%" }}>
                    <Form.Item
                      name={[f.name, "companyName"]}
                      label="Empresa"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 260 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "roleTitle"]}
                      label="Puesto"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 220 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "startDate"]}
                      label="Inicio"
                    >
                      <DatePicker style={{ width: 190 }} format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "endDate"]}
                      label="Fin"
                    >
                      <DatePicker style={{ width: 190 }} format="YYYY-MM-DD" />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "isCurrent"]}
                      valuePropName="checked"
                      label="Actual"
                    >
                      <Checkbox />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "baseSalary"]}
                      label="Sueldo base (MXN)"
                    >
                      <InputNumber min={0} style={{ width: 220 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "weeklyTips"]}
                      label="Propinas semanales (MXN)"
                    >
                      <InputNumber min={0} style={{ width: 240 }} />
                    </Form.Item>
                  </Space>

                  <Title level={5} style={{ marginTop: 8 }}>
                    Referencia
                  </Title>

                  <Space wrap style={{ width: "100%" }}>
                    <Form.Item
                      name={[f.name, "refContactName"]}
                      label="Nombre referencia"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 260 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "refContactPhone"]}
                      label="Teléfono referencia"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 220 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "refContactEmail"]}
                      label="Email referencia"
                    >
                      <Input style={{ width: 260 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "refRelationship"]}
                      label="Relación (jefe/RH/etc.)"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 260 }} />
                    </Form.Item>

                    <Form.Item
                      name={[f.name, "refConsent"]}
                      valuePropName="checked"
                    >
                      <Checkbox>Acepto que contacten esta referencia</Checkbox>
                    </Form.Item>
                  </Space>

                  <Form.Item
                    name={[f.name, "responsibilities"]}
                    label="Responsabilidades"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>

                  <Form.Item name={[f.name, "achievements"]} label="Logros">
                    <Input.TextArea rows={2} />
                  </Form.Item>

                  <Form.Item
                    name={[f.name, "separationReason"]}
                    label="Motivo de salida"
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Card>
              ))}
            </>
          )}
        </Form.List>

        <Button type="primary" htmlType="submit" loading={loading}>
          Enviar solicitud
        </Button>
      </Form>
    </Card>
  );
}
