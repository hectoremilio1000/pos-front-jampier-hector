import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Tag,
} from "antd";
import { createCandidate, getCandidate, updateCandidate } from "@/lib/rrhhApi";
import CvManager from "./components/CvManager";
import AddressMediaManager from "./components/AddressMediaManager";
import WorkflowActionsBar from "./components/WorkflowActionsBar";
import ReferencesModal from "./components/ReferencesModal";
import AssessmentsPanel from "./components/AssessmentsPanel";

import { Tabs } from "antd";

type FormVals = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  desiredRole?: string;
  salaryExpectation?: number;
  desiredWeeklyTips?: number;
  street?: string;
  extNumber?: string;
  intNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  notes?: string;
};

export default function CandidateEditor() {
  const { message } = App.useApp();
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "0";
  const [form] = Form.useForm<FormVals>();
  const [candidateId, setCandidateId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<{
    id: number;
    code: string;
    name: string;
  } | null>(null); // 👈
  const [openRefs, setOpenRefs] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        setLoading(true);
        try {
          const data = await getCandidate(id);
          form.setFieldsValue({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            whatsapp: data.whatsapp,
            desiredRole: data.desiredRole,
            salaryExpectation: data.salaryExpectation
              ? Number(data.salaryExpectation)
              : undefined,
            desiredWeeklyTips: data.desiredWeeklyTips
              ? Number(data.desiredWeeklyTips)
              : undefined,
            street: data.street,
            extNumber: data.extNumber,
            intNumber: data.intNumber,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            country: data.country ?? "MX",
            source: data.source ?? "rrhh",
            notes: data.notes,
          });
          setCandidateId(data.id);
          setCurrentStage(
            data.currentStage
              ? {
                  id: data.currentStage.id,
                  code: data.currentStage.code,
                  name: data.currentStage.name,
                }
              : data.currentStageId
              ? {
                  id: data.currentStageId,
                  code: String(data.currentStageId),
                  name: String(data.currentStageId),
                }
              : null
          );
        } catch (e: any) {
          message.error(e.message || "Error al cargar candidato");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isNew]);

  async function onSubmit(vals: FormVals) {
    try {
      setLoading(true);
      const payload = {
        ...vals,
        country: vals.country || "MX",
        source: vals.source || "rrhh",
        stageCode: "received",
      };
      if (isNew) {
        const res = await createCandidate(payload);
        message.success("Candidato creado");
        setCandidateId(res.id);
        nav(`/admin/candidates/${res.id}`, { replace: true });
      } else if (candidateId) {
        await updateCandidate(candidateId, payload);
        message.success("Cambios guardados");
      }
    } catch (e: any) {
      message.error(e?.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card
        title={
          isNew ? (
            "Nuevo candidato"
          ) : (
            <Space>
              {`Editar candidato #${candidateId ?? id}`}
              {currentStage && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {currentStage.name}
                </Tag>
              )}
            </Space>
          )
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          initialValues={{ country: "MX", source: "rrhh" }} // 👈 evita el warning de AntD
        >
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="firstName"
                label="Nombre"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="lastName"
                label="Apellidos"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="phone" label="Teléfono">
                <Input />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="whatsapp" label="WhatsApp">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="desiredRole" label="Rol deseado">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="salaryExpectation" label="Sueldo deseado (MXN)">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="desiredWeeklyTips"
                label="Propinas semanales (MXN)"
              >
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="street" label="Calle">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="extNumber" label="No. exterior">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="intNumber" label="No. interior">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="neighborhood" label="Colonia">
                <Input />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="city" label="Ciudad">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="state" label="Estado">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="postalCode" label="CP">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="country" label="País">
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="source" label="Fuente">
                <Select
                  options={[
                    { value: "rrhh", label: "Recursos humanos" },
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "instagram", label: "Instagram" },
                    { value: "referido", label: "Referido" },
                    { value: "bolsa", label: "Bolsa" },
                    { value: "otro", label: "Otro" },
                  ]}
                  showSearch
                  allowClear
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="notes" label="Notas">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar
            </Button>

            {!isNew && candidateId && (
              <Button onClick={() => setOpenRefs(true)}>Ver referencias</Button>
            )}

            <Button onClick={() => nav("/admin/candidates")}>Volver</Button>
          </Space>
        </Form>
      </Card>

      {candidateId && (
        <>
          <Card>
            <Tabs
              defaultActiveKey="stages"
              items={[
                {
                  key: "stages",
                  label: "Etapas",
                  children: (
                    <WorkflowActionsBar
                      candidateId={candidateId}
                      currentStageCode={currentStage?.code}
                      onChanged={async () => {
                        try {
                          const data = await getCandidate(candidateId);
                          setCurrentStage(
                            data.currentStage
                              ? {
                                  id: data.currentStage.id,
                                  code: data.currentStage.code,
                                  name: data.currentStage.name,
                                }
                              : data.currentStageId
                              ? {
                                  id: data.currentStageId,
                                  code: String(data.currentStageId),
                                  name: String(data.currentStageId),
                                }
                              : null
                          );
                        } catch {}
                      }}
                    />
                  ),
                },
                {
                  key: "eval",
                  label: "Evaluaciones",
                  children: <AssessmentsPanel candidateId={candidateId} />,
                },
                {
                  key: "cvs",
                  label: "CVs",
                  children: <CvManager candidateId={candidateId} />,
                },
                {
                  key: "addr",
                  label: "Evidencia domicilio",
                  children: <AddressMediaManager candidateId={candidateId} />,
                },
              ]}
            />
          </Card>
          <ReferencesModal
            open={openRefs}
            onClose={() => setOpenRefs(false)}
            candidateId={candidateId}
          />
        </>
      )}
    </Space>
  );
}
