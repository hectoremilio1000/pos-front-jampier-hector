import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { App, Button, Card, Space, Typography } from "antd";
import { publicOfferShow, publicOfferRespond } from "@/lib/rrhhApi";

const { Title, Paragraph } = Typography;

export default function PublicOffer() {
  const { token = "" } = useParams();
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    publicOfferShow(token)
      .then(setData)
      .catch((e) => message.error(e.message));
  }, [token]);

  async function act(decision: "accept" | "reject") {
    setLoading(decision);
    try {
      await publicOfferRespond(token, { decision });
      message.success("Respuesta registrada");
      const fresh = await publicOfferShow(token);
      setData(fresh);
    } catch (e: any) {
      message.error(e.message || "Error");
    } finally {
      setLoading(null);
    }
  }

  if (!data) return null;

  return (
    <Card style={{ maxWidth: 720, margin: "24px auto" }}>
      <Title level={3}>Oferta laboral</Title>
      <Paragraph>
        Hola{" "}
        <b>
          {data.candidate.firstName} {data.candidate.lastName}
        </b>
        , esta es tu oferta:
      </Paragraph>

      <Paragraph>
        Puesto: <b>{data.offer.roleOffered ?? "—"}</b>
        <br />
        Sueldo: <b>{data.offer.salaryOfferMx ?? "—"}</b>
        <br />
        Propinas: <b>{data.offer.weeklyTipsOfferMx ?? "—"}</b>
        <br />
        Inicio: <b>{data.offer.startDate ?? "—"}</b>
        <br />
        Estado: <b>{data.offer.status}</b>
      </Paragraph>

      {data.offer.status === "made" ? (
        <Space>
          <Button
            type="primary"
            loading={loading === "accept"}
            onClick={() => act("accept")}
          >
            Aceptar
          </Button>
          <Button
            danger
            loading={loading === "reject"}
            onClick={() => act("reject")}
          >
            Rechazar
          </Button>
        </Space>
      ) : (
        <Paragraph>✅ Tu respuesta ya fue registrada.</Paragraph>
      )}
    </Card>
  );
}
