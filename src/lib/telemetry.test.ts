import { describe, expect, it } from "vitest";
import { sanitizarUrlTelemetria } from "./telemetry";

describe("telemetria segura", () => {
  it("elimina query y hash para no registrar tokens ni estados bancarios", () => {
    expect(
      sanitizarUrlTelemetria(
        "https://landing.example/tarjetas/callback?token=mct2.secreto&state=estado-banco#resultado",
      ),
    ).toBe("https://landing.example/tarjetas/callback");
  });

  it("sanea tambien una URL relativa o malformada", () => {
    expect(
      sanitizarUrlTelemetria("/tarjetas/callback?token=mct2.secreto"),
    ).toBe("/tarjetas/callback");
  });
});
