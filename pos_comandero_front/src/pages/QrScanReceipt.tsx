import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Spin } from "antd";
import apiOrderPublic from "@/components/apis/apiOrderPublic";

import {
  Document,
  Page,
  Text,
  View,
  PDFViewer,
  StyleSheet,
} from "@react-pdf/renderer";

type Restaurant = {
  id: number;
  name: string;
  address_line1?: string | null;
  phone?: string | null;
  email?: string | null;
};

type OrderItem = {
  id: number;
  qty: number;
  basePrice: number;
  total: number;
  notes?: string | null;
  product?: { name: string };
};

type Order = {
  id: number;
  restaurantId: number;
  status: string;
  openedAt?: string;
  tableName?: string | null;
  waiterId?: number | null;
  cashierId?: number | null;
  subtotal?: number;
  tax?: number;
  total?: number;
  items: OrderItem[];
};

const mm = (v: number) => (v * 72) / 25.4; // react-pdf usa "pt"

const styles = StyleSheet.create({
  page: {
    width: mm(80),
    padding: 10,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  center: { textAlign: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  hr: {
    marginVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  bold: { fontWeight: 700 },
  small: { fontSize: 8 },
});

function money(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export default function QrScanReceipt() {
  const { restaurantId, orderId } = useParams();

  const rid = Number(restaurantId);
  const oid = Number(orderId);

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const items = order?.items ?? [];
    const total = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const subtotal = items.reduce((acc, it) => {
      const qty = Number(it.qty) || 0;
      const base = Number(it.basePrice) || 0;
      return acc + base * qty;
    }, 0);
    const tax = total - subtotal;
    return { subtotal, tax, total };
  }, [order]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!Number.isFinite(rid) || !Number.isFinite(oid)) {
          setError("QR inválido.");
          return;
        }

        // 1) Restaurant (POS Auth PUBLIC)
        const rRes = await apiOrderPublic.get(`/public/restaurants/${rid}`);
        setRestaurant(rRes.data);

        // 2) Order (POS Order PUBLIC) - debe traer items preloaded
        const oRes = await apiOrderPublic.get(`/public/orders/${oid}`, {
          params: { restaurantId: rid },
        });

        const o: Order = oRes.data;

        // Extra: coherencia restaurantId
        if (Number(o.restaurantId) !== rid) {
          setError("QR inválido para este restaurante.");
          return;
        }

        setOrder(o);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            "No se pudo cargar el recibo."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [rid, oid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin />
      </div>
    );
  }

  if (error || !restaurant || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert
          type="error"
          message="No se puede mostrar el recibo"
          description={error || "Datos incompletos"}
          showIcon
        />
      </div>
    );
  }

  const ReceiptDoc = (
    <Document>
      {/* altura dinámica: si se te corta, después lo refinamos con cálculo */}
      <Page size={[mm(80), mm(220)]} style={styles.page}>
        <Text style={[styles.center, styles.bold]}>{restaurant.name}</Text>
        {!!restaurant.address_line1 && <Text>{restaurant.address_line1}</Text>}

        {!!restaurant.phone && (
          <Text style={[styles.center, styles.small]}>
            Tel: {restaurant.phone}
          </Text>
        )}

        <View style={styles.hr} />

        <View style={styles.row}>
          <Text>Orden:</Text>
          <Text style={styles.bold}>#{order.id}</Text>
        </View>

        <View style={styles.row}>
          <Text>Mesa:</Text>
          <Text>{order.tableName ?? "—"}</Text>
        </View>

        {!!order.openedAt && (
          <View style={styles.row}>
            <Text>Fecha:</Text>
            <Text>{new Date(order.openedAt).toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.hr} />

        {order.items.map((it) => (
          <View key={it.id} style={{ marginBottom: 4 }}>
            <Text style={styles.bold}>{it.product?.name ?? "Producto"}</Text>
            <View style={styles.row}>
              <Text>
                {it.qty} x {money(Number(it.basePrice) || 0)}
              </Text>
              <Text>{money(Number(it.total) || 0)}</Text>
            </View>
            {!!it.notes && <Text style={styles.small}>💬 {it.notes}</Text>}
          </View>
        ))}

        <View style={styles.hr} />

        <View style={styles.row}>
          <Text>Subtotal</Text>
          <Text>{money(totals.subtotal)}</Text>
        </View>
        <View style={styles.row}>
          <Text>IVA</Text>
          <Text>{money(totals.tax)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>{money(totals.total)}</Text>
        </View>

        <View style={styles.hr} />
        <Text style={styles.center}>Gracias por su visita</Text>
      </Page>
    </Document>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* visor PDF */}
      <div style={{ height: "100vh" }}>
        <PDFViewer style={{ width: "100%", height: "100%" }}>
          {ReceiptDoc}
        </PDFViewer>
      </div>
    </div>
  );
}
