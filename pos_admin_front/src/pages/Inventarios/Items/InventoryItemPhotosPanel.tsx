import { useEffect, useState } from "react";
import { Button, List, Upload, Space, message } from "antd";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import {
  deleteInventoryItemPhoto,
  getInventoryItem,
  uploadInventoryItemPhoto,
} from "@/lib/api_inventory";

type Props = {
  restaurantId: number;
  itemId: number;
};

export default function InventoryItemPhotosPanel({ restaurantId, itemId }: Props) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: number; url: string }>>([]);

  async function load() {
    setLoading(true);
    try {
      const item = await getInventoryItem(restaurantId, itemId);
      setPhotos((item.photos ?? []).map((p) => ({ id: p.id, url: (p as any).url })));
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando fotos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, itemId]);

  const customRequest = async (opt: UploadRequestOption) => {
    try {
      const f = opt.file as File;
      await uploadInventoryItemPhoto(restaurantId, itemId, f);
      message.success("Foto subida");
      opt.onSuccess?.({}, new XMLHttpRequest());
      load();
    } catch (e: any) {
      opt.onError?.(e);
      message.error(e?.message ?? "Error subiendo foto");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Space>
        <Upload customRequest={customRequest} showUploadList={false}>
          <Button type="dashed" loading={loading}>
            Subir foto
          </Button>
        </Upload>
        <Button onClick={load} disabled={loading}>
          Refrescar
        </Button>
      </Space>

      <List
        bordered
        loading={loading}
        dataSource={photos}
        locale={{ emptyText: "Sin fotos" }}
        renderItem={(p) => (
          <List.Item
            actions={[
              <Button
                danger
                size="small"
                key="del"
                onClick={async () => {
                  try {
                    await deleteInventoryItemPhoto(restaurantId, itemId, p.id);
                    message.success("Foto eliminada");
                    load();
                  } catch (e: any) {
                    message.error(e?.message ?? "Error eliminando foto");
                  }
                }}
              >
                Eliminar
              </Button>,
            ]}
          >
            <a
              href={p.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}
            >
              <img
                src={p.url}
                alt="foto"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              />
              {/* <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontWeight: 600 }}>Ver foto</div>
                <div style={{ fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>{p.url}</div>
              </div> */}
            </a>
          </List.Item>
        )}
      />
    </div>
  );
}
