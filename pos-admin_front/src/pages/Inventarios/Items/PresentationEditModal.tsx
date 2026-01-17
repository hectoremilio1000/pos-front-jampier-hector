import { Modal, Form, message, Steps, Button, Space, Input, Select } from "antd";
import { useEffect, useMemo, useState, useRef } from "react";
import type {
  InventoryItemRow,
  InventoryPresentationRow,
  MeasurementUnitRow,
  SupplierRow,
  SupplierTypeRow,
  WarehouseLocationRow,
  WarehouseRow,
} from "@/lib/api_inventory";
import {
  listSuppliers,
  listSupplierTypes,
  listWarehouseLocations,
  listWarehouses,
  upsertInventoryPresentation,
  upsertInventoryPresentationDetail,
  upsertWarehouseLocation,
} from "@/lib/api_inventory";

import GeneralTab from "./Tabs/GeneralTab";
import DetailsTab from "./Tabs/DetailsTab";
import SuppliersTab from "./Tabs/SuppliersTab";
import SupplierFormModal from "../Suppliers/SupplierFormModal";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: number;
  item: InventoryItemRow;
  units: MeasurementUnitRow[];
  row: InventoryPresentationRow | null;
  isFirstPresentation?: boolean;
};

export default function PresentationEditModal({
  open,
  onClose,
  onSaved,
  restaurantId,
  item,
  units,
  row,
  isFirstPresentation = false,
}: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierTypes, setSupplierTypes] = useState<SupplierTypeRow[]>([]);
  const [_loadingSupplierTypes, setLoadingSupplierTypes] = useState(false);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [locations, setLocations] = useState<WarehouseLocationRow[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const [locationForm] = Form.useForm();
  const [pendingLocationName, setPendingLocationName] = useState<string | null>(null);

  const baseUnitId = item?.unit?.id ?? (item as any)?.unitId ?? null;
  // ✅ estados “vivos” (no dependen del row prop que se queda viejo)
  const [defaultSupplierId, setDefaultSupplierId] = useState<number | null>(null);
  const [defaultLastCost, setDefaultLastCost] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const hydratedRef = useRef<{ openKey: string | null }>({ openKey: null });

  const watchStandard = Form.useWatch("standardCost", form);
  const watchName = Form.useWatch("name", form);
  const watchCode = Form.useWatch("code", form);
  const watchContent = Form.useWatch("contentInBaseUnit", form);
  const watchUnit = Form.useWatch("presentationUnitId", form);
  const autoCodeRef = useRef<string | null>(null);
  const standardCostFallback =
    watchStandard === "" || watchStandard === undefined || watchStandard === null
      ? null
      : Number(watchStandard);
  const canGoNext =
    !!watchName &&
    String(watchName).trim().length > 0 &&
    !!watchCode &&
    String(watchCode).trim().length > 0 &&
    watchUnit !== undefined &&
    watchUnit !== null &&
    watchContent !== undefined &&
    watchContent !== null &&
    Number(watchContent) > 0;

  const unitOptions = useMemo(
    () => units.map((u) => ({ label: `${u.code} — ${u.name}`, value: u.id })),
    [units]
  );

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ label: s.name, value: s.id })),
    [suppliers]
  );
  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        label: w.name ? `${w.code ?? ""} ${w.name}`.trim() : w.code ?? `Almacén #${w.id}`,
        value: w.id,
      })),
    [warehouses]
  );
  const locationOptions = useMemo(() => {
    const whMap = new Map<number, WarehouseRow>();
    warehouses.forEach((w) => whMap.set(Number(w.id), w));
    return locations.map((loc) => {
      const wh = loc.warehouseId ? whMap.get(Number(loc.warehouseId)) : null;
      const whLabel = wh?.name ?? wh?.code ?? `Almacén #${loc.warehouseId}`;
      return {
        label: whLabel ? `${whLabel} / ${loc.name}` : loc.name,
        value: loc.id,
        warehouseId: loc.warehouseId,
      };
    });
  }, [locations, warehouses]);

  async function loadSuppliers() {
    setLoadingSuppliers(true);
    try {
      const s = await listSuppliers(restaurantId);
      setSuppliers(s || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando proveedores");
    } finally {
      setLoadingSuppliers(false);
    }
  }

  async function loadSupplierTypes() {
    setLoadingSupplierTypes(true);
    try {
      const t = await listSupplierTypes();
      setSupplierTypes(t || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando tipos de proveedor");
    } finally {
      setLoadingSupplierTypes(false);
    }
  }

  async function loadWarehouses() {
    setLoadingWarehouses(true);
    try {
      const w = await listWarehouses(restaurantId);
      setWarehouses(w || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando almacenes");
    } finally {
      setLoadingWarehouses(false);
    }
  }

  async function loadLocations() {
    setLoadingLocations(true);
    try {
      const locs = await listWarehouseLocations(restaurantId);
      setLocations(locs || []);
    } catch (e: any) {
      message.error(e?.message ?? "Error cargando ubicaciones");
    } finally {
      setLoadingLocations(false);
    }
  }

  function buildCode(nameValue: string) {
    const slug = (nameValue || "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 20)
      .toUpperCase();
    const prefix = item?.code ? `${item.code}-` : "";
    return (prefix + (slug || "PRES")).replace(/--+/g, "-");
  }

  useEffect(() => {
    if (!open) {
      hydratedRef.current.openKey = null;
      return;
    }

    const key = row?.id ? `edit-${row.id}` : "new";
    if (hydratedRef.current.openKey === key) return;
    hydratedRef.current.openKey = key;

    setCurrentStep(0);

    loadSuppliers();
    loadSupplierTypes();
    loadWarehouses();
    loadLocations();

    const d = row?.detail ?? null;

    const initialCode = row?.code ?? buildCode(row?.name ?? item?.name ?? "");

    form.setFieldsValue({
      name: row?.name ?? "",
      code: initialCode ?? "",
      contentInBaseUnit: row?.contentInBaseUnit ?? null,
      presentationUnitId: row?.presentationUnitId ?? baseUnitId,
      isDefaultPurchase:
        row?.isDefaultPurchase === true ? true : !row?.id && isFirstPresentation === true,

      supplierId: d?.supplierId ?? d?.supplier?.id ?? null,
      standardCost: d?.standardCost ?? null,
      tax1Rate: d?.tax1Rate ?? null,
      autoDecrementOnUse: d?.autoDecrementOnUse ?? false,
      useScale: d?.useScale ?? false,
      locationId: d?.locationId ?? null,
      detailStatusActive: row?.id ? (d?.status ?? 1) === 1 : true,
    });

    // ✅ inicializa default supplier desde detail
    setDefaultSupplierId(d?.supplierId ?? d?.supplier?.id ?? null);
    setDefaultLastCost(null); // lo pondrá SuppliersTab con onDefaultLastCost

    if (!d?.locationId && d?.location) {
      setPendingLocationName(d.location);
    }
  }, [open, row?.id, restaurantId, form, isFirstPresentation, baseUnitId]);

  useEffect(() => {
    if (!pendingLocationName || locations.length === 0) return;
    const current = form.getFieldValue("locationId");
    if (current !== null && current !== undefined) {
      setPendingLocationName(null);
      return;
    }
    const normalized = pendingLocationName.trim().toLowerCase();
    const match = locations.find((loc) => loc.name?.trim().toLowerCase() === normalized);
    if (match?.id) {
      form.setFieldsValue({ locationId: match.id });
      setPendingLocationName(null);
    }
  }, [pendingLocationName, locations, form]);

  async function handleSupplierCreated(s?: SupplierRow) {
    await loadSuppliers();
    await loadSupplierTypes();
    if (s?.id) {
      form.setFieldsValue({ supplierId: s.id });
      setDefaultSupplierId(s.id);
      setDefaultLastCost(null);
      message.success("Proveedor creado y seleccionado como default");
    }
  }

  function handleOpenLocationModal() {
    locationForm.resetFields();
    locationForm.setFieldsValue({ warehouseId: warehouses[0]?.id ?? null, name: "" });
    setLocationModalOpen(true);
  }

  async function handleCreateLocation() {
    const v = await locationForm.validateFields();
    setLocationSaving(true);
    try {
      const created = await upsertWarehouseLocation(restaurantId, {
        warehouseId: v.warehouseId,
        name: v.name,
        parentId: null,
        isActive: true,
      });
      message.success("Ubicación creada");
      await loadLocations();
      form.setFieldsValue({ locationId: created.id });
      setLocationModalOpen(false);
    } catch (e: any) {
      message.error(e?.message ?? "Error creando ubicación");
    } finally {
      setLocationSaving(false);
    }
  }

  useEffect(() => {
    if (row?.id) return; // no sobreescribir códigos existentes en edición
    const nameValue = watchName ?? "";
    if (!nameValue.trim()) return;

    const generated = buildCode(nameValue);
    const current = form.getFieldValue("code");

    // Solo sobreescribir si el usuario no lo cambió manualmente (lo comparamos contra último auto)
    if (!current || current === autoCodeRef.current || current === item?.code) {
      form.setFieldsValue({ code: generated });
      autoCodeRef.current = generated;
    }
  }, [watchName, row?.id, form, item?.code]);

  // Autoselecciona proveedor si solo hay uno y aún no hay valor
  useEffect(() => {
    if (!open) return;
    if (suppliers.length !== 1) return;
    const only = suppliers[0];
    const current = form.getFieldValue("supplierId");
    if (only?.id && (current === null || current === undefined)) {
      form.setFieldsValue({ supplierId: only.id });
      setDefaultSupplierId(only.id);
    }
  }, [open, suppliers, form]);

  // Autoselecciona ubicación si solo hay una y el campo está vacío
  useEffect(() => {
    if (!open) return;
    if (locations.length !== 1) return;
    const only = locations[0];
    const current = form.getFieldValue("locationId");
    if (only?.id && (current === null || current === undefined)) {
      form.setFieldsValue({ locationId: only.id });
    }
  }, [open, locations, form]);

  async function submit() {
    let v: any;
    try {
      v = await form.validateFields();
    } catch (err: any) {
      const firstField = err?.errorFields?.[0]?.name as (string | number)[] | undefined;
      const key = firstField?.[0];
      if (key) {
        const step0Fields = new Set(["name", "contentInBaseUnit", "presentationUnitId", "code"]);
        setCurrentStep(step0Fields.has(String(key)) ? 0 : 1);
      }
      if (firstField) {
        form.scrollToField(firstField, { behavior: "smooth", block: "center" });
      }
      return;
    }

    const nameValue = String(v.name ?? "").trim();
    const contentValue =
      v.contentInBaseUnit === null || v.contentInBaseUnit === undefined
        ? null
        : Number(v.contentInBaseUnit);

    const presentationUnitId = v.presentationUnitId ?? baseUnitId;
    if (!presentationUnitId) {
      message.warning("Selecciona la unidad de la presentación.");
      return;
    }

    if (!nameValue) {
      message.warning("Escribe el nombre de la presentación.");
      return;
    }

    if (contentValue === null || Number.isNaN(contentValue)) {
      message.warning("Indica el contenido en unidad base.");
      return;
    }

    setSaving(true);

    try {
      const saved = await upsertInventoryPresentation(restaurantId, {
        id: row?.id,
        inventoryItemId: item.id,
        code: v.code || undefined,
        presentationLabel: row?.presentationLabel ?? nameValue,
        name: nameValue,
        contentInBaseUnit: contentValue,
        presentationUnitId,
        isDefaultPurchase: v.isDefaultPurchase === true,
      });

      const presentationId = saved.id ?? row?.id;
      if (!presentationId) throw new Error("No se pudo guardar la presentación.");

      const tax1 =
        v.tax1Rate === "" || v.tax1Rate === undefined || v.tax1Rate === null
          ? null
          : Number(v.tax1Rate);
      const taxIndicator = tax1 === null ? null : tax1 === 0 ? "EX" : "IV";
      const selectedLocation = locations.find((l) => l.id === v.locationId);

      await upsertInventoryPresentationDetail(restaurantId, presentationId, {
        supplierId: v.supplierId ?? null,
        standardCost: v.standardCost ?? null,
        tax1Rate: tax1,
        tax2Rate: null,
        tax3Rate: null,
        taxIndicator,
        autoDecrementOnUse: v.autoDecrementOnUse ?? false,
        useScale: v.useScale ?? false,
        locationId: v.locationId ?? null,
        location: selectedLocation?.name ?? null,
        status: v.detailStatusActive ? 1 : 0,
      });

      message.success(row?.id ? "Presentación actualizada" : "Presentación creada");
      onSaved();
      onClose();
    } catch (e: any) {
      message.error(e?.message ?? "Error guardando cambios");
    } finally {
      setSaving(false);
    }
  }

  const stepItems = [
    { key: "general", title: "Datos básicos", description: "Nombre y contenido" },
    { key: "costos", title: "Proveedor y costos", description: "Default y estándar" },
  ];
  const lastStepIndex = stepItems.length - 1;

  async function handleNext() {
    try {
      if (currentStep === 0) {
        await form.validateFields(["name", "contentInBaseUnit"]);
      }
      setCurrentStep((s) => Math.min(s + 1, lastStepIndex));
    } catch {
      // validation errors are shown by antd
    }
  }

  function handlePrev() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  const isLastStep = currentStep === lastStepIndex;

  return (
    <>
      <SupplierFormModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onSaved={(s) => {
          setSupplierModalOpen(false);
          handleSupplierCreated(s);
        }}
        restaurantId={restaurantId}
        supplier={null}
        supplierTypes={supplierTypes}
        onRefreshTypes={loadSupplierTypes}
      />

      <Modal
        title="Agregar ubicación de almacén"
        open={locationModalOpen}
        onCancel={() => setLocationModalOpen(false)}
        onOk={handleCreateLocation}
        confirmLoading={locationSaving}
        destroyOnClose
      >
        <Form layout="vertical" form={locationForm}>
          <Form.Item
            label="Almacén"
            name="warehouseId"
            rules={[{ required: true, message: "Selecciona el almacén" }]}
          >
            <Select
              options={warehouseOptions}
              loading={loadingWarehouses}
              placeholder="Selecciona almacén"
            />
          </Form.Item>
          <Form.Item
            label="Nombre de ubicación"
            name="name"
            rules={[{ required: true, message: "Escribe el nombre de la ubicación" }]}
          >
            <Input placeholder="Ej: Secos / Estante B2" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={row?.id ? `Editar presentación — ${row.name}` : "Nueva presentación"}
        open={open}
        onCancel={onClose}
        destroyOnClose
        width={780}
        footer={
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>Cancelar</Button>
            {currentStep > 0 ? <Button onClick={handlePrev}>Anterior</Button> : null}
            <Button
              type="primary"
              loading={saving}
              disabled={!isLastStep && !canGoNext}
              onClick={isLastStep ? submit : handleNext}
            >
              {isLastStep ? "Guardar cambios" : "Siguiente"}
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" form={form} scrollToFirstError>
          <Steps current={currentStep} items={stepItems} size="small" style={{ marginBottom: 16 }} />

          {/* Paso 1: siempre montado, visible solo en paso 0 */}
          <div style={{ display: currentStep === 0 ? "block" : "none" }}>
            {/* Campo oculto para mantener el código autogenerado en el form */}
            <Form.Item name="code" hidden>
              <Input />
            </Form.Item>
            <GeneralTab form={form} item={item} unitOptions={unitOptions} />
          </div>

          {/* Paso 2: siempre montado, visible solo en paso 1 */}
          <div
            style={{
              display: currentStep === 1 ? "flex" : "none",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <DetailsTab
              form={form}
              supplierOptions={supplierOptions}
              loadingSuppliers={loadingSuppliers}
              locationOptions={locationOptions}
              loadingLocations={loadingLocations}
              defaultSupplierId={defaultSupplierId}
              defaultLastCost={defaultLastCost}
              onUseLastCost={() => {
                if (defaultLastCost == null) return;
                form.setFieldsValue({ standardCost: defaultLastCost });
                message.success("Costo estándar actualizado con el último costo del proveedor default");
              }}
              onCreateSupplier={() => setSupplierModalOpen(true)}
              onCreateLocation={handleOpenLocationModal}
            />

            {row?.id ? (
              <SuppliersTab
                restaurantId={restaurantId}
                presentationId={row.id}
                supplierOptions={supplierOptions}
                loadingSuppliers={loadingSuppliers}
                defaultSupplierId={defaultSupplierId}
                standardCostFallback={standardCostFallback}
                onDefaultLastCost={(lc) => setDefaultLastCost(lc)}
                onDefaultChanged={async (supplierId, lastCost) => {
                  if (!row?.id) return;

                  await upsertInventoryPresentationDetail(restaurantId, row.id, { supplierId });

                  // ✅ mantiene select en el form
                  form.setFieldsValue({ supplierId });

                  // ✅ estado local (para tags y lastCost)
                  setDefaultSupplierId(supplierId);
                  setDefaultLastCost(lastCost);

                  message.success("Proveedor default actualizado");
                }}
              />
            ) : (
              <div style={{ padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 8 }}>
                Guarda la presentación para agregar proveedores alternos y ver últimos costos.
              </div>
            )}
          </div>
        </Form>
      </Modal>
    </>
  );
}
