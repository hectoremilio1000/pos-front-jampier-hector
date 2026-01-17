import { useEffect, useState } from "react";
import { App, Card, Space, Button, Upload, Image } from "antd";
import {
  PlusOutlined,
  FilePdfOutlined,
  LinkOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { deleteCv, listCandidateCvs, setPrimaryCv } from "@/lib/rrhhApi";

const API = import.meta.env.VITE_API_RRHH__BASE as string; // 👈 usa el mismo de todo el front

function isImage(url: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(url);
}
function isPdf(url: string) {
  return /\.pdf$/i.test(url);
}

export default function CvManager({ candidateId }: { candidateId: number }) {
  const { message } = App.useApp(); // 👈 evita warning de AntD
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await listCandidateCvs(candidateId);
      setFiles(r.files || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [candidateId]);

  async function onSetPrimary(id: number) {
    await setPrimaryCv(candidateId, id);
    message.success("CV principal actualizado");
    refresh();
  }
  async function onDelete(id: number) {
    await deleteCv(candidateId, id);
    message.success("CV eliminado");
    refresh();
  }

  return (
    <Card title="CVs">
      <Space align="start" size={16} wrap>
        <Upload
          name="file"
          action={`${API}/api/candidates/${candidateId}/cv`}
          listType="picture-card"
          multiple
          showUploadList={false}
          disabled={loading} // 👈 usa loading
          onChange={(info) => {
            if (info.file.status === "uploading") {
              setLoading(true); // 👈 marca cargando
            }
            if (info.file.status === "done") {
              message.success("CV subido");
              setLoading(false);
              refresh();
            } else if (info.file.status === "error") {
              message.error("Error al subir");
              setLoading(false);
            }
          }}
        >
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Subir CV</div>
          </div>
        </Upload>

        <Space size={16} wrap>
          {files.map((f) => {
            const img = isImage(f.url);
            const pdf = isPdf(f.url);
            return (
              <div key={f.id} style={{ width: 260 }}>
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {f.filename}{" "}
                  {f.isPrimary && (
                    <span style={{ color: "#16a34a", marginLeft: 8 }}>
                      (principal)
                    </span>
                  )}
                </div>

                {/* Preview: imagen o chip PDF */}
                {img ? (
                  <Image
                    src={f.url}
                    width={260}
                    height={170}
                    style={{ objectFit: "cover", borderRadius: 12 }}
                  />
                ) : pdf ? (
                  <div
                    style={{
                      width: 260,
                      height: 170,
                      borderRadius: 12,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      color: "#64748b",
                    }}
                  >
                    <FilePdfOutlined style={{ fontSize: 28 }} />
                    <span>PDF</span>
                  </div>
                ) : (
                  <div
                    style={{
                      width: 260,
                      height: 170,
                      borderRadius: 12,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                    }}
                  >
                    Archivo
                  </div>
                )}

                {/* Acciones */}
                <Space style={{ marginTop: 8 }} wrap>
                  <Button
                    size="small"
                    icon={<LinkOutlined />}
                    onClick={() => window.open(f.url, "_blank")}
                  >
                    Ver
                  </Button>
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(f.url, "_self")}
                  >
                    Descargar
                  </Button>
                  {!f.isPrimary && (
                    <Button size="small" onClick={() => onSetPrimary(f.id)}>
                      Hacer principal
                    </Button>
                  )}
                  <Button size="small" danger onClick={() => onDelete(f.id)}>
                    Eliminar
                  </Button>
                </Space>
              </div>
            );
          })}
        </Space>
      </Space>
    </Card>
  );
}
