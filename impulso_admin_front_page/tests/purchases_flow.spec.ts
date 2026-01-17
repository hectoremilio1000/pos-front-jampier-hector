import { test, expect, Page } from "@playwright/test";

const BASE_PATH = "/admin/restaurantes/la-llorona/inventario/compras";
const API_PATTERNS = ["/purchase-runs", "/stock-requests", "/purchase-orders"];

function trackApiErrors(page: Page) {
  const errors: Array<{ url: string; status: number; body?: string }> = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!API_PATTERNS.some((p) => url.includes(p))) return;
    const status = res.status();
    if (status < 400) return;
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    errors.push({ url, status, body });
  });
  return errors;
}

async function gotoRuns(page: Page) {
  await page.goto(`${BASE_PATH}/viajes`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Nuevo surtido" })).toBeVisible();
}

async function openRunCreateModal(page: Page) {
  await page.getByRole("button", { name: "Nuevo surtido" }).click();
  const originModal = page.locator(".ant-modal-content").last();
  await expect(originModal).toBeVisible();
  await originModal.getByRole("button", { name: "Nuevo viaje" }).click();
  const runModal = page.locator(".ant-modal-content").last();
  await expect(runModal).toBeVisible();
  return runModal;
}

async function selectFirstOption(page: Page) {
  const dropdown = page.locator(".ant-select-dropdown").last();
  await expect(dropdown).toBeVisible({ timeout: 10_000 });
  const options = dropdown.locator(".ant-select-item-option");
  await expect(options.first()).toBeVisible({ timeout: 10_000 });
  await options.first().evaluate((el: HTMLElement) => el.click());
}

async function createRun(page: Page, title: string, typeLabel?: string | RegExp) {
  await gotoRuns(page);
  const runModal = await openRunCreateModal(page);
  await runModal.getByPlaceholder("Compras Lunes").fill(title);
  if (typeLabel) {
    const typeItem = runModal.locator(".ant-form-item", { hasText: "Tipo de viaje" });
    await typeItem.locator(".ant-select-selector").click({ force: true });
    const dropdown = page.locator(".ant-select-dropdown").last();
    await dropdown.getByRole("option", { name: typeLabel }).click({ force: true });
  }
  await runModal.getByRole("button", { name: "Crear" }).click();
  await page.waitForURL(/\/compras\/viajes\/\d+$/);
  await expect(page.getByRole("button", { name: "Agregar lista" })).toBeVisible();
}

async function addStockRequest(page: Page, areaLabel: string) {
  await page.getByRole("button", { name: "Agregar lista" }).click();
  const choiceModal = page.locator(".ant-modal-content").last();
  await expect(choiceModal).toBeVisible();
  await choiceModal.getByRole("button", { name: /Pedido al almac/i }).click();

  const drawer = page.locator(".ant-drawer-content").last();
  await expect(drawer).toBeVisible();
  const areaItem = drawer.locator(".ant-form-item", { hasText: /rea solicitante/i });
  await areaItem.scrollIntoViewIfNeeded();
  await areaItem.locator(".ant-select-selector").click({ force: true });
  const dropdown = page.locator(".ant-select-dropdown").last();
  await expect(dropdown).toBeVisible();
  const option = dropdown.getByRole("option", { name: areaLabel });
  await option.scrollIntoViewIfNeeded();
  await option.evaluate((el: HTMLElement) => el.click());
  await drawer.getByRole("button", { name: "Guardar y agregar productos" }).click();

  const itemsDrawer = page.locator(".ant-drawer-content").last();
  await expect(itemsDrawer).toBeVisible();
  const autocomplete = itemsDrawer.locator(".ant-select-selector").first();
  await autocomplete.scrollIntoViewIfNeeded();
  await autocomplete.click({ force: true });
  await selectFirstOption(page);
  await itemsDrawer.getByPlaceholder("Cantidad").fill("2");
  await itemsDrawer.getByRole("button", { name: "Agregar" }).click();
  await expect(itemsDrawer.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 });
  await itemsDrawer.locator("button", { hasText: /^Cerrar$/ }).last().click();
}

async function addPurchaseOrderWithItems(page: Page) {
  await page.getByRole("button", { name: "Agregar lista" }).click();
  const choiceModal = page.locator(".ant-modal-content").last();
  await expect(choiceModal).toBeVisible();
  await choiceModal.getByRole("button", { name: "Compra a proveedor" }).click();

  const drawer = page.locator(".ant-drawer-content").last();
  await expect(drawer).toBeVisible();
  const supplierItem = drawer.locator(".ant-form-item", { hasText: "Proveedor" });
  await supplierItem.locator(".ant-select-selector").click({ force: true });
  await selectFirstOption(page);
  await drawer.getByRole("button", { name: "Guardar y agregar productos" }).click();

  const itemsDrawer = page.locator(".ant-drawer-content").last();
  await expect(itemsDrawer).toBeVisible();
  const autocomplete = itemsDrawer.locator(".ant-select-selector").first();
  await autocomplete.scrollIntoViewIfNeeded();
  await autocomplete.click({ force: true });
  await selectFirstOption(page);
  await itemsDrawer.getByPlaceholder("Cantidad").fill("1");
  await itemsDrawer.getByPlaceholder("Precio").fill("10");
  await itemsDrawer.getByRole("button", { name: "Agregar" }).click();
  await expect(itemsDrawer.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 });
  await itemsDrawer.locator("button", { hasText: /^Cerrar$/ }).last().click();
}

test.describe.serial("purchases flow", () => {
  test.beforeEach(async ({ page }) => {
    (page as any)._apiErrors = trackApiErrors(page);
  });

  test.afterEach(async ({ page }) => {
    const errors = (page as any)._apiErrors as Array<{ url: string; status: number; body?: string }>;
    expect(errors, `api errors: ${JSON.stringify(errors)}`).toEqual([]);
  });

  test("comisariato run with requests for Cocina/Barra/Piso and pdf snapshot", async ({ page }) => {
    test.setTimeout(240_000);
    const title = `Run comisariato ${Date.now()}`;
    await createRun(page, title);

    await addStockRequest(page, "Cocina");
    await addStockRequest(page, "Barra");
    await addStockRequest(page, "Piso");

    const section = page.getByRole("heading", { name: /Pedidos al almac/i });
    await expect(section).toBeVisible();
    const table = section.locator("xpath=following::table[1]");
    await expect(table).toBeVisible();
    await expect(table).toContainText("Cocina");
    await expect(table).toContainText("Barra");
    await expect(table).toContainText("Piso");

    try {
      await page.pdf({ path: "test-results/comisariato_run_snapshot.pdf", printBackground: true });
    } catch {
      await page.screenshot({
        path: "test-results/comisariato_run_snapshot.png",
        fullPage: true,
      });
    }
  });

  test("route run for central de abastos with multiple purchases and close run", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const title = `Ruta central abastos ${Date.now()}`;
    await createRun(page, title, /Ruta de proveedores/i);

    await addPurchaseOrderWithItems(page);
    await addPurchaseOrderWithItems(page);

    const ordersTable = page.locator("table").first();
    await expect(ordersTable.locator("tbody tr").first()).toBeVisible();

    await page.getByRole("button", { name: "Cerrar viaje" }).click();
    await expect(page.getByText("closed")).toBeVisible({ timeout: 10_000 });
  });

  test("comisariato then merced route with two suppliers and two products", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const comiTitle = `Comisariato ${Date.now()}`;
    await createRun(page, comiTitle);
    await addStockRequest(page, "Cocina");

    await gotoRuns(page);
    const mercedTitle = `Ruta merced ${Date.now()}`;
    await createRun(page, mercedTitle, /Ruta de proveedores/i);

    await addPurchaseOrderWithItems(page);
    await addPurchaseOrderWithItems(page);
  });
});
