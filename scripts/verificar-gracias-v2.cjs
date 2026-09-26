const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");

const base = process.env.GRACIAS_V2_BASE_URL || "http://127.0.0.1:4349";
const comprobante = {
  numeroComprobante: 321,
  cliente: { nombre: "Cliente de prueba", ci: "1234567", email: "", telefono: "" },
  membresia: {
    codigo: "NG150", numeroMembresia: 150, plan: "Fórmula Plus",
    fechaInicio: "2026-09-26", fechaFin: "2026-10-25",
  },
  serviciosIncluidos: [{ nombre: "Lavado exterior", cantidad: 6 }],
  pago: {
    monto: 250000, moneda: "PYG", fecha: "2026-09-26T15:00:00.000Z",
    idTransaccion: null, hashPedido: null, numeroPedido: "12345",
  },
  tarjeta: null,
  vehiculo: null,
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ acceptDownloads: true });
    let consultas = 0;
    await page.route("**/api/membresias-v2?accion=cobros%2Festado", (route) => {
      consultas += 1;
      const body = consultas === 1
        ? { estado: "RECHAZADO", definitivo: false, puedeReintentar: true,
            mensaje: "El banco rechazo el cobro.", comprobante: null }
        : { estado: "PAGADO", definitivo: true, puedeReintentar: false,
            mensaje: "El pago fue confirmado.", comprobante: consultas >= 3 ? comprobante : null };
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        success: true, billingVersion: "V2", idCotizacion: "cot-1", idMembresia: "mem-1",
        totalCobrarAhora: "250000", membresia: { estadoCobertura: consultas === 1 ? "ESPERA_PAGO" : "CUBIERTA",
          fechaFin: "2026-10-25" }, intento: { numeroIntento: consultas, estadoTecnico: "CONFIRMADO" },
        trabajo: null, ...body,
      }) });
    });
    await page.goto(`${base}/gracias?checkout=ok&billingVersion=V2&idCliente=cli-1&idMembresia=mem-1&idCotizacion=cot-1&token=token-1`);
    for (let i = 0; i < 50 && consultas < 1; i += 1) await page.waitForTimeout(100);
    assert.equal(consultas, 1);
    assert.equal(await page.locator("#status-card").getAttribute("data-status"), "pending");
    assert.equal(await page.locator("#status-icon").evaluate((el) => getComputedStyle(el).animationName), "status-spin");
    assert.equal(await page.locator("#action-primary").isVisible(), false);
    await page.locator("#status-card[data-status=success]").waitFor({ timeout: 10000 });
    assert.equal(consultas, 2);
    assert.equal(await page.locator("#btn-descargar-comprobante").isVisible(), true);
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      page.locator("#btn-descargar-comprobante").click(),
    ]);
    assert.equal(download.suggestedFilename(), "comprobante-NG150.pdf");
    assert.equal(consultas, 3);
    await page.close();

    const rechazada = await browser.newPage();
    let intentos = 0;
    await rechazada.route("**/api/membresias-v2?accion=cobros%2Festado", (route) => {
      intentos += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        success: true, billingVersion: "V2", idCotizacion: "cot-2", idMembresia: "mem-2",
        estado: "RECHAZADO", definitivo: false, puedeReintentar: true,
        mensaje: "El banco rechazó el cobro.", comprobante: null,
        totalCobrarAhora: "250000", membresia: { estadoCobertura: "ESPERA_PAGO", fechaFin: null },
        intento: { numeroIntento: 1, estadoFinanciero: "RECHAZADO" }, trabajo: null,
      }) });
    });
    await rechazada.goto(`${base}/gracias?checkout=ok&billingVersion=V2&idCliente=cli-2&idMembresia=mem-2&idCotizacion=cot-2&token=token-2`);
    await rechazada.locator("#status-card[data-status=error]").waitFor({ timeout: 15000 });
    assert.equal(intentos, 3);
    assert.equal(await rechazada.locator("#status-eyebrow").textContent(), "Cobro rechazado");
    assert.equal(await rechazada.locator("#btn-descargar-comprobante").isVisible(), false);
    console.log("Seguimiento V2: carga, confirmación y comprobante PDF; rechazo confirmado OK");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
