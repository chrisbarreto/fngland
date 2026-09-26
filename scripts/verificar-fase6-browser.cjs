const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");

const baseUrl = process.env.PHASE6_BASE_URL || "http://127.0.0.1:4321";
const expectedNames = [
  "Fórmula Essential",
  "Fórmula Plus",
  "Fórmula Black",
  "Plan Domicilio",
];
const legacyNames = ["Plan Fórmula", "Plan Premium", "Plan Gold"];

async function validatePage(browser, path, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });

  const cards = page.locator(".pricing-card");
  assert.equal(await cards.count(), 4, `${path}: deben existir cuatro tarjetas`);
  const cardText = await cards.allInnerTexts();
  for (const name of expectedNames) {
    assert(cardText.some((text) => text.includes(name)), `${path}: falta ${name}`);
  }
  for (const legacyName of legacyNames) {
    assert(
      !cardText.some((text) => text.includes(legacyName)),
      `${path}: no debe ofrecer ${legacyName}`,
    );
  }

  const fullText = await page.locator("body").innerText();
  assert(fullText.includes("Lavados ilimitados"), `${path}: Black debe decir ilimitados`);
  assert(!/3\s+(reservas|lavados).*semana/i.test(fullText), `${path}: expone el límite semanal interno`);
  assert(!/12\s+(reservas|lavados).*mes/i.test(fullText), `${path}: expone el límite mensual interno`);

  const width = await page.evaluate(() => ({
    inner: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  assert(width.scroll <= width.inner, `${path}: desborde horizontal ${width.scroll}/${width.inner}`);

  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const response = await fetch(`${baseUrl}/api/planes`);
    assert.equal(response.status, 200, "GET /api/planes debe responder 200");
    const available = await response.json();
    assert(Array.isArray(available), "GET /api/planes debe devolver un arreglo");
    assert.deepEqual(
      available.map((plan) => plan.nombre).sort(),
      ["Essential — Gs. 200.000", "PLAN  LAVADO A DOMICILIO 500.000"].sort(),
      "En pre-lanzamiento solo Essential y Domicilio deben estar vigentes",
    );
    assert(available.every((plan) => plan.activo === true && plan.vigenciaComercial === "VIGENTE"));

    await validatePage(browser, "/", { width: 1440, height: 1000 });
    await validatePage(browser, "/membresia", { width: 1440, height: 1000 });
    await validatePage(browser, "/", { width: 390, height: 844 });
    await validatePage(browser, "/membresia", { width: 390, height: 844 });

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${baseUrl}/membresia`, { waitUntil: "domcontentloaded" });
    await page.locator(".pricing-card").filter({ hasText: "Fórmula Essential" }).locator("button[data-plan-id]").click();
    await page.locator("#registro-modal").waitFor({ state: "visible" });
    assert((await page.locator("#modal-plan-name").innerText()).includes("Fórmula Essential"));
    assert((await page.locator("#modal-plan-price").innerText()).includes("200.000"));
    await page.locator("#modal-close").click();

    await page.locator(".pricing-card").filter({ hasText: "Fórmula Plus" }).locator("button[data-plan-id]").click();
    await page.locator("#registro-modal").waitFor({ state: "visible" });
    assert((await page.locator("#modal-plan-name").innerText()).includes("Fórmula Plus"));
    assert(!available.some((plan) => plan.nombre.includes("Plus")), "Plus cerrado no debe aparecer en /api/planes");
    await page.close();

    console.log(JSON.stringify({ status: "PASS", pages: 4, availablePlans: available.length }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});