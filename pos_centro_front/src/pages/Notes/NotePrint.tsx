import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Spin, Typography, message } from "antd";
import apiCenter from "@/components/apis/apiCenter";

type NoteRow = {
  id: number;
  subscriptionId: number;
  restaurantId: number;
  restaurantName?: string;
  amountBase: number;
  discount: number;
  adjustments: number;
  amountDue: number;
  currency: string;
  status: string;
  dueAt: string;
  paidAt?: string | null;
  notes?: string | null;
  createdAt?: string;
};

const statusLabel = (value?: string | null) => {
  const map: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagada",
    past_due: "Vencida",
    void: "Anulada",
  };
  return map[value || ""] ?? value ?? "-";
};

export default function NotePrint() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<NoteRow | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await apiCenter.get(`/invoices/${id}`);
        setNote(data);
      } catch (e) {
        console.error(e);
        message.error("No se pudo cargar la nota");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (!note) {
    return (
      <div style={{ padding: 24 }}>
        <Typography.Text>No se encontro la nota.</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      <style>{`
        @media print {
          .note-print-actions { display: none; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
      <div className="note-print-actions" style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid #eee",
          paddingBottom: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>
          <span style={{ color: "#1677ff" }}>GrowthSuite</span> POS Centro
        </div>
      </div>

      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Nota por cobrar
      </Typography.Title>
      <Typography.Text type="secondary">
        Nota #{note.id}
      </Typography.Text>

      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <div>
          <strong>Restaurante:</strong>{" "}
          {note.restaurantName || note.restaurantId}
        </div>
        <div>
          <strong>Suscripcion:</strong> #{note.subscriptionId}
        </div>
        <div>
          <strong>Estado:</strong> {statusLabel(note.status)}
        </div>
        <div>
          <strong>Vence:</strong>{" "}
          {note.dueAt ? new Date(note.dueAt).toLocaleString("es-MX") : "-"}
        </div>
        {note.paidAt && (
          <div>
            <strong>Pagada:</strong>{" "}
            {new Date(note.paidAt).toLocaleString("es-MX")}
          </div>
        )}
        {note.createdAt && (
          <div>
            <strong>Creada:</strong>{" "}
            {new Date(note.createdAt).toLocaleString("es-MX")}
          </div>
        )}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
              Concepto
            </th>
            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd" }}>
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: 8 }}>Base</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              ${Number(note.amountBase).toFixed(2)} {note.currency}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Descuento</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              -${Number(note.discount).toFixed(2)} {note.currency}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>Ajustes</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              ${Number(note.adjustments).toFixed(2)} {note.currency}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8, fontWeight: "bold" }}>Total</td>
            <td style={{ padding: 8, textAlign: "right", fontWeight: "bold" }}>
              ${Number(note.amountDue).toFixed(2)} {note.currency}
            </td>
          </tr>
        </tbody>
      </table>

      {note.notes && (
        <div style={{ marginTop: 16 }}>
          <strong>Notas:</strong>
          <div style={{ whiteSpace: "pre-wrap" }}>{note.notes}</div>
        </div>
      )}
    </div>
  );
}
