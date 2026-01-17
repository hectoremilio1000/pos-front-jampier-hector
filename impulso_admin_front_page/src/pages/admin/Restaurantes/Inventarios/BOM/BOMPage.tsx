import { Tabs } from "antd";
import type { TabsProps } from "antd";
import RecipesPage from "./RecipesPage";
import PrintAreaWarehouseMapsPage from "./PrintAreaWarehouseMapsPage";
import ExternalRefsPage from "./ExternalRefsPage";

export default function InventoryBOMPage() {
  const items: TabsProps["items"] = [
    { key: "recipes", label: "Recetas", children: <RecipesPage /> },
    { key: "maps", label: "Mapeo print areas", children: <PrintAreaWarehouseMapsPage /> },
    { key: "refs", label: "External refs", children: <ExternalRefsPage /> },
  ];

  return <Tabs items={items} />;
}
