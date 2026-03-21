import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewVideoRecovery } from "./videoRecovery.api";

describe("videoRecovery.api preview", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preview success", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          message: "Preview generated",
          data: { items: [{ recording_id: 10, accion_sugerida: "recover_existing" }] },
        }),
        { status: 200 },
      ),
    );

    const response = await previewVideoRecovery({
      id_evento: "10",
      from: "2026-03-20T10:00:00",
      to: "2026-03-20T12:00:00",
      timezone: "America/Bogota",
      limit: 50,
    });

    expect(response.success).toBe(true);
    expect(response.data?.items).toHaveLength(1);
  });

  it("preview empty", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          message: "Preview generated",
          data: { items: [] },
        }),
        { status: 200 },
      ),
    );

    const response = await previewVideoRecovery({
      id_evento: "10",
      from: "2026-03-20T10:00:00",
      to: "2026-03-20T12:00:00",
      timezone: "America/Bogota",
      limit: 50,
    });

    expect(response.data?.items).toEqual([]);
  });

  it("preview error 422", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "Payload invalido" }), { status: 422 }),
    );

    await expect(
      previewVideoRecovery({
        id_evento: "10",
        from: "2026-03-20T10:00:00",
        to: "2026-03-20T12:00:00",
        timezone: "America/Bogota",
        limit: 50,
      }),
    ).rejects.toThrow("Payload invalido");
  });
});

