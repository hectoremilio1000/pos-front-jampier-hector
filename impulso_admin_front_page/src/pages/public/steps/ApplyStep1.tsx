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
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { ROLE_OPTIONS, type RoleCode } from "../exams/questionBank";
import { publicApplyFull } from "@/lib/rrhhApi";

const { Title } = Typography;

export default function ApplyStep1({ onDone }: { onDone: (r: any) => void }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  function formatDateValue(v: any) {
    if (!v) return null;
    const d = dayjs(v);
    return d.isValid() ? d.format("YYYY-MM-DD") : String(v);
  }

  async function onFinish(vals: any) {
    setLoading(true);
    try {
      const payload = {
        roleCode: vals.roleCode as RoleCode,
        candidate: {
          firstName: vals.firstName,
          lastName: vals.lastName,
          email: vals.email || null,
          phone: vals.phone || null,
          whatsapp: vals.whatsapp || null,
          desiredRole:
            ROLE_OPTIONS.find((x) => x.value === vals.roleCode)?.label ??
            "Mesero",
          salaryExpectation: vals.salaryExpectation ?? null,
          desiredWeeklyTips: vals.desiredWeeklyTips ?? null,
          country: "MX",
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
      message.success(`Folio creado: #${r.candidateId}`);
      onDone(r);
    } catch (e: any) {
      message.error(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <Title level={4}>Paso 1: Datos + Referencias</Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          roleCode: "waiter",
          jobs: [{ isCurrent: false, refConsent: false }],
        }}
      >
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
          <Form.Item name="phone" label="Teléfono">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="whatsapp" label="WhatsApp">
            <Input style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="salaryExpectation" label="Sueldo deseado (MXN)">
            <InputNumber min={0} style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="desiredWeeklyTips" label="Propinas semanales (MXN)">
            <InputNumber min={0} style={{ width: 240 }} />
          </Form.Item>
        </Space>

        <Title level={5} style={{ marginTop: 8 }}>
          Referencias
        </Title>

        <Form.List name="jobs">
          {(fields, { add, remove }) => (
            <>
              <Button
                onClick={() => add({ isCurrent: false, refConsent: false })}
              >
                + Agregar trabajo
              </Button>

              {fields.map((f) => (
                <Card
                  key={f.key}
                  style={{ marginTop: 12 }}
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
                  </Space>

                  <Title level={5}>Referencia</Title>
                  <Space wrap style={{ width: "100%" }}>
                    <Form.Item
                      name={[f.name, "refContactName"]}
                      label="Nombre"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 260 }} />
                    </Form.Item>
                    <Form.Item
                      name={[f.name, "refContactPhone"]}
                      label="Teléfono"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 220 }} />
                    </Form.Item>
                    <Form.Item name={[f.name, "refContactEmail"]} label="Email">
                      <Input style={{ width: 260 }} />
                    </Form.Item>
                    <Form.Item
                      name={[f.name, "refRelationship"]}
                      label="Relación"
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
                </Card>
              ))}
            </>
          )}
        </Form.List>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{ marginTop: 12 }}
        >
          Continuar al psicométrico
        </Button>
      </Form>
    </Card>
  );
}
