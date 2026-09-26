const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");

const base = process.env.GOLD_UI_BASE_URL || "http://127.0.0.1:4321";
const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const caso of ["catalogo", "otro"]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
      await page.addInitScript(() => {
        window.turnstile = {
          render: (_selector, options) => {
            queueMicrotask(() => options.callback("token-de-prueba"));
            return "widget-de-prueba";
          },
          reset: () => {},
        };
      });
      await page.route("**/api/marcas", (route) => route.fulfill(json([
        { idMarca: 7, nombre: "Marca de prueba" },
      ])));
      await page.route("**/api/modelos?idMarca=7", (route) => route.fulfill(json([
        { idModelo: 70, nombre: "Modelo de prueba" },
      ])));
      await page.route("**/api/tipos-vehiculo", (route) => route.fulfill(json([
        { idTipoVehiculo: 5, nombre: "SUV de prueba" },
      ])));
      let registro = null;
      await page.route("**/api/membresias-financiadas?accion=*", (route) => {
        const action = new URL(route.request().url()).searchParams.get("accion");
        if (action === "disponibilidad") return route.fulfill(json({ habilitado: true,
          idPlan: "4091fa2a-091e-4126-ad08-a60946550db7", cuota: "400000", numeroCuotas: 15,
          versionTerminos: { idVersion: "44444444-4444-4444-8444-444444444444" } }));
        if (action === "registro") {
          registro = JSON.parse(route.request().postData());
          return route.fulfill(json({ sesionToken: "sesion-de-prueba" }));
        }
        if (action === "cotizaciones") return route.fulfill(json({
          idCotizacionFinanciada: "77777777-7777-4777-8777-777777777777",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          numeroCuotas: 15, importeCuota: "400000", importeTotal: "6000000",
          segundoVencimiento: "2026-09-30", calendario: Array.from({ length: 15 }, (_, i) => ({
            numero: i + 1, importe: "400000", vencimiento: "2026-09-30",
          })),
          coberturaPrevista: { desde: "2026-09-25", ultimoDia: "2027-12-24", mesesCobertura: 15 },
          versionTerminos: { idVersion: "44444444-4444-4444-8444-444444444444",
            hashDocumento: "a".repeat(64), documento: "/legal/prueba.pdf" },
          documentoExacto: "Prueba de contrato", hashOferta: "b".repeat(64),
        }));
        return route.fulfill({ status: 404, body: "{}" });
      });
      await page.goto(base + "/membresia", { waitUntil: "domcontentloaded" });
      await page.addStyleTag({ content: "astro-dev-toolbar { display: none !important; }" });
      const buy = page.locator("[data-gold-contratar]");
      await buy.waitFor({ state: "visible" });
      await buy.click();
      await page.locator("#gold-register-section").waitFor({ state: "visible" });
      await page.locator("#gold-marca option[value='7']").waitFor({ state: "attached" });
      await page.locator("#gold-register-form [name=nombre]").fill("Cliente de prueba");
      await page.locator("#gold-register-form [name=ruc]").fill("1234567");
      await page.locator("#gold-register-form [name=telefono]").fill("0981000000");
      await page.locator("#gold-register-form [name=email]").fill("prueba@example.test");
      await page.locator("#gold-register-form [name=chapa]").fill("ABCD123");
      await page.locator("#gold-register-form [name=anio]").fill("2024");
      await page.locator("#gold-register-form [name=color]").fill("Blanco");
      await page.locator("#gold-tipo").selectOption("5");
      if (caso === "catalogo") {
        await page.locator("#gold-marca").selectOption("7");
        await page.locator("#gold-modelo option[value='70']").waitFor({ state: "attached" });
        await page.locator("#gold-modelo").selectOption("70");
      } else {
        await page.locator("#gold-marca").selectOption("otro");
        await page.locator("#gold-marca-nueva-wrap input").fill("Marca nueva");
        await page.locator("#gold-modelo-nuevo-wrap input").fill("Modelo nuevo");
      }
      await page.locator("#gold-register-form [name=acceptTerminos]").check();
      await page.locator("#gold-register-button").click();
      await page.locator("#gold-quote-section").waitFor({ state: "visible" });
      assert.equal(registro.chapa, "ABCD123");
      assert.equal(registro.anio, 2024);
      assert.equal(registro.idTipoVehiculo, 5);
      assert.equal(registro.color, "Blanco");
      assert.equal(registro.acceptTerminos, true);
      if (caso === "catalogo") {
        assert.equal(registro.idMarca, 7);
        assert.equal(registro.idModelo, 70);
      } else {
        assert.equal(registro.marcaNueva, "Marca nueva");
        assert.equal(registro.modeloNuevo, "Modelo nuevo");
        assert.equal(registro.idMarca, undefined);
      }
      console.log(`Gold vehículo ${caso}: OK`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
