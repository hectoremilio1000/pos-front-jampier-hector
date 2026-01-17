import { test, expect, Page } from "@playwright/test";

const STEP_DELAY_MS = 350;
const PAGE_SIZE = 10;

type CandidateProfile = "excellent" | "rude";

function excellentPsychAnswer(question: string, idx: number) {
  const q = question.toLowerCase();

  if (q.includes("conflicto") || q.includes("discutieron") || q.includes("equipo")) {
    return [
      "Situación: Dos compañeros discutieron en plena hora pico.",
      "Acción: Separé a cada uno, escuché por separado y definí la prioridad del servicio.",
      "Resultado: Bajó la tensión y el flujo de mesas se normalizó.",
    ].join("\n");
  }

  if (q.includes("cliente") && q.includes("poca educación")) {
    return [
      "Situación: Cliente habló de forma grosera por un retraso.",
      "Acción: Mantuve calma, pedí disculpas y expliqué tiempos reales.",
      "Resultado: El cliente aceptó la solución y evitamos quejas.",
    ].join("\n");
  }

  if (q.includes("venta") || q.includes("recomendando")) {
    return [
      "Situación: Mesa indecisa con ticket bajo.",
      "Acción: Ofrecí 2 sugerencias concretas según preferencias y presupuesto.",
      "Resultado: Subió el ticket sin presión y el cliente quedó satisfecho.",
    ].join("\n");
  }

  if (q.includes("puntualidad") || q.includes("llegas") || q.includes("montado")) {
    return [
      "Situación: Llegué y la estación no estaba montada.",
      "Acción: Organicé rápido lo crítico, pedí apoyo y avisé al capitán.",
      "Resultado: Estación lista antes de la primera tanda de mesas.",
    ].join("\n");
  }

  if (q.includes("cansado") || q.includes("estrés") || q.includes("presión")) {
    return [
      "Situación: Turno largo con alta presión.",
      "Acción: Priorizo tareas, respiro, y pido apoyo cuando es necesario.",
      "Resultado: Mantengo calidad y evito errores en servicio.",
    ].join("\n");
  }

  if (q.includes("feedback") || q.includes("corrige")) {
    return [
      "Situación: Un supervisor me corrigió frente al equipo.",
      "Acción: Escuché, pedí aclaración después del rush y ajusté el proceso.",
      "Resultado: Mejoré tiempos y evitamos repetir el error.",
    ].join("\n");
  }

  if (q.includes("error") && q.includes("cuenta")) {
    return [
      "Situación: Detecté un error en la cuenta.",
      "Acción: Recalculé, expliqué al cliente y actualicé la comanda.",
      "Resultado: Se cerró sin conflicto y con confianza.",
    ].join("\n");
  }

  return [
    "Situación: En servicio con prioridades múltiples.",
    "Acción: Definí orden, comuniqué tiempos y mantuve seguimiento.",
    "Resultado: Servicio estable y clientes satisfechos.",
    `Detalle: ${idx}.`,
  ].join("\n");
}

function rudePsychAnswer(question: string) {
  return [
    "No me meto en problemas de otros.",
    "Si se enojan, que lo arreglen ellos.",
    `No tengo tiempo para eso: ${question.slice(0, 40)}.`,
  ].join(" ");
}

function excellentPracticalAnswer(question: string, idx: number) {
  const q = question.toLowerCase();

  if (q.includes("secuencia ideal")) {
    return [
      "Paso 1: Saludo, asigno mesa y ofrezco agua en 1-2 min.",
      "Paso 2: Presento menú y explico specials; tomo orden con confirmación.",
      "Paso 3: Envío comanda con modificaciones y hago check-back a 2-3 min.",
      "Paso 4: Refuerzo bebidas y sugerencias; mantengo tiempos.",
      "Paso 5: Ofrezco postre/café y cierro cuenta verificando pago.",
    ].join("\n");
  }

  if (q.includes("comanda")) {
    return [
      "Paso 1: Escribo mesa, hora y número de personas.",
      "Paso 2: Registro platillos por orden de entrada/salida.",
      "Paso 3: Detallo modificaciones, alergias y términos.",
      "Paso 4: Confirmo con cocina y sello/firmo.",
    ].join("\n");
  }

  if (q.includes("platillo") && q.includes("no está como lo pedí")) {
    return [
      "Paso 1: Escucho sin discutir y pido disculpas.",
      "Paso 2: Verifico comanda y confirmo con cocina.",
      "Paso 3: Ofrezco reposición o ajuste según política.",
      "Paso 4: Doy seguimiento y actualizo al capitán.",
    ].join("\n");
  }

  if (q.includes("recomendarías")) {
    return [
      "Paso 1: Pregunto preferencias y presupuesto.",
      "Paso 2: Sugiero 2-3 platillos con razones (sabor, porción, maridaje).",
      "Paso 3: Recomiendo bebida que complemente.",
      "Paso 4: Confirmo sin presión y respeto decisión.",
    ].join("\n");
  }

  if (q.includes("cuenta")) {
    return [
      "Paso 1: Reviso cuenta vs comanda.",
      "Paso 2: Confirmo si es dividida o conjunta.",
      "Paso 3: Presento ticket y explico cargos.",
      "Paso 4: Cobro y agradezco.",
    ].join("\n");
  }

  if (q.includes("impaciente") || q.includes("levanta la voz")) {
    return [
      "Paso 1: Mantengo calma y escucho.",
      "Paso 2: Aislo conflicto para no afectar sala.",
      "Paso 3: Propongo solución concreta y tiempos.",
      "Paso 4: Informo al capitán si escala.",
    ].join("\n");
  }

  return [
    "Paso 1: Escuchar y confirmar necesidad.",
    "Paso 2: Ejecutar protocolo con tiempos claros.",
    "Paso 3: Coordinar con cocina/bar.",
    `Paso 4: Seguimiento y cierre. (${idx})`,
  ].join("\n");
}

function rudePracticalAnswer(question: string) {
  return [
    "Que espere, estoy ocupado.",
    "Si no le gusta, que se vaya.",
    `No hago detalles: ${question.slice(0, 40)}.`,
  ].join(" ");
}

async function fillCurrentPageAnswers(
  page: Page,
  current: number,
  mode: "psych" | "practical",
  profile: CandidateProfile
) {
  const labels = page.locator(".ant-form-item-label label");
  const textareas = page.locator("form textarea");
  const count = await textareas.count();
  for (let i = 0; i < count; i += 1) {
    const globalIndex = (current - 1) * PAGE_SIZE + i + 1;
    const question = await labels.nth(i).innerText();
    const answer =
      mode === "psych"
        ? profile === "excellent"
          ? excellentPsychAnswer(question, globalIndex)
          : rudePsychAnswer(question)
        : profile === "excellent"
        ? excellentPracticalAnswer(question, globalIndex)
        : rudePracticalAnswer(question);
    await textareas.nth(i).fill(answer);
  }
  await page.waitForTimeout(STEP_DELAY_MS);
}

async function fillExamAllPages(
  page: Page,
  mode: "psych" | "practical",
  profile: CandidateProfile
) {
  const pageInfo = page.getByText(/Página\s+\d+\s+de\s+\d+/);
  await expect(pageInfo).toBeVisible();

  const infoText = await pageInfo.textContent();
  const match = infoText?.match(/Página\s+(\d+)\s+de\s+(\d+)/);
  const pageCount = match ? Number(match[2]) : 1;

  for (let current = 1; current <= pageCount; current += 1) {
    await fillCurrentPageAnswers(page, current, mode, profile);
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

async function runFlow(page: Page, profile: CandidateProfile) {
  await page.goto("/apply/1");
  await page.waitForTimeout(STEP_DELAY_MS);

  const firstName = profile === "excellent" ? "Luis" : "Bruno";
  const lastName = profile === "excellent" ? "Excelente" : "Grosero";
  const phone = profile === "excellent" ? "5555558881" : "5555558882";
  const refPhone = profile === "excellent" ? "5555558883" : "5555558884";

  await page.getByLabel("Nombre", { exact: true }).nth(0).fill(firstName);
  await page.getByLabel("Apellidos").fill(lastName);
  await page.getByLabel("Teléfono", { exact: true }).nth(0).fill(phone);
  await page.getByLabel("Empresa").fill("Restaurante Demo");
  await page.getByLabel("Puesto", { exact: true }).nth(1).fill("Mesero");
  await page.getByLabel("Nombre", { exact: true }).nth(1).fill("Ref Uno");
  await page.getByLabel("Teléfono", { exact: true }).nth(1).fill(refPhone);
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

  await fillExamAllPages(page, "psych", profile);

  await expect(page).toHaveURL(/\/apply\/3$/);
  await expect(
    page.getByRole("heading", { name: /Examen práctico/i })
  ).toBeVisible();

  await fillExamAllPages(page, "practical", profile);

  await expect(page).toHaveURL(/\/apply\/1$/);
}

test("compare excellent waiter vs rude waiter", async ({ page }) => {
  await runFlow(page, "excellent");
  await runFlow(page, "rude");
});
