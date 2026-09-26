const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const baseUrl = process.env.PRICING_BASE_URL || "http://127.0.0.1:4321";
const expected = [
  ["Fórmula Essential", "Gs. 200.000", "Gs. 6.667"],
  ["Fórmula Plus", "Gs. 250.000", "Gs. 8.333"],
  ["Fórmula Black", "Gs. 300.000", "Gs. 10.000"],
  ["Plan Domicilio", "Gs. 500.000", "Gs. 16.667"],
  ["Plan Gold", "Gs. 400.000", null],
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const path of ["/", "/membresia"]) {
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 1181, height: 900 }, { width: 1180, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
        const page = await browser.newPage({ viewport });
        await page.goto(baseUrl + path, { waitUntil: "domcontentloaded" });
        const cards = page.locator("#planes .pricing-card");
        assert.equal(await cards.count(), 5, `${path}: deben verse cinco planes`);
        const footnote = await page.locator("#planes .planes-footnote").innerText();
        assert(footnote.includes("Las bonificaciones son para socios; están sujetas a coordinación y disponibilidad operativa durante el ciclo vigente."));
        for (let i = 0; i < expected.length; i++) {
          const card = cards.nth(i);
          const [name, monthly, daily] = expected[i];
          assert((await card.innerText()).includes(name));
          assert.equal(await card.locator(".pricing-service-section h4").innerText(), "Servicios incluidos");
          if (i < 3) {
            assert.equal(await card.locator(".pricing-bonuses h4").innerText(), "Bonificaciones sin costo adicional");
            assert.equal(await card.locator(".pricing-bonuses li").count(), i === 0 ? 2 : 3);
            assert.equal(await card.locator(".pricing-bonus-disclaimer").count(), 0);
            assert.equal(await card.locator(".pricing-offer .pricing-bonuses").count(), 0);
          } else if (i === 3) {
            assert.equal(await card.locator(".pricing-bonuses").count(), 0);
            assert((await card.locator(".pricing-term").innerText()).includes("1 mes"));
          } else {
            assert.equal(await card.locator(".pricing-bonuses h4").innerText(), "Bonificación sin costo adicional");
            assert((await card.locator(".pricing-service-section").innerText()).includes("nanocerámico"));
            assert((await card.locator(".pricing-monthly").innerText()).includes("15 cuotas"));
            assert((await card.locator(".pricing-monthly").innerText()).includes("Gs. 6.000.000"));
            assert.equal(await card.locator("button[data-plan-id]").count(), 0);
            assert.equal(await card.locator("a.pricing-button-gold").count(), 1);
          }
          if (i < 4) {
            assert((await card.locator(".pricing-price").innerText()).includes(daily));
            assert.equal(await card.locator("button[data-plan-id]").count(), 1);
            assert.equal((await card.locator(".pricing-price-period").innerText()).trim(), "/día");
            assert((await card.locator(".pricing-monthly").innerText()).includes(monthly));
            assert((await card.locator(".pricing-monthly").innerText()).includes("/mes"));
          } else {
            assert((await card.locator(".pricing-price").innerText()).includes(monthly));
            assert.equal((await card.locator(".pricing-price-period").innerText()).trim(), "/cuota");
          }
          assert(!/[≈*]/.test(await card.locator(".pricing-offer").innerText()));
          const geometry = await card.evaluate((el) => {
            const price = el.querySelector(".pricing-price");
            const monthly = el.querySelector(".pricing-monthly");
            const button = el.querySelector(".pricing-button");
            const benefits = el.querySelector(".pricing-includes");
            return {
              priceSize: parseFloat(getComputedStyle(price).fontSize),
              monthlySize: parseFloat(getComputedStyle(monthly).fontSize),
              buttonBottom: button.getBoundingClientRect().bottom,
              benefitsTop: benefits.getBoundingClientRect().top,
              priceScroll: price.parentElement.scrollWidth,
              priceClient: price.parentElement.clientWidth,
            };
          });
          assert(geometry.priceSize > geometry.monthlySize * (i < 4 ? 1.5 : 1.2), `${path}: el precio principal debe dominar`);
          assert(geometry.buttonBottom < geometry.benefitsTop, `${path}: el botón debe ir antes de beneficios`);
          assert(geometry.priceScroll <= geometry.priceClient + 1, `${path}: el precio ${name} se desborda`);
        }
        if (viewport.width > 1180) {
          const tops = await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
          assert(Math.max(...tops) - Math.min(...tops) < 2, path + ": los cinco planes deben estar en una sola fila");
        }
        const width = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert(width.scroll <= width.inner, `${path}: desborde horizontal en ${viewport.width}px`);
        if (path === "/membresia" && viewport.width === 1440) {
          await cards.first().locator("button[data-plan-id]").click();
          await page.locator("#registro-modal").waitFor({ state: "visible", timeout: 5000 });
        }

        console.log(`${path} ${viewport.width}px OK`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });