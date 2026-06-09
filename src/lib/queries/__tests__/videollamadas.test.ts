import { describe, it, expect } from "vitest";
import { isPhoneCallRow } from "../videollamadas";

describe("isPhoneCallRow (AUT-632)", () => {
  it("identifies a phone call row (recording NULL, ingestion_source NULL, IA header matches)", () => {
    expect(
      isPhoneCallRow({
        fathom_recording_id: null,
        fathom_ingestion_source: null,
        resumen_ia: "# Análisis de la Llamada Telefónica\n\nResumen del contenido...",
      }),
    ).toBe(true);
  });

  it("does NOT exclude a real videollamada with fathom_recording_id", () => {
    expect(
      isPhoneCallRow({
        fathom_recording_id: "rec_abc123",
        fathom_ingestion_source: null,
        resumen_ia: "# Análisis de Videollamada\n\nResumen...",
      }),
    ).toBe(false);
  });

  it("does NOT exclude a row with fathom_ingestion_source set", () => {
    expect(
      isPhoneCallRow({
        fathom_recording_id: null,
        fathom_ingestion_source: "fathom_webhook",
        resumen_ia: "# Análisis de la Llamada Telefónica\n\nResumen...",
      }),
    ).toBe(false);
  });

  it("does NOT exclude a row with no resumen_ia (pending agenda)", () => {
    expect(
      isPhoneCallRow({
        fathom_recording_id: null,
        fathom_ingestion_source: null,
        resumen_ia: null,
      }),
    ).toBe(false);
  });

  it("does NOT exclude a videollamada with different IA header even without recording", () => {
    expect(
      isPhoneCallRow({
        fathom_recording_id: null,
        fathom_ingestion_source: null,
        resumen_ia: "# Análisis de Videollamada\n\nResumen...",
      }),
    ).toBe(false);
  });

  it("does NOT exclude a row with recording_id present even if IA header matches phone", () => {
    expect(
      isPhoneCallRow({
        fathom_recording_id: "rec_xyz",
        fathom_ingestion_source: null,
        resumen_ia: "# Análisis de la Llamada Telefónica\n\nResumen...",
      }),
    ).toBe(false);
  });
});
