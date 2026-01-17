import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  App,
} from "antd";
import { createTraspaso, getTraspaso, updateTraspaso } from "@/lib/api";
import PhotosManager from "./PhotosManager";
import { moneyFormatter, moneyParser } from "@/lib/number";

type FormVals = {
  title: string;
  colonia?: string;
  alcaldia?: string;
  ciudad?: string;
  renta_mx?: string | number;
  traspaso_mx?: string | number;
  metros_cuadrados?: number;
  aforo?: number;
  descripcion?: string;
  servicios?: string[];
  contacto_nombre?: string;
  contacto_tel?: string;
  contacto_whatsapp?: string;
  status?: "draft" | "published" | "archived";
};

const ALCALDIAS = [
  "Cuauhtémoc",
  "Miguel Hidalgo",
  "Benito Juárez",
  "Álvaro Obregón",
  "Coyoacán",
  "GAM",
  "Iztapalapa",
  "Tlalpan",
  "Xochimilco",
];

export default function TraspasoEditor() {
  const { message } = App.useApp();
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "0";
  const [form] = Form.useForm<FormVals>();
  const [traspasoId, setTraspasoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        setLoading(true);
        try {
          const { data } = await getTraspaso(id);
          form.setFieldsValue({
            title: data.title,
            colonia: data.colonia,
            alcaldia: data.alcaldia,
            ciudad: data.ciudad,
            renta_mx: data.rentaMx ? Number(data.rentaMx) : 0,
            traspaso_mx: data.traspasoMx ? Number(data.traspasoMx) : 0,
            metros_cuadrados: data.metrosCuadrados,
            aforo: data.aforo,
            descripcion: data.descripcion,
            servicios: Array.isArray(data.servicios) ? data.servicios : [],
            contacto_nombre: data.contactoNombre,
            contacto_tel: data.contactoTel,
            contacto_whatsapp: data.contactoWhatsapp,
            status: (data.status as any) ?? "published",
          });
          setTraspasoId(data.id);
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
        ciudad: vals.ciudad || "Ciudad de México",
        status: vals.status || "published",
        renta_mx:
          vals.renta_mx === "" || vals.renta_mx == null
            ? 0
            : moneyParser(String(vals.renta_mx)),
        traspaso_mx:
          vals.traspaso_mx === "" || vals.traspaso_mx == null
            ? 0
            : moneyParser(String(vals.traspaso_mx)),
        metros_cuadrados: vals.metros_cuadrados ?? 0,
        aforo: vals.aforo ?? 0,
      };

      if (isNew) {
        const res = await createTraspaso(payload);
        message.success("Traspaso creado");
        setTraspasoId(res.id);
        nav(`/admin/traspasos/${res.id}`, { replace: true });
      } else if (traspasoId) {
        // si quisieras regenerar slug cuando cambia el título: pasa { regenSlug: true }
        await updateTraspaso(traspasoId, payload);
        message.success("Cambios guardados");
        nav("/admin/traspasos", { replace: true });
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
          isNew ? "Nuevo traspaso" : `Editar traspaso #${traspasoId ?? id}`
        }
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Título"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="colonia" label="Colonia">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="alcaldia" label="Alcaldía">
                <Select
                  options={ALCALDIAS.map((a) => ({ value: a, label: a }))}
                  showSearch
                  allowClear
                />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="renta_mx"
                label="Renta (MXN)"
                rules={[
                  { type: "number", min: 0, message: "Debe ser un número ≥ 0" },
                ]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={100}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="traspaso_mx"
                label="Traspaso (MXN)"
                rules={[
                  {
                    type: "number" as const,
                    min: 0,
                    message: "Debe ser un número ≥ 0",
                  },
                ]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={1000}
                  precision={0}
                  formatter={moneyFormatter}
                  parser={moneyParser}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="metros_cuadrados"
                label="Metros cuadrados"
                rules={[
                  {
                    type: "number" as const,
                    min: 0,
                    message: "Solo números ≥ 0",
                  },
                ]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={1}
                  precision={0}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="aforo"
                label="Aforo"
                rules={[
                  {
                    type: "number" as const,
                    min: 0,
                    message: "Solo números ≥ 0",
                  },
                ]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  step={1}
                  precision={0}
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item name="descripcion" label="Descripción">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="servicios" label="Servicios (tags)">
                <Select mode="tags" placeholder="gas, licencia, terraza..." />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item name="contacto_nombre" label="Contacto nombre">
                <Input />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="contacto_tel" label="Teléfono">
                <Input />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="contacto_whatsapp" label="WhatsApp">
                <Input />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item name="status" label="Estatus" initialValue="published">
                <Select
                  options={[
                    { value: "draft", label: "Borrador" },
                    { value: "published", label: "Publicado" },
                    { value: "archived", label: "Archivado" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar
            </Button>
            <Button onClick={() => nav("/admin/traspasos")}>Volver</Button>
          </Space>
        </Form>
      </Card>

      {/* Gestor de fotos cuando ya existe el traspaso */}
      {traspasoId && <PhotosManager traspasoId={traspasoId} />}
    </Space>
  );
}
