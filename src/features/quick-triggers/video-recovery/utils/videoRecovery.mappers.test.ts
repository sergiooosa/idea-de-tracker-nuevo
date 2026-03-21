import { describe, expect, it } from "vitest";
import { aggregateExecuteResults, chunkSelectedRecordings } from "./videoRecovery.mappers";

describe("videoRecovery.mappers", () => {
  it("aplica chunking cuando hay mas de 20 registros", () => {
    const items = Array.from({ length: 45 }).map((_, index) => ({
      recording_id: index + 1,
      action: "recover_existing" as const,
      meeting_snapshot: { recording_id: index + 1 },
    }));

    const chunks = chunkSelectedRecordings(items, 20);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(20);
    expect(chunks[1]).toHaveLength(20);
    expect(chunks[2]).toHaveLength(5);
  });

  it("consolida resultados y preserva orden por recording_id", () => {
    const aggregate = aggregateExecuteResults(
      [
        {
          processed: 1,
          skipped: 0,
          errors: 1,
          items: [
            {
              recording_id: 2,
              action: "recover_existing",
              status: "processed",
              estado_anterior: "pendiente",
              estado_final: "resuelto",
              motivo: "ok",
            },
            {
              recording_id: 1,
              action: "create_if_missing",
              status: "error",
              estado_anterior: "pendiente",
              estado_final: null,
              motivo: "fallo",
            },
          ],
        },
      ],
      [1, 2],
    );

    expect(aggregate.processed).toBe(1);
    expect(aggregate.errors).toBe(1);
    expect(aggregate.items[0]?.recording_id).toBe(1);
    expect(aggregate.items[1]?.recording_id).toBe(2);
  });
});

