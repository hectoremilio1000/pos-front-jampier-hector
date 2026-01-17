import { useEffect, useState } from "react";
import { Card, Upload, Image, Space, Button, message } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { deletePhoto, listPhotos, reorderPhotos } from "@/lib/api";

type P = { traspasoId: number };

export default function PhotosManager({ traspasoId }: P) {
  const [photos, setPhotos] = useState<
    { id: number; url: string; sortOrder?: number }[]
  >([]);
  const [savingOrder, setSavingOrder] = useState(false);

  async function refresh() {
    const res = await listPhotos(traspasoId);
    setPhotos(res.photos || []);
  }

  useEffect(() => {
    refresh();
  }, [traspasoId]);

  async function onRemove(photoId: number) {
    await deletePhoto(traspasoId, photoId);
    message.success("Foto eliminada");
    refresh();
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...photos];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setPhotos(next);
  }

  async function saveOrder() {
    try {
      setSavingOrder(true);
      await reorderPhotos(
        traspasoId,
        photos.map((p) => p.id)
      );
      message.success("Orden guardado");
      refresh();
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <Card
      title="Fotos"
      extra={
        <Button
          icon={<SaveOutlined />}
          onClick={saveOrder}
          loading={savingOrder}
        >
          Guardar orden
        </Button>
      }
    >
      <Space align="start" size={16} wrap>
        {/* Upload (usa tu endpoint /api/photos con form-data: traspasoId + file) */}
        <Upload
          name="file"
          action={`${import.meta.env.VITE_API_BASE}/api/photos`}
          listType="picture-card"
          multiple
          showUploadList={false}
          data={{ traspasoId }}
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
            <div style={{ marginTop: 8 }}>Subir</div>
          </div>
        </Upload>

        {/* Galería admin */}
        <Space size={16} wrap>
          {photos.map((p, idx) => (
            <div key={p.id} style={{ width: 160 }}>
              <Image
                src={p.url}
                width={160}
                height={120}
                style={{ objectFit: "cover", borderRadius: 12 }}
              />
              <Space style={{ marginTop: 8 }}>
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  onClick={() => move(idx, -1)}
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  onClick={() => move(idx, 1)}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onRemove(p.id)}
                />
              </Space>
            </div>
          ))}
        </Space>
      </Space>
    </Card>
  );
}
