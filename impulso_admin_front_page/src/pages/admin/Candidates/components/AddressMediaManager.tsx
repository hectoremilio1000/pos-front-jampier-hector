import { useEffect, useState } from "react";
import { Card, Upload, Image, Space, Button, message } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { deleteAddressMedia, listAddressMedia } from "@/lib/rrhhApi";
const API = import.meta.env.VITE_API_RRHH__BASE as string;

export default function AddressMediaManager({
  candidateId,
}: {
  candidateId: number;
}) {
  const [items, setItems] = useState<any[]>([]);
  async function refresh() {
    const r = await listAddressMedia(candidateId);
    setItems(r.media || []);
  }
  useEffect(() => {
    refresh();
  }, [candidateId]);

  return (
    <Card title="Evidencia de domicilio">
      <Space align="start" size={16} wrap>
        <Upload
          name="file"
          action={`${API}/api/candidates/${candidateId}/address-media`}
          listType="picture-card"
          showUploadList={false}
          multiple
          data={{ mediaType: "facade" }}
          onChange={(info) => {
            if (info.file.status === "done") {
              message.success("Foto subida");
              refresh();
            } else if (info.file.status === "error") {
              message.error("Error al subir");
            }
          }}
        >
          <div>
            <PlusOutlined />
            <div style={{ marginTop: 8 }}>Subir foto</div>
          </div>
        </Upload>

        <Space size={16} wrap>
          {items.map((m) => (
            <div key={m.id} style={{ width: 160 }}>
              <Image
                src={m.url}
                width={160}
                height={120}
                style={{ objectFit: "cover", borderRadius: 12 }}
              />
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    deleteAddressMedia(candidateId, m.id).then(() => {
                      message.success("Evidencia eliminada");
                      refresh();
                    })
                  }
                />
              </Space>
            </div>
          ))}
        </Space>
      </Space>
    </Card>
  );
}
