// /src/pages/admin/Restaurantes/Inventarios/Purchases/OrderItems/PresentationSearch.tsx
import { AutoComplete, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { InventoryPresentationRow } from "@/lib/api_inventory";
import { searchInventoryPresentations } from "@/lib/api_inventory";

type Props = {
  restaurantId: number;
  supplierId?: number | null;
  disabled?: boolean;
  placeholder?: string;
  selected?: InventoryPresentationRow | null;
  onSelectedClear?: () => void;
  onSelect: (p: InventoryPresentationRow) => void;
};

export default function PresentationSearch({
  restaurantId,
  disabled,
  supplierId,
  placeholder = "Buscar presentación (ej. coca, carne, queso...)",
  selected,
  onSelectedClear,
  onSelect,
}: Props) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryPresentationRow[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ✅ Cargar sugerencias al abrir (q vacío) si hay proveedor
  useEffect(() => {
    if (disabled) return;
    if (selected) return;

    // si no hay proveedor, no mostramos nada
    if (!supplierId) {
      setRows([]);
      setDropdownOpen(false);
      return;
    }

    const query = q.trim();

    // ✅ regla:
    // - q vacío => trae "top" del proveedor
    // - q con 1 char => no hace request
    // - q >= 2 => busca normal
    if (query.length === 1) {
      setRows([]);
      setDropdownOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchInventoryPresentations(
          restaurantId,
          query || undefined, // vacío => top
          supplierId
        );

        const list = res || [];
        setRows(list);

        // ✅ si ya hay resultados, abre dropdown
        setDropdownOpen(list.length > 0);
      } catch {
        setRows([]);
        setDropdownOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, restaurantId, supplierId, disabled, selected]);

  const options = useMemo(
    () =>
      rows.map((p) => {
        const itemName = p.item?.name ? ` — ${p.item.name}` : "";
        const unit = p.presentationUnit?.code ? ` (${p.presentationUnit.code})` : "";
        return {
          value: String(p.id),
          label: `${p.name}${itemName}${unit}`,
          p,
        };
      }),
    [rows]
  );

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    const itemName = selected.item?.name ? ` — ${selected.item.name}` : "";
    const unit = selected.presentationUnit?.code ? ` (${selected.presentationUnit.code})` : "";
    return `${selected.name}${itemName}${unit}`;
  }, [selected]);

  const handleClear = () => {
    onSelectedClear?.();
    setQ("");
    setRows([]);
    setDropdownOpen(false);
  };

  return (
    <AutoComplete
      autoFocus
      open={selected ? false : dropdownOpen}
      onDropdownVisibleChange={setDropdownOpen}
      disabled={disabled}
      value={selected ? selectedLabel : q}
      allowClear
      onChange={(v) => {
        if (!v) {
          handleClear();
          return;
        }
        if (selected) {
          onSelectedClear?.();
        }
        setQ(v);
        // si el usuario borra, queremos volver a mostrar el "top"
        setDropdownOpen(true);
      }}
      options={options as any}
      onSelect={(_, opt: any) => {
        const p = opt?.p as InventoryPresentationRow | undefined;
        if (p) {
          onSelect(p);
          setQ("");
          setRows([]);
          setDropdownOpen(false);
        }
      }}
      placeholder={placeholder}
      style={{ width: "100%" }}
      notFoundContent={loading ? <Spin size="small" /> : null}
      filterOption={false}
    />
  );
}
