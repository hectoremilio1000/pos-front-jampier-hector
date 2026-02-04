import { useOutletContext } from "react-router-dom";
import type { InventariosOutletContext } from "../index";
import InventoryItemsTab from "./InventoryItemsTab";

export default function ItemsPage() {
  const { restaurant } = useOutletContext<InventariosOutletContext>();
  return <InventoryItemsTab restaurantId={restaurant.id} />;
}
