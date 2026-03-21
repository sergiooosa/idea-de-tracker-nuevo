import { describe, expect, it } from "vitest";
import {
  validateChunkSize,
  validateExecuteSelection,
  validatePreviewRequest,
} from "./videoRecovery.validation";

describe("videoRecovery.validation", () => {
  it("valida from/to y retorna error cuando from > to", () => {
    const error = validatePreviewRequest({
      id_evento: "12",
      from: "2026-03-21T12:00:00",
      to: "2026-03-20T12:00:00",
      timezone: "America/Bogota",
      limit: 50,
    });

    expect(error).toContain("from no puede ser mayor que to");
  });

  it("acepta preview valido", () => {
    const error = validatePreviewRequest({
      id_evento: "12",
      from: "2026-03-20T12:00:00",
      to: "2026-03-21T12:00:00",
      timezone: "America/Bogota",
      limit: 50,
    });

    expect(error).toBeNull();
  });

  it("valida selected_recordings no vacio", () => {
    const error = validateExecuteSelection([]);
    expect(error).toContain("selected_recordings no puede estar vacio");
  });

  it("valida chunk <= 20", () => {
    const selected = Array.from({ length: 21 }).map((_, index) => ({
      recording_id: index + 1,
      action: "recover_existing" as const,
      meeting_snapshot: { recording_id: index + 1 },
    }));
    const error = validateChunkSize(selected);
    expect(error).toContain("no puede exceder 20");
  });
});

