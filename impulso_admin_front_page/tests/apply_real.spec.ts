import { test, expect, Page } from "@playwright/test";

const STEP_DELAY_MS = 500;
const PAGE_SIZE = 10;

function psychAnswer(idx: number) {
  return [
    `Situación: En un turno con alta demanda tuve un conflicto interno (ejemplo #${idx}).`,
    "Acción: Me acerqué con calma, escuché a cada parte, definí una prioridad clara y pedí confirmación.",
    "Resultado: El servicio se estabilizó, evitamos errores y el equipo retomó el ritmo.",
  ].join("\n");
}

function practicalAnswer(idx: number) {
  return [
    `Paso 1: Diagnostico rápido del contexto (caso #${idx}).`,
    "Paso 2: Ejecuto el protocolo correcto con comunicación clara al cliente.",
    "Paso 3: Verifico con cocina/bar y confirmo tiempos.",
    "Paso 4: Hago seguimiento y cierro con cortesía.",
  ].join("\n");
}

async function fillCurrentPageAnswers(
  page: Page,
  current: number,
  mode: "psych" | "practical"
) {
  const textareas = page.locator("form textarea");
  const count = await textareas.count();
  for (let i = 0; i < count; i += 1) {
    const globalIndex = (current - 1) * PAGE_SIZE + i + 1;
    const answer =
      mode === "psych"
        ? psychAnswer(globalIndex)
        : practicalAnswer(globalIndex);
    await textareas.nth(i).fill(answer);
  }
  await page.waitForTimeout(STEP_DELAY_MS);
}

async function fillExamAllPages(page: Page, mode: "psych" | "practical") {
  const pageInfo = page.getByText(/Página\s+\d+\s+de\s+\d+/);
  await expect(pageInfo).toBeVisible();

  const infoText = await pageInfo.textContent();
  const match = infoText?.match(/Página\s+(\d+)\s+de\s+(\d+)/);
  const pageCount = match ? Number(match[2]) : 1;

  for (let current = 1; current <= pageCount; current += 1) {
    await fillCurrentPageAnswers(page, current, mode);
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

test("apply wizard completes with realistic answers", async ({ page }) => {
  await page.goto("/apply/1");
  await page.waitForTimeout(STEP_DELAY_MS);

  await page.getByLabel("Nombre", { exact: true }).nth(0).fill("Carlos");
  await page.getByLabel("Apellidos").fill("Ramirez");
  await page.getByLabel("Teléfono", { exact: true }).nth(0).fill("5555557777");
  await page.getByLabel("Empresa").fill("Restaurante Demo");
  await page.getByLabel("Puesto", { exact: true }).nth(1).fill("Mesero");
  await page.getByLabel("Nombre", { exact: true }).nth(1).fill("Ref Uno");
  await page.getByLabel("Teléfono", { exact: true }).nth(1).fill("5555557778");
  await page.getByLabel("Relación").fill("Jefe");

  const applyPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/public/apply-full") &&
      resp.request().method() === "POST",
    { timeout: 30_000 }
  );
  await page
    .getByRole("button", { name: /Continuar al psicométrico/i })
    .click();

  const applyResp = await applyPromise;
  expect(applyResp.ok(), "Apply API did not return 2xx").toBeTruthy();

  await expect(page).toHaveURL(/\/apply\/2$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Examen psicométrico/i })
  ).toBeVisible();

  await fillExamAllPages(page, "psych");

  await expect(page).toHaveURL(/\/apply\/3$/);
  await expect(
    page.getByRole("heading", { name: /Examen práctico/i })
  ).toBeVisible();

  await fillExamAllPages(page, "practical");

  await expect(page).toHaveURL(/\/apply\/1$/);
});
