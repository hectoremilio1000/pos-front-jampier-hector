import { useEffect, useMemo, useState } from "react";
import { App, Descriptions, Modal, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { listPreviousJobs } from "@/lib/rrhhApi";

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  candidateId: number;
};

type Job = {
  id: number;

  companyName?: string | null;
  roleTitle?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean | null;

  baseSalary?: number | string | null;
  weeklyTips?: number | string | null;

  responsibilities?: string | null;
  achievements?: string | null;
  separationReason?: string | null;

  refContactName?: string | null;
  refContactPhone?: string | null;
  refContactEmail?: string | null;
  refRelationship?: string | null;
  refConsent?: boolean | null;
};

// Normaliza snake_case o camelCase (por si tu API devuelve distinto)
function normalizeJob(r: any): Job {
  return {
    id: r.id,

    companyName: r.companyName ?? r.company_name ?? null,
    roleTitle: r.roleTitle ?? r.role_title ?? null,
    startDate: r.startDate ?? r.start_date ?? null,
    endDate: r.endDate ?? r.end_date ?? null,
    isCurrent: r.isCurrent ?? r.is_current ?? null,

    baseSalary: r.baseSalary ?? r.base_salary ?? null,
    weeklyTips: r.weeklyTips ?? r.weekly_tips ?? null,

    responsibilities: r.responsibilities ?? null,
    achievements: r.achievements ?? null,
    separationReason: r.separationReason ?? r.separation_reason ?? null,

    refContactName: r.refContactName ?? r.ref_contact_name ?? null,
    refContactPhone: r.refContactPhone ?? r.ref_contact_phone ?? null,
    refContactEmail: r.refContactEmail ?? r.ref_contact_email ?? null,
    refRelationship: r.refRelationship ?? r.ref_relationship ?? null,
    refConsent: r.refConsent ?? r.ref_consent ?? null,
  };
}

function money(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function val(v: any) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export default function ReferencesModal({ open, onClose, candidateId }: Props) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      try {
        const data = await listPreviousJobs(candidateId);
        const arr = Array.isArray(data) ? data : [];
        setRows(arr.map(normalizeJob));
      } catch (e: any) {
        message.error(e?.message || "Error al cargar referencias");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, candidateId]);

  const columns: ColumnsType<Job> = useMemo(
    () => [
      {
        title: "Empresa",
        dataIndex: "companyName",
        key: "companyName",
        fixed: "left",
        width: 220,
        render: (v) => <Text strong>{val(v)}</Text>,
      },
      {
        title: "Puesto",
        dataIndex: "roleTitle",
        key: "roleTitle",
        width: 180,
        render: (v) => val(v),
      },
      {
        title: "Inicio",
        dataIndex: "startDate",
        key: "startDate",
        width: 120,
        render: (v) => val(v),
      },
      {
        title: "Fin",
        dataIndex: "endDate",
        key: "endDate",
        width: 120,
        render: (v, r) =>
          r.isCurrent ? <Tag color="green">Actual</Tag> : val(v),
      },
      {
        title: "Sueldo base",
        dataIndex: "baseSalary",
        key: "baseSalary",
        width: 140,
        render: (v) => money(v),
        responsive: ["lg"],
      },
      {
        title: "Propinas (sem)",
        dataIndex: "weeklyTips",
        key: "weeklyTips",
        width: 150,
        render: (v) => money(v),
        responsive: ["lg"],
      },
      {
        title: "Referencia",
        dataIndex: "refContactName",
        key: "refContactName",
        width: 200,
        render: (v) => val(v),
      },
      {
        title: "Tel referencia",
        dataIndex: "refContactPhone",
        key: "refContactPhone",
        width: 160,
        render: (v) => val(v),
      },
      {
        title: "Email ref",
        dataIndex: "refContactEmail",
        key: "refContactEmail",
        width: 220,
        render: (v) => val(v),
        responsive: ["xl"],
      },
      {
        title: "Relación",
        dataIndex: "refRelationship",
        key: "refRelationship",
        width: 180,
        render: (v) => val(v),
      },
      {
        title: "Consentimiento",
        dataIndex: "refConsent",
        key: "refConsent",
        width: 140,
        render: (v) =>
          v ? <Tag color="green">Sí</Tag> : <Tag color="red">No</Tag>,
      },
      {
        title: "Responsabilidades",
        dataIndex: "responsibilities",
        key: "responsibilities",
        width: 260,
        render: (v) => (v ? <Text ellipsis={{ tooltip: v }}>{v}</Text> : "—"),
        responsive: ["xl"],
      },
      {
        title: "Logros",
        dataIndex: "achievements",
        key: "achievements",
        width: 220,
        render: (v) => (v ? <Text ellipsis={{ tooltip: v }}>{v}</Text> : "—"),
        responsive: ["xl"],
      },
      {
        title: "Motivo salida",
        dataIndex: "separationReason",
        key: "separationReason",
        width: 220,
        render: (v) => (v ? <Text ellipsis={{ tooltip: v }}>{v}</Text> : "—"),
        responsive: ["xl"],
      },
    ],
    []
  );

  return (
    <Modal
      title={`Referencias laborales (candidato #${candidateId})`}
      open={open}
      onCancel={onClose}
    
      okText="Cerrar"
      width={1100}
      style={{ top: 18 }}
      bodyStyle={{ paddingTop: 8 }}
    >
      <Table<Job>
        rowKey={(r) => r.id}
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        size="middle"
        sticky
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No hay referencias registradas" }}
        expandable={{
          // Esto hace que en móvil/tablet puedas expandir y ver TODO bien acomodado
          expandedRowRender: (r) => (
            <Descriptions
              size="small"
              bordered
              column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
            >
              <Descriptions.Item label="Empresa">
                {val(r.companyName)}
              </Descriptions.Item>
              <Descriptions.Item label="Puesto">
                {val(r.roleTitle)}
              </Descriptions.Item>
              <Descriptions.Item label="Inicio">
                {val(r.startDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Fin">
                {r.isCurrent ? "Actual" : val(r.endDate)}
              </Descriptions.Item>

              <Descriptions.Item label="Sueldo base">
                {money(r.baseSalary)}
              </Descriptions.Item>
              <Descriptions.Item label="Propinas (sem)">
                {money(r.weeklyTips)}
              </Descriptions.Item>

              <Descriptions.Item label="Referencia">
                {val(r.refContactName)}
              </Descriptions.Item>
              <Descriptions.Item label="Tel referencia">
                {val(r.refContactPhone)}
              </Descriptions.Item>
              <Descriptions.Item label="Email referencia">
                {val(r.refContactEmail)}
              </Descriptions.Item>
              <Descriptions.Item label="Relación">
                {val(r.refRelationship)}
              </Descriptions.Item>
              <Descriptions.Item label="Consentimiento">
                {r.refConsent ? "Sí" : "No"}
              </Descriptions.Item>

              <Descriptions.Item label="Responsabilidades" span={3}>
                {val(r.responsibilities)}
              </Descriptions.Item>
              <Descriptions.Item label="Logros" span={3}>
                {val(r.achievements)}
              </Descriptions.Item>
              <Descriptions.Item label="Motivo salida" span={3}>
                {val(r.separationReason)}
              </Descriptions.Item>
            </Descriptions>
          ),
        }}
      />
    </Modal>
  );
}
