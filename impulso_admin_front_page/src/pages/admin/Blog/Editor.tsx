import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Space,
  Upload,
  Popconfirm,
  Alert,
} from "antd";
import {
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  createBlogPost,
  getBlogPost,
  updateBlogPost,
  uploadCover,
  uploadBlockImage,
} from "@/lib/blogApi";
import dayjs from "dayjs";

type Block = {
  id?: number;
  sortOrder: number;
  type: "heading" | "paragraph" | "image";
  text?: string | null;
  imageUrl?: string | null;
};

export default function BlogEditor() {
  const { id } = useParams();
  const isNew = id === "0";
  const nav = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [postId, setPostId] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [cover, setCover] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function slugify(s: string): string {
    return String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\- ]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 180);
  }
  const [slugTouched, setSlugTouched] = useState(false);
  const canEditMedia = !!postId;

  useEffect(() => {
    if (isNew) {
      form.resetFields();
      setPostId(null);
      setSlugTouched(true);
      setCover(null);
      setBlocks([]);
      setSlugTouched(false); // vuelve a autogenerar
    }
  }, [isNew]);

  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        const p = await getBlogPost(id);
        form.setFieldsValue({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          bannerPhrase: p.bannerPhrase,
          authorName: p.author?.name || p.authorName || "",
          publishedAt: p.publishedAt ? dayjs(p.publishedAt) : null,
        });
        setCover(p.coverImage || null);
        setBlocks(
          (p.blocks || []).map((b: any) => ({
            id: b.id,
            sortOrder: b.sortOrder ?? b.order,
            type: b.type,
            text: b.text ?? null,
            imageUrl: b.imageUrl ?? null,
          }))
        );
        setPostId(p.id);
        setSlugTouched(true);
      })();
    }
  }, [id, isNew]);

  function removeBlock(index: number): void {
    const next = [...blocks];
    next.splice(index, 1);
    next.forEach((b, i) => (b.sortOrder = i + 1)); // reindex
    setBlocks(next);
  }

  function addBlock(type: Block["type"]) {
    const next: Block[] = [...blocks, { sortOrder: blocks.length + 1, type }];
    setBlocks(next);
  }
  function move(index: number, dir: -1 | 1) {
    const next = [...blocks];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    next.forEach((b, i) => (b.sortOrder = i + 1));
    setBlocks(next);
  }
  async function onUploadCover(file: File) {
    if (!postId) return message.error("Guarda el post primero");
    const { url } = await uploadCover(postId, file);
    setCover(url);
    message.success("Cover subido");
    return false as any; // evitar upload automático de Ant
  }
  async function onUploadImage(file: File, index: number) {
    if (!postId) return message.error("Guarda el post primero");
    const { url } = await uploadBlockImage(postId, file);
    const next = [...blocks];
    next[index].imageUrl = url;
    setBlocks(next);
    message.success("Imagen subida");
    return false as any;
  }

  async function onSave(vals: any) {
    const payload = {
      title: vals.title,
      slug: vals.slug || undefined,
      excerpt: vals.excerpt || null,
      bannerPhrase: vals.bannerPhrase || null,
      authorName: vals.authorName || null,
      publishedAt: vals.publishedAt || null,
      coverImage: cover || null,
      blocks: blocks.map((b) => ({
        sortOrder: b.sortOrder,
        type: b.type,
        text: b.text ?? null,
        imageUrl: b.imageUrl ?? null,
      })),
    };
    setSaving(true);
    try {
      if (isNew) {
        const created = await createBlogPost(payload);
        message.success("Post creado");
        setPostId(created.id);
        nav(`/admin/blog/${created.id}`, { replace: true });
      } else if (postId) {
        await updateBlogPost(postId, payload);
        message.success("Guardado");
        nav("/admin/blog");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Card title={isNew ? "Nuevo post" : `Editar post #${postId ?? id}`}>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Título"
                rules={[{ required: true }]}
              >
                <Input
                  onChange={(e) => {
                    if (!slugTouched) {
                      const v = e.target.value || "";
                      form.setFieldsValue({ slug: slugify(v) });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slug" label="Slug">
                <Input
                  placeholder="(auto si lo dejas vacío)"
                  onChange={(e) => {
                    const v = (e.target.value || "").trim();
                    // si lo dejan vacío, vuelve a autogenerar desde el título
                    setSlugTouched(v.length > 0);
                    if (v.length === 0) {
                      const title = form.getFieldValue("title") || "";
                      form.setFieldsValue({ slug: slugify(title) });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="excerpt" label="Extracto">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="authorName" label="Autor">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bannerPhrase" label="Frase de banner">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="publishedAt"
                label="Fecha de publicación"
                // guardamos string "YYYY-MM-DD" en el form
                getValueFromEvent={(_date, dateString: string) =>
                  dateString || null
                }
                // mostramos Dayjs en el DatePicker cuando el form tiene un string
                getValueProps={(value?: string | null) => ({
                  value: value ? dayjs(value) : null,
                })}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Space style={{ marginTop: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
            >
              Guardar
            </Button>
            <Button onClick={() => nav("/admin/blog")}>Volver</Button>
          </Space>

          {canEditMedia && (
            <Col span={12}>
              <Form.Item label="Cover" style={{ marginTop: 16 }}>
                <Space>
                  <Upload
                    beforeUpload={(file) => {
                      // subida manual
                      onUploadCover(file as any);
                      return false; // evita request automático
                    }}
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />}>Subir Portada</Button>
                  </Upload>

                  {cover ? (
                    <img
                      src={cover}
                      style={{
                        width: 120,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                  ) : null}
                </Space>
              </Form.Item>
            </Col>
          )}
          {!canEditMedia && (
            <Alert
              style={{ marginTop: 16 }}
              message="Guarda el post para habilitar la subida de la foto de portada."
              type="info"
              showIcon
            />
          )}

          {canEditMedia ? (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div style={{ fontWeight: 600 }}>Bloques</div>

              {blocks.map((b, i) => (
                <Card
                  key={i}
                  size="small"
                  title={`#${b.sortOrder} · ${b.type.toUpperCase()}`}
                  extra={
                    <Space>
                      <Button onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </Button>
                      <Button
                        onClick={() => move(i, 1)}
                        disabled={i === blocks.length - 1}
                      >
                        ↓
                      </Button>
                      <Popconfirm
                        title="Eliminar bloque"
                        okText="Sí, eliminar"
                        cancelText="Cancelar"
                        onConfirm={() => removeBlock(i)}
                      >
                        <Button danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                >
                  {b.type !== "image" ? (
                    <Input.TextArea
                      value={b.text ?? ""}
                      onChange={(e) => {
                        const next = [...blocks];
                        next[i].text = e.target.value;
                        setBlocks(next);
                      }}
                      rows={3}
                    />
                  ) : (
                    <Space>
                      <Upload
                        beforeUpload={(file) => {
                          onUploadImage(file as any, i);
                          return false; // evita request automático
                        }}
                        showUploadList={false}
                      >
                        <Button icon={<UploadOutlined />}>Subir imagen</Button>
                      </Upload>
                      {b.imageUrl ? (
                        <img
                          src={b.imageUrl}
                          style={{
                            width: 160,
                            height: 120,
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                      ) : null}
                    </Space>
                  )}
                </Card>
              ))}

              <Space>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => addBlock("heading")}
                >
                  Añadir Título
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => addBlock("paragraph")}
                >
                  Añadir Párrafo
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => addBlock("image")}
                >
                  Añadir Imagen
                </Button>
              </Space>
            </Space>
          ) : (
            <Alert
              style={{ marginTop: 16 }}
              message="Guarda el post para habilitar la subida de bloques."
              type="info"
              showIcon
            />
          )}
        </Form>
      </Card>
    </Space>
  );
}
