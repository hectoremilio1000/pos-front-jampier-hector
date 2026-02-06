import { Form, InputNumber, Select, Space, Switch, Button } from "antd";
import type { FormInstance } from "antd";
type Props = {
  form: FormInstance;
  supplierOptions: Array<{ label: string; value: number }>;
  loadingSuppliers: boolean;
  locationOptions: Array<{ label: string; value: number; warehouseId?: number }>;
  loadingLocations: boolean;

  defaultSupplierId: number | null; // (no lo usamos aquí, pero lo dejamos por si luego quieres mostrarlo)
  defaultLastCost: number | null;
  onUseLastCost: () => void;
  onCreateSupplier: () => void;
  onCreateLocation: () => void;
};

export default function DetailsTab({
  supplierOptions,
  loadingSuppliers,
  locationOptions,
  loadingLocations,
  defaultLastCost,
  onUseLastCost,
  onCreateSupplier,
  onCreateLocation,
}: Props) {
  const locationRequired = locationOptions.length > 0;
  const locationExtra = locationRequired
    ? "Solo ubicaciones registradas en almacenes; sin texto libre."
    : "No hay ubicaciones dadas de alta. Usa “Agregar ubicación” para crear una.";

  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Compra / Costos</div>

      <Form.Item label="Proveedor default">
        <Space style={{ width: "100%" }}>
          <Form.Item
            name="supplierId"
            noStyle
            dependencies={["isDefaultPurchase"]}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (getFieldValue("isDefaultPurchase") && (value === null || value === undefined)) {
                    return Promise.reject(
                      new Error("Selecciona un proveedor default para la compra habitual.")
                    );
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Select
              style={{ flex: 1 }}
              allowClear
              loading={loadingSuppliers}
              options={supplierOptions}
              placeholder="(sin proveedor)"
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Button type="link" onClick={onCreateSupplier}>
            Nuevo proveedor
          </Button>
        </Space>
      </Form.Item>

      <Space style={{ width: "100%" }} align="start">
        <div style={{ flex: 1 }}>
          <Form.Item label="Costo estándar (MXN)" name="standardCost">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <div style={{ paddingTop: 30 }}>
          <Button disabled={defaultLastCost == null} onClick={onUseLastCost}>
            Usar último costo
          </Button>
        </div>
      </Space>

      <Form.Item
        label="IVA"
        name="tax1Rate"
        valuePropName="checked"
        getValueFromEvent={(checked: boolean) => (checked ? 0.16 : 0)}
        getValueProps={(value) => ({ checked: Number(value ?? 0) > 0 })}
      >
        <Switch checkedChildren="Sí" unCheckedChildren="No" />
      </Form.Item>

      <Space style={{ width: "100%" }} size="middle">
        <Form.Item label="Auto-decrement al usar" name="autoDecrementOnUse" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item label="Usa báscula" name="useScale" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Space>

      <Form.Item label="Ubicación (dónde lo guardas)" extra={locationExtra}>
        <Space style={{ width: "100%" }}>
          <Form.Item
            name="locationId"
            noStyle
            rules={
              locationRequired
                ? [{ required: true, message: "Selecciona la ubicación en el almacén" }]
                : []
            }
          >
            <Select
              style={{ flex: 1 }}
              loading={loadingLocations}
              options={locationOptions}
              placeholder={
                locationRequired
                  ? "Selecciona ubicación del almacén"
                  : "No hay ubicaciones, agrega una nueva"
              }
              showSearch
              optionFilterProp="label"
              disabled={!locationRequired && !loadingLocations}
            />
          </Form.Item>
          <Button onClick={onCreateLocation} type="link">
            Agregar ubicación
          </Button>
        </Space>
      </Form.Item>

      <Form.Item
        label="Estado"
        name="detailStatusActive"
        valuePropName="checked"
        // extra="Se guarda como status=1 (Activo) o status=0 (Inactivo)."
      >
        <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
      </Form.Item>
    </>
  );
}
