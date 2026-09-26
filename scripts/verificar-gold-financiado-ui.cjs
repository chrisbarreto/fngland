const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const base = process.env.GOLD_UI_BASE_URL || "http://127.0.0.1:4321";
const plan = "4091fa2a-091e-4126-ad08-a60946550db7";
const version = "44444444-4444-4444-8444-444444444444";
const contract = "55555555-5555-4555-8555-555555555555";
const json = (body) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 850 } });
      let contratosEnviados = 0;
      let aceptacionEnviada;
      await page.addInitScript(() => sessionStorage.setItem("gold-financiado-sesion-v1", "sesion-de-prueba"));
      await page.route("**/api/membresias-financiadas?accion=*", async (route) => {
        const action = new URL(route.request().url()).searchParams.get("accion");
        if (action === "disponibilidad") return route.fulfill(json({ habilitado: true, idPlan: plan,
          cuota: "400000", numeroCuotas: 15, mesesCobertura: 15,
          versionTerminos: { idVersion: version, hashDocumento: "a".repeat(64), documento: "/legal/terminos-y-condiciones-v2-2-2026-09-23.pdf" } }));
        if (action === "cotizaciones") return route.fulfill(json({
          idCotizacionFinanciada: "77777777-7777-4777-8777-777777777777",
          expiresAt: new Date(Date.now() + 10 * 60000).toISOString(), fechaAltaPrevista: "2026-09-23",
          numeroCuotas: 15, importeCuota: "400000", importeTotal: "6000000",
          segundoVencimiento: "2026-09-30", calendario: Array.from({ length: 15 }, (_, i) => ({
            numero: i + 1, importe: "400000", vencimiento: i === 0 ? "2026-09-23" : "2026-09-30" })),
          coberturaPrevista: { desde: "2026-09-23", ultimoDia: "2027-12-22", mesesCobertura: 15 },
          versionTerminos: { idVersion: version, hashDocumento: "a".repeat(64), documento: "/legal/terminos-y-condiciones-v2-2-2026-09-23.pdf" },
          documentoExacto: "Contrato Gold y cronograma de 15 cuotas", hashOferta: "b".repeat(64),
        }));
        if (action === "contratos/recuperar") return route.fulfill(json({ encontrado: false }));
        if (action === "contratos") {
          contratosEnviados++;
          aceptacionEnviada = route.request().postDataJSON();
          return route.fulfill(json({ idContratoFinanciado: contract }));
        }
        if (action === "contratos/estado") return route.fulfill(json({ idContratoFinanciado: contract,
          estadoContrato: "PENDIENTE_PRIMER_PAGO", estadoCobertura: "PENDIENTE_PAGO_INICIAL",
          estadoPrimeraCuota: "PENDIENTE", estadoIntento: null, importeCuota: "400000",
          importeTotal: "6000000", numeroCuotas: 15, cuotasPagadas: 0,
          segundoVencimiento: "2026-09-30", coberturaDesde: null, coberturaHastaExclusiva: null }));
        return route.fulfill({ status: 404, body: "{}" });
      });
      await page.goto(base + "/membresia", { waitUntil: "domcontentloaded" });
      const buy = page.locator("[data-gold-contratar]");
      await buy.waitFor({ state: "visible" });
      assert.equal(await page.locator("[data-gold-consulta]").isVisible(), false);
      await buy.click();
      await page.locator("#gold-quote-section").waitFor({ state: "visible" });
      assert((await page.locator("#gold-quote-summary").innerText()).includes("6.000.000"));
      assert((await page.locator("#gold-quote-summary").innerText()).includes("30/9/2026"));
      assert.equal(await page.locator("#gold-calendar-body tr").count(), 15);
      assert((await page.locator("#gold-accept-terms-link").getAttribute("href")).includes("terminos-y-condiciones-v2-2"));
      const bounds = await page.locator("#gold-modal .gold-dialog").boundingBox();
      assert(bounds && bounds.width <= width + 1, `modal desborda ${width}px`);
      assert.equal(await page.locator("#gold-quote-section input[type=checkbox]").count(), 1);
      assert((await page.locator("#gold-payment-terms").innerText()).includes("6.000.000"));
      await page.locator("#gold-contract-button").click();
      assert.equal(contratosEnviados, 0);
      assert((await page.locator("#gold-error").innerText()).includes("débito automático"));
      await page.locator("#gold-accept-offer").check();
      await page.locator("#gold-contract-button").click();
      await page.locator("#gold-payment-section").waitFor({ state: "visible" });
      assert.equal(contratosEnviados, 1);
      assert.equal(aceptacionEnviada.aceptaContrato, true);
      assert.equal(aceptacionEnviada.aceptaCalendario, true);
      assert.equal(aceptacionEnviada.autorizaDebitoCuotas, true);
      assert((await page.locator("#gold-payment-message").innerText()).includes("400.000"));
      console.log(`Gold F6 ${width}px OK`);
      await page.close();
    }
    const paused = await browser.newPage({ viewport: { width: 390, height: 850 } });
    await paused.addInitScript(({ contract }) => {
      sessionStorage.setItem("gold-financiado-sesion-v1", "sesion-de-prueba");
      sessionStorage.setItem("gold-financiado-contrato-v1", contract);
    }, { contract });
    await paused.route("**/api/membresias-financiadas?accion=*", (route) => {
      const action = new URL(route.request().url()).searchParams.get("accion");
      if (action === "disponibilidad") return route.fulfill(json({ habilitado: false }));
      if (action === "contratos/estado") return route.fulfill(json({ idContratoFinanciado: contract,
        estadoContrato: "PENDIENTE_PRIMER_PAGO", estadoCobertura: "PENDIENTE_PAGO_INICIAL",
        estadoPrimeraCuota: "PENDIENTE", estadoIntento: null, importeCuota: "400000",
        importeTotal: "6000000", numeroCuotas: 15, cuotasPagadas: 0 }));
      return route.fulfill({ status: 404, body: "{}" });
    });
    await paused.goto(base + "/membresia", { waitUntil: "domcontentloaded" });
    const resume = paused.locator("[data-gold-contratar]");
    await resume.waitFor({ state: "visible" });
    assert((await resume.innerText()).includes("Consultar mi contrato"));
    assert.equal(await paused.locator("[data-gold-consulta]").isVisible(), true);
    await resume.click();
    await paused.locator("#gold-payment-section").waitFor({ state: "visible" });
    await paused.close();
    console.log("Gold F6 seguimiento con altas cerradas OK");
    const callback = await browser.newPage();
    let finalizaciones = 0;
    let cobrosPrepagos = 0;
    await callback.route("**/api/resolver-callback-catastro", (route) => route.fulfill(json({
      idCliente: "22222222-2222-4222-8222-222222222222", idMembresia: "66666666-6666-4666-8666-666666666666",
      token: "mct2.token-falso.firma", tokenVersion: "V2", purpose: "ALTA_FINANCIADA",
    })));
    await callback.route("**/api/membresias-financiadas?accion=*", (route) => {
      finalizaciones++;
      return route.fulfill(json({ idContratoFinanciado: contract, estadoContrato: "ACTIVO",
        estadoPrimeraCuota: "PAGADA", estadoIntento: "CONFIRMADO", numeroCuotas: 15 }));
    });
    await callback.route("**/api/membresias-v2?accion=*", (route) => {
      cobrosPrepagos++;
      return route.fulfill({ status: 500, body: "{}" });
    });
    await callback.goto(base + "/tarjetas/callback?state=estado-falso&status=success", { waitUntil: "domcontentloaded" });
    await callback.locator("#st-exito").waitFor({ state: "visible" });
    assert((await callback.locator("#exito-title").innerText()).includes("Gold activado"));
    assert.equal(finalizaciones, 1);
    assert.equal(cobrosPrepagos, 0);
    await callback.close();
    console.log("Gold F6 callback financiado OK");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
