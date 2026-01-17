import { useMemo, useState } from "react";
import { Form, Input, InputNumber, Select, Switch, Button } from "antd";
import type { FormInstance } from "antd";
import type { InventoryItemRow } from "@/lib/api_inventory";

type Props = {
  form: FormInstance;
  item: InventoryItemRow;
  unitOptions: Array<{ label: string; value: number }>;
};

export default function GeneralTab({ item, unitOptions }: Props) {
  const baseUnit = item?.unit?.code ?? "unidad base";
  const sampleContent = useMemo(() => {
    const lower = baseUnit.toLowerCase();
    if (lower === "pza") return "Ej: 24 pzas";
    if (lower === "kg") return "Ej: 10 kg";
    if (lower === "g") return "Ej: 500 g";
    if (lower === "l") return "Ej: 1 L";
    if (lower === "ml") return "Ej: 750 ml";
    return `Ej: 10 ${baseUnit}`;
  }, [baseUnit]);

  const sampleName = useMemo(() => {
    const name = item?.name ?? "presentación";
    const lower = baseUnit.toLowerCase();
    if (lower === "pza") return `${name} paquete 24 pzas`;
    if (lower === "kg") return `${name} bolsa 10 kg`;
    if (lower === "g") return `${name} bolsa 500 g`;
    if (lower === "l") return `${name} botella 1 L`;
    if (lower === "ml") return `${name} botella 750 ml`;
    return `${name} (${baseUnit})`;
  }, [baseUnit, item?.name]);
  const [showUnitSelect, setShowUnitSelect] = useState(false);

  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Presentación</div>

      <Form.Item
        label="Nombre del producto a comprar"
        name="name"
        rules={[{ required: true }]}
        extra={`Ej: ${sampleName}`}
      >
        <Input placeholder={sampleName} />
      </Form.Item>

      <Form.Item
        label="Conversión a unidad base"
        name="contentInBaseUnit"
        rules={[{ required: true }]}
        extra={`¿Cuántas “${baseUnit}” contiene esta presentación? Ej: ${sampleContent}. Esto convierte tu compra a ${baseUnit} para el inventario.`}
      >
        <InputNumber min={0} style={{ width: "100%" }} placeholder={sampleContent} />
      </Form.Item>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Unidad visible</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
          Se autollenó con la unidad base ({baseUnit}) para mostrar en compras/listas. No afecta la
          conversión.
        </div>
        {!showUnitSelect ? (
          <Button type="link" size="small" onClick={() => setShowUnitSelect(true)}>
            Cambiar unidad visible
          </Button>
        ) : null}
      </div>

      <Form.Item
        label=" "
        name="presentationUnitId"
        colon={false}
        style={{ display: showUnitSelect ? "block" : "none" }}
        rules={[{ required: true, message: "Selecciona la unidad de la presentación" }]}
        extra="Solo etiqueta visible."
      >
        <Select options={unitOptions} placeholder={`Ej: ${baseUnit}`} />
      </Form.Item>

      {/* ✅ Importante: Form.Item con un solo hijo */}
      <Form.Item
        label="Presentación de compra habitual"
        name="isDefaultPurchase"
        valuePropName="checked"
        extra="Es la que normalmente compras."
      >
        <Switch checkedChildren="Sí" unCheckedChildren="No" />
      </Form.Item>
    </>
  );
}
