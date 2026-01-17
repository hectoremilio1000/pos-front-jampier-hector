import { AutoComplete, Spin } from "antd";
import { useEffect, useMemo, useState } from "react";
import type { InventoryPresentationRow } from "@/lib/api_inventory";
import { searchInventoryPresentations } from "@/lib/api_inventory";

type Props = {
  restaurantId: number;
  disabled?: boolean;
  placeholder?: string;
  selected?: InventoryPresentationRow | null;
  onSelectedClear?: () => void;
  onSelect: (p: InventoryPresentationRow) => void;
};

export default function PresentationSearchAny({
  restaurantId,
  disabled,
  placeholder = "Buscar presentación (ej. coca, carne, queso...)",
  selected,
  onSelectedClear,
  onSelect,
}: Props) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InventoryPresentationRow[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (disabled) return;
    if (selected) return;

    const query = q.trim();
    if (query.length === 1) {
      setRows([]);
      setDropdownOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchInventoryPresentations(restaurantId, query || undefined);
        const list = res || [];
        setRows(list);
        setDropdownOpen(list.length > 0);
      } catch {
        setRows([]);
        setDropdownOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, restaurantId, disabled]);

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
