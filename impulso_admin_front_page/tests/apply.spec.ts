import { test, expect, Page } from "@playwright/test";

const STEP_DELAY_MS = 600;

async function fillCurrentPageAnswers(page: Page, prefix: string) {
  const textareas = page.locator("form textarea");
  const count = await textareas.count();
  for (let i = 0; i < count; i += 1) {
    await textareas.nth(i).fill(`${prefix} respuesta ${i + 1}`);
  }
  await page.waitForTimeout(STEP_DELAY_MS);
}

async function fillExamAllPages(page: Page) {
  const pageInfo = page.getByText(/Página\s+\d+\s+de\s+\d+/);
  await expect(pageInfo).toBeVisible();

  const infoText = await pageInfo.textContent();
  const match = infoText?.match(/Página\s+(\d+)\s+de\s+(\d+)/);
  const pageCount = match ? Number(match[2]) : 1;

  for (let current = 1; current <= pageCount; current += 1) {
    await fillCurrentPageAnswers(page, `P${current}`);
    if (current < pageCount) {
      const nextBtn = page.getByRole("button", { name: /Siguiente/i });
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click();
      await expect(pageInfo).toHaveText(
        new RegExp(`Página\\s+${current + 1}\\s+de\\s+${pageCount}`)
      );
      await page.waitForTimeout(STEP_DELAY_MS);
    } else {
      const submitBtn = page.getByRole("button", {
        name: /Enviar examen completo/i,
      });
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      await page.waitForTimeout(STEP_DELAY_MS);
    }
  }
}

test("apply wizard completes and submits exams", async ({ page }) => {
  await page.goto("/apply/1");
  await page.waitForTimeout(STEP_DELAY_MS);

  await page.getByLabel("Nombre", { exact: true }).nth(0).fill("Juan");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Apellidos").fill("Perez");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Teléfono", { exact: true }).nth(0).fill("5555555555");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Empresa").fill("Empresa Demo");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Puesto", { exact: true }).nth(1).fill("Mesero");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Nombre", { exact: true }).nth(1).fill("Ref Uno");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Teléfono", { exact: true }).nth(1).fill("5555555556");
  await page.waitForTimeout(STEP_DELAY_MS);
  await page.getByLabel("Relación").fill("Jefe");
  await page.waitForTimeout(STEP_DELAY_MS);

  const applyPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/public/apply-full") &&
      resp.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page
    .getByRole("button", { name: /Continuar al psicométrico/i })
    .click();
  await page.waitForTimeout(STEP_DELAY_MS);

  const applyResp = await applyPromise;
  expect(applyResp.ok(), "Apply API did not return 2xx").toBeTruthy();

  await expect(page).toHaveURL(/\/apply\/2$/, { timeout: 30_000 });
  const psychResp = await page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/public/psych-tests/") &&
      resp.request().method() === "GET",
    { timeout: 30_000 }
  );
  expect(psychResp.ok(), "Psych exam API did not return 2xx").toBeTruthy();
  await expect(
    page.getByRole("heading", { name: /Examen psicométrico/i })
  ).toBeVisible();

  await fillExamAllPages(page);

  await expect(page).toHaveURL(/\/apply\/3$/);
  await expect(
    page.getByRole("heading", { name: /Examen práctico/i })
  ).toBeVisible();
  await page.waitForTimeout(STEP_DELAY_MS);

  await fillExamAllPages(page);

  await expect(page).toHaveURL(/\/apply\/1$/);
});
