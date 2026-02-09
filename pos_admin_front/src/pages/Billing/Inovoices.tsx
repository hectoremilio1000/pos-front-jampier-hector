import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Select,
  message,
  Switch,
} from "antd";

import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "@/components/Auth/AuthContext";
import {
  listInvoices,
  createInvoice,
  emailInvoice,
  downloadInvoice,
} from "@/components/apis/apiInvoices";
import { listCustomers } from "@/components/apis/apiCustomers";
import { getRestaurantMode } from "@/components/apis/apiFacturapiMode";

const { RangePicker } = DatePicker;

type Invoice = {
  id: string;
  uuid?: string;
  status?: string;
  series?: string;
  folio_number?: number;
  created_at?: string;
  customer?: { legal_name?: string; tax_id?: string };
  total?: number;
  url_pdf?: string;
};

export default function InvoicesPage() {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?.id;

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // filtros
  const [series, setSeries] = useState<string>();
  const [folio, setFolio] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [emailModal, setEmailModal] = useState<{ open: boolean; id?: string }>({
    open: false,
  });
  const [emailToSend, setEmailToSend] = useState<string>("");

  // modal nueva factura
  const [openModal, setOpenModal] = useState(false);
  // 🧠 Inicia "desconocido" y bloquea fetch hasta saber el modo real
  const [mode, setMode] = useState<"test" | "live" | null>(null);
  const [modeLoading, setModeLoading] = useState(true);

  const loadRestaurantMode = async () => {
    if (!restaurantId) {
      setModeLoading(false);
      return;
    }
    setModeLoading(true); // ← primero marcamos como cargando
    try {
      const res = await getRestaurantMode(restaurantId);
      const apiMode = (res.data?.mode === "live" ? "live" : "test") as
        | "test"
        | "live";
      setMode(apiMode);
    } catch (error) {
      console.log(error);
      // Por seguridad, si falla, quedamos en test
      setMode("test");
    } finally {
      setModeLoading(false); // ← terminamos de cargar
    }
  };
  console.log(mode);

  const fetchList = async () => {
    if (!restaurantId || !mode) return; // ← no llames a la API sin modo
    setLoading(true);
    try {
      const params: any = { page, limit, mode }; // ← usa el modo del restaurante
      if (series) params.series = series;
      if (folio) params.folio = folio;
      if (status) params.status = status;
      if (dates) {
        params.date_from = dates[0].format("YYYY-MM-DD");
        params.date_to = dates[1].format("YYYY-MM-DD");
      }
      const res = await listInvoices(restaurantId, params);
      const rows = res.data?.data ?? res.data ?? [];
      setData(rows);
      setTotal(res.data?.meta?.total ?? rows.length);
    } catch (e) {
      message.warning("Modulo de facturas no configurado");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurantMode();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    if (modeLoading) return; // ⛔️ aún no sabemos el modo
    if (!mode) return; // ⛔️ modo null: no dispares nada
    fetchList(); // ✅ ya hay modo real: test o live
    // Incluye también filtros si quieres que refiltre al cambiar
  }, [
    restaurantId,
    page,
    limit,
    mode,
    modeLoading /*, series, folio, status, dates */,
  ]);

  const doDownload = useCallback(
    async (row: Invoice, fmt: "pdf" | "xml" | "zip") => {
      try {
        if (!restaurantId) return;
        if (!mode) {
          message.warning("Aún no se ha cargado el modo del restaurante.");
          return;
        }
        const res = await downloadInvoice(restaurantId, row.id, fmt, { mode });
        const blob = new Blob([res.data], {
          type:
            fmt === "pdf"
              ? "application/pdf"
              : fmt === "xml"
                ? "application/xml"
                : "application/zip",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = fmt === "pdf" ? "pdf" : fmt === "xml" ? "xml" : "zip";
        a.download = `invoice-${row.id}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (e: any) {
        console.error(e);
        const msg =
          e?.response?.data?.error || "No se pudo descargar el archivo";
        message.error(msg);
      }
    },
    [mode, restaurantId],
  );

  const columns: ColumnsType<Invoice> = useMemo(
    () => [
      { title: "Serie", dataIndex: "series", key: "series", width: 100 },
      {
        title: "Folio",
        dataIndex: "folio_number",
        key: "folio_number",
        width: 100,
      },
      {
        title: "Fecha",
        dataIndex: "created_at",
        key: "created_at",
        width: 180,
        render: (v?: string) => (v ? new Date(v).toLocaleString("es-MX") : "—"),
      },
      {
        title: "Cliente",
        key: "customer",
        render: (_, row) => row.customer?.legal_name || "—",
      },
      {
        title: "RFC",
        key: "tax_id",
        width: 140,
        render: (_, row) => row.customer?.tax_id || "—",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (v?: string) => {
          const color =
            v === "paid"
              ? "green"
              : v === "unpaid"
                ? "orange"
                : v === "canceled"
                  ? "red"
                  : "default";
          return <Tag color={color}>{v || "—"}</Tag>;
        },
      },
      {
        title: "Total",
        dataIndex: "total",
        key: "total",
        width: 120,
        render: (v?: number) =>
          typeof v === "number" ? `$${v.toFixed(2)}` : "—",
      },
      {
        title: "Acciones",
        key: "actions",
        width: 260,
        render: (_, row) => (
          <Space>
            <Button size="small" onClick={() => doDownload(row, "pdf")}>
              PDF
            </Button>
            <Button size="small" onClick={() => doDownload(row, "xml")}>
              XML
            </Button>
            <Button size="small" onClick={() => doDownload(row, "zip")}>
              ZIP
            </Button>
            <Button
              size="small"
              onClick={() => setEmailModal({ open: true, id: row.id })}
            >
              Enviar
            </Button>
          </Space>
        ),
      },
    ],
    [doDownload],
  );

  return (
    <Card
      title="Facturas"
      extra={
        <Space>
          <Tag
            color={mode === "live" ? "green" : "default"}
            style={{ marginRight: 8 }}
          >
            {mode ? mode.toUpperCase() : "CARGANDO…"}
          </Tag>

          <Input
            allowClear
            placeholder="Serie"
            value={series}
            onChange={(e) => setSeries(e.target.value || undefined)}
            style={{ width: 100 }}
          />
          <Input
            allowClear
            placeholder="Folio"
            value={folio}
            onChange={(e) => setFolio(e.target.value || undefined)}
            style={{ width: 120 }}
          />
          <Select
            allowClear
            placeholder="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "paid", label: "Pagada" },
              { value: "unpaid", label: "No pagada" },
              { value: "canceled", label: "Cancelada" },
            ]}
            style={{ width: 140 }}
          />
          <RangePicker
            value={dates as any}
            onChange={(v) => setDates(v as any)}
          />
          <Button
            icon={<SearchOutlined />}
            onClick={() => {
              setPage(1);
              fetchList();
            }}
          >
            Buscar
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpenModal(true)}
          >
            Nueva factura
          </Button>
        </Space>
      }
    >
      <Modal
        open={emailModal.open}
        title="Enviar factura por email"
        onCancel={() => setEmailModal({ open: false })}
        onOk={async () => {
          try {
            await emailInvoice(restaurantId!, emailModal.id!, {
              email: emailToSend || undefined,
              mode: mode === null ? "test" : mode,
            });
            message.success("Enviada");
            setEmailModal({ open: false });
            setEmailToSend("");
          } catch (e: any) {
            message.error(e?.response?.data?.error || "No se pudo enviar");
          }
        }}
      >
        <Input
          placeholder="Correo del destinatario (opcional si ya tiene email el cliente)"
          value={emailToSend}
          onChange={(e) => setEmailToSend(e.target.value)}
        />
        <p className="text-xs text-gray-500" style={{ marginTop: 8 }}>
          Si dejas vacío, se enviará al email registrado del cliente en
          Facturapi.
        </p>
      </Modal>

      <Table<Invoice>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setLimit(ps);
          },
        }}
      />

      {openModal && (
        <InvoiceFormModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          onOk={fetchList}
          mode={mode === null ? "test" : mode}
        />
      )}
    </Card>
  );
}

/* ---------------- Modal de creación ---------------- */

function InvoiceFormModal({
  open,
  onClose,
  onOk,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onOk: () => void;
  mode: "test" | "live";
}) {
  const { user } = useAuth();
  const restaurantId = user?.restaurant?.id;
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [useSavedCustomer, setUseSavedCustomer] = useState(true);

  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();

  useEffect(() => {
    if (!open || !restaurantId) return;
    (async () => {
      try {
        setLoadingCustomers(true);
        // 👇 NO mandes search vacío
        const res = await listCustomers(restaurantId, { limit: 100, mode });
        const rows = res.data?.data ?? res.data ?? [];

        // Keys/values estables y únicos (evita warning "same key 0")
        const opts = rows.map((c: any, idx: number) => {
          const value = String(c.id ?? `${c.tax_id || "NA"}-${idx}`);
          const label = `${c.legal_name ?? "SIN NOMBRE"} (${c.tax_id ?? "SIN RFC"})`;
          return {
            label,
            value, // AntD usa value como key
            key: idx, // fuerza key único
            _norm: `${(c.legal_name || "").toLowerCase()} ${(c.tax_id || "").toLowerCase()}`,
          };
        });

        setCustomerOptions(opts);

        // (Opcional) Preseleccionar el primero si no hay seleccionado
        if (!selectedCustomerId && opts.length) {
          setSelectedCustomerId(opts[0].value);
        }
      } catch (error) {
        console.log(error);
        message.error("No se pudieron cargar clientes");
        setCustomerOptions([]);
      } finally {
        setLoadingCustomers(false);
      }
    })();
  }, [open, restaurantId, mode]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const chosenId = useSavedCustomer
        ? values.selectedCustomerId || selectedCustomerId
        : undefined;

      const baseCustomer = useSavedCustomer
        ? { customer: chosenId }
        : {
            customer: {
              legal_name: values.legal_name,
              tax_id: values.tax_id,
              tax_system: values.tax_system,
              address: { zip: values.zip },
              email: values.email || undefined,
            },
          };

      const payload = {
        // ← test|live desde el switch interno del modal
        invoicePayload: {
          ...baseCustomer,
          items: values.items.map((it: any) => ({
            quantity: Number(it.quantity),
            product: {
              description: it.description,
              product_key: it.product_key, // p. ej. "90101500"
              unit_key: it.unit_key || "E48", // "E48" Unidad de servicio
              price: Number(it.price),
              // Opción A: deja por defecto impuestos incluidos + IVA 16% (no mandes taxes)
              // Opción B: forzar IVA 16% con arreglo:
              taxes: it.iva16 ? [{ type: "IVA", rate: 0.16 }] : [],
              // Si quieres controlar explícitamente el modo:
              // tax_included: it.tax_included ?? true,
            },
          })),
          payment_form: values.payment_form,
          payment_method: values.payment_method || "PUE",
          use: values.use || "G01",
          series: values.series || undefined,
          folio_number: values.folio_number
            ? Number(values.folio_number)
            : undefined,
        },
      };

      setSubmitting(true);
      await createInvoice(restaurantId!, payload);
      message.success("Factura creada");
      onClose();
      onOk();
    } catch (e: any) {
      if (e?.error_fields) {
        form.setFields(e.error_fields);
      }
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "No se pudo crear la factura";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={submit}
      confirmLoading={submitting}
      okText={`Timbrar (${mode.toUpperCase()})`}
      title="Nueva factura"
      width={880}
    >
      <Space style={{ marginBottom: 8 }}>
        <Switch
          checked={useSavedCustomer}
          onChange={setUseSavedCustomer}
          checkedChildren="Usar cliente guardado"
          unCheckedChildren="Cliente nuevo"
        />
      </Space>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          payment_form: "03",
          payment_method: "PUE",
          use: "G01",
          items: [
            {
              description: "Consumo restaurante",
              product_key: "90101500",
              unit_key: "E48",
              price: 100,
              quantity: 1,
              iva16: true,
            },
          ],
        }}
      >
        {useSavedCustomer ? (
          <Card size="small" title="Cliente guardado">
            <Select
              style={{ width: 520 }}
              placeholder={
                loadingCustomers
                  ? "Cargando clientes…"
                  : "Selecciona o busca un cliente"
              }
              loading={loadingCustomers}
              showSearch
              allowClear
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={customerOptions}
              // Búsqueda local por label (sencilla) usando optionFilterProp:
              optionFilterProp="label"
            />
          </Card>
        ) : (
          <Card size="small" title="Cliente (RFC real)">
            <Form.Item
              name="legal_name"
              label="Razón social"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="tax_id" label="RFC" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item
              name="tax_system"
              label="Régimen fiscal (clave SAT)"
              rules={[{ required: true }]}
            >
              <Input placeholder="Ej. 601" />
            </Form.Item>
            <Form.Item name="zip" label="CP (SAT)" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email (opcional)">
              <Input type="email" />
            </Form.Item>
          </Card>
        )}

        <Card size="small" title="Comprobante">
          <Space style={{ display: "flex" }} wrap>
            <Form.Item name="series" label="Serie">
              <Input placeholder="Opcional" />
            </Form.Item>
            <Form.Item name="folio_number" label="Folio">
              <Input placeholder="Opcional" />
            </Form.Item>
            <Form.Item
              name="payment_form"
              label="Forma de pago"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 220 }}
                options={[
                  { value: "03", label: "03 - Transferencia" },
                  { value: "01", label: "01 - Efectivo" },
                  { value: "04", label: "04 - Tarjeta de crédito" },
                  { value: "28", label: "28 - Tarjeta de débito" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="payment_method"
              label="Método de pago"
              tooltip="PUE/P PD"
            >
              <Select
                style={{ width: 140 }}
                options={[
                  { value: "PUE", label: "PUE" },
                  { value: "PPD", label: "PPD" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="use"
              label="Uso CFDI"
              tooltip="G01, G03, P01, S01…"
            >
              <Input style={{ width: 140 }} />
            </Form.Item>
          </Space>
        </Card>

        <Card size="small" title="Items (carrito)">
          <Form.List
            name="items"
            rules={[
              {
                validator: async (_, v) => {
                  if (!v || !v.length)
                    return Promise.reject(new Error("Agrega al menos 1 ítem"));
                },
              },
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space
                    key={field.key} // ← usa SIEMPRE field.key en lugar de index
                    style={{ display: "flex", marginBottom: 8 }}
                    align="baseline"
                    wrap
                  >
                    <Form.Item
                      name={[field.name, "description"]}
                      label="Descripción"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 240 }} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "product_key"]}
                      label="Clave prod. SAT"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 150 }} placeholder="90101500" />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "unit_key"]}
                      label="Unidad"
                      rules={[{ required: true }]}
                    >
                      <Input style={{ width: 100 }} placeholder="E48" />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "price"]}
                      label="Precio"
                      rules={[{ required: true }]}
                    >
                      <Input type="number" style={{ width: 120 }} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "quantity"]}
                      label="Cant."
                      rules={[{ required: true }]}
                    >
                      <Input type="number" style={{ width: 90 }} />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, "iva16"]}
                      valuePropName="checked"
                      label="IVA 16%"
                    >
                      <Switch />
                    </Form.Item>

                    <Button danger onClick={() => remove(field.name)}>
                      Quitar
                    </Button>
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Agregar ítem
                </Button>
              </>
            )}
          </Form.List>
        </Card>
      </Form>
    </Modal>
  );
}
