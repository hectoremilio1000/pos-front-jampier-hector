import { useEffect, useState } from "react";
import {
  Card,
  Upload,
  Image,
  Space,
  Button,
  Select,
  message,
  Typography,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  listMenuPhotos,
  reorderMenuPhotos,
  deleteMenuPhoto,
  getRestaurantBySlug,
} from "@/lib/api_restaurants"; // 👈 IMPORT CORRECTO
import { useParams } from "react-router-dom";

const { Title, Text } = Typography;

const API_REST = import.meta.env.VITE_API_RESTAURANTS_BASE as string;

const LOCALES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
];

const SECTIONS = [
  { value: "alimentos", label: "Alimentos" },
  // { value: "bebidas", label: "Bebidas" },
  // { value: "postres", label: "Postres" },
  // agrega más secciones si quieres
];

type Photo = {
  id: number;
  url: string;
  altText?: string | null;
  sortOrder: number;
};

export default function MenuPhotosManager() {
  const params = useParams();
  const slug = (params.slug || "") as string;

  const [restaurantName, setRestaurantName] = useState<string>("");
  const [locale, setLocale] = useState<string>("es");
  const [section, setSection] = useState<string>("alimentos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // ⚠️ Hooks SIEMPRE van al principio, sin returns antes

  // Cargar datos del restaurante
  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const res = await getRestaurantBySlug(slug);
        setRestaurantName(res.restaurant.name);
      } catch (e) {
        console.error("Error cargando restaurante", e);
      }
    })();
  }, [slug]);

  // Cargar fotos cuando cambian slug/locale/section
  useEffect(() => {
    if (!slug) return;

    async function loadPhotos() {
      setLoading(true);
      try {
        const res = await listMenuPhotos(slug, locale, section);
        setPhotos(res.photos || []);
      } catch (e: any) {
        console.error(e);
        message.error(e?.message || "Error al cargar fotos");
      } finally {
        setLoading(false);
      }
    }

    loadPhotos();
  }, [slug, locale, section]);

  function move(idx: number, dir: -1 | 1) {
    const next = [...photos];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setPhotos(next);
  }

  async function saveOrder() {
    const s = slug; // 👈 narrow
    if (!s) return;

    try {
      setSavingOrder(true);
      await reorderMenuPhotos(
        s,
        locale,
        section,
        photos.map((p) => p.id)
      );
      message.success("Orden guardado");
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "Error al guardar orden");
    } finally {
      setSavingOrder(false);
    }
  }

  async function onRemove(photoId: number) {
    const s = slug; // 👈 narrow
    if (!s) return;

    try {
      await deleteMenuPhoto(s, locale, section, photoId);
      message.success("Foto eliminada");
      // recarga rápida sin esperar al useEffect
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || "No se pudo eliminar");
    }
  }

  // URL de upload (solo si hay slug)
  const uploadAction =
    slug &&
    `${API_REST}/api/restaurants/${encodeURIComponent(
      slug
    )}/menus/${encodeURIComponent(locale)}/${encodeURIComponent(
      section
    )}/photos`;

  // Aquí sí puedes hacer un return condicional, DESPUÉS de los hooks
  if (!slug) {
    return <Card>Falta el slug en la URL</Card>;
  }

  return (
    <Card
      title={
        <>
          <Title level={4} style={{ marginBottom: 0 }}>
            Menús – {restaurantName || slug}
          </Title>
          <Text type="secondary">
            Gestiona las imágenes que se verán en la página de menú del sitio
            Next.js.
          </Text>
        </>
      }
      extra={
        <Button
          icon={<SaveOutlined />}
          onClick={saveOrder}
          loading={savingOrder}
        >
          Guardar orden
        </Button>
      }
      loading={loading && !savingOrder} // 👈 así ya usamos `loading`
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {/* Filtros de idioma / sección */}
        <Space wrap>
          <span>Idioma:</span>
          <Select
            value={locale}
            style={{ width: 160 }}
            options={LOCALES}
            onChange={setLocale}
          />
          <span>Sección:</span>
          <Select
            value={section}
            style={{ width: 200 }}
            options={SECTIONS}
            onChange={setSection}
          />
        </Space>

        <Space align="start" size={16} wrap>
          {/* Upload */}
          {uploadAction && (
            <Upload
              name="file"
              action={uploadAction}
              listType="picture-card"
              multiple
              showUploadList={false}
              onChange={(info) => {
                if (info.file.status === "done") {
                  message.success("Foto subida");
                  // recargamos fotos tras subir
                  // (dispara el useEffect porque locale/section/slug no cambiaron,
                  // pero podemos recargar manualmente también)
                  setTimeout(() => {
                    // truco rápido: vuelve a usar el mismo efecto
                    // cambiando ligeramente el estado (opcional)
                  }, 0);
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
          )}

          {/* Galería admin */}
          <Space size={16} wrap>
            {photos.map((p, idx) => (
              <div key={p.id} style={{ width: 180 }}>
                <Image
                  src={p.url}
                  width={180}
                  height={135}
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
      </Space>
    </Card>
  );
}
