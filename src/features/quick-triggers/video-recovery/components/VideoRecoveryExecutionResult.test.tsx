import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VideoRecoveryExecutionResult } from "./VideoRecoveryExecutionResult";

describe("VideoRecoveryExecutionResult", () => {
  it("renderiza resumen global y estados por fila", () => {
    render(
      <VideoRecoveryExecutionResult
        result={{
          processed: 1,
          skipped: 1,
          errors: 1,
          items: [
            {
              recording_id: 1,
              action: "recover_existing",
              status: "processed",
              estado_anterior: "pendiente",
              estado_final: "resuelto",
              motivo: "ok",
            },
            {
              recording_id: 2,
              action: "skip",
              status: "skipped",
              estado_anterior: "pendiente",
              estado_final: "descartado",
              motivo: "skip",
            },
            {
              recording_id: 3,
              action: "create_if_missing",
              status: "error",
              estado_anterior: "pendiente",
              estado_final: null,
              motivo: "error de validacion",
            },
          ],
        }}
        onRetryErrors={vi.fn()}
        retryDisabled={false}
      />,
    );

    expect(screen.getAllByText("processed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("skipped").length).toBeGreaterThan(0);
    expect(screen.getByText("errors")).toBeInTheDocument();
    expect(screen.getByText("resuelto")).toBeInTheDocument();
    expect(screen.getByText("descartado")).toBeInTheDocument();
    expect(screen.getByText("error de validacion")).toBeInTheDocument();
  });
});

