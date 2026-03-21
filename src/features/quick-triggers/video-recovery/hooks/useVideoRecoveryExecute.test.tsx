import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVideoRecoveryExecute } from "./useVideoRecoveryExecute";
import type {
  VideoRecoveryExecuteAggregate,
  VideoRecoveryExecuteResponse,
} from "../types/videoRecovery.types";

const executeVideoRecoveryMock = vi.fn();

vi.mock("../api/videoRecovery.api", () => ({
  executeVideoRecovery: (payload: unknown) => executeVideoRecoveryMock(payload),
}));

function makeResponse(
  processed: number,
  skipped: number,
  errors: number,
  recordingBase: number,
): VideoRecoveryExecuteResponse {
  return {
    success: true,
    message: "Execution completed",
    data: {
      processed,
      skipped,
      errors,
      items: [
        {
          recording_id: recordingBase,
          action: "recover_existing",
          status: "processed",
          estado_anterior: "pendiente",
          estado_final: "resuelto",
          motivo: "ok",
        },
        {
          recording_id: recordingBase + 1,
          action: "skip",
          status: "skipped",
          estado_anterior: "pendiente",
          estado_final: "descartado",
          motivo: "omitido",
        },
        {
          recording_id: recordingBase + 2,
          action: "create_if_missing",
          status: "error",
          estado_anterior: "pendiente",
          estado_final: null,
          motivo: "error",
        },
      ],
    },
  };
}

describe("useVideoRecoveryExecute", () => {
  beforeEach(() => {
    executeVideoRecoveryMock.mockReset();
  });

  it("ejecuta success con mezcla processed/skipped/error", async () => {
    executeVideoRecoveryMock.mockResolvedValueOnce(makeResponse(1, 1, 1, 1));
    const { result } = renderHook(() => useVideoRecoveryExecute());
    const selected = [1, 2, 3].map((recordingId) => ({
      recording_id: recordingId,
      action: "recover_existing" as const,
      meeting_snapshot: { recording_id: recordingId },
    }));

    let aggregate: VideoRecoveryExecuteAggregate = {
      processed: 0,
      skipped: 0,
      errors: 0,
      items: [],
    };
    await act(async () => {
      aggregate = await result.current.executeInChunks("10", selected);
    });

    expect(aggregate.processed).toBe(1);
    expect(aggregate.skipped).toBe(1);
    expect(aggregate.errors).toBe(1);
  });

  it("hace chunking en lotes de 20", async () => {
    executeVideoRecoveryMock
      .mockResolvedValueOnce(makeResponse(20, 0, 0, 1))
      .mockResolvedValueOnce(makeResponse(5, 0, 0, 21));

    const { result } = renderHook(() => useVideoRecoveryExecute());
    const selected = Array.from({ length: 25 }).map((_, index) => ({
      recording_id: index + 1,
      action: "recover_existing" as const,
      meeting_snapshot: { recording_id: index + 1 },
    }));

    await act(async () => {
      await result.current.executeInChunks("10", selected);
    });

    expect(executeVideoRecoveryMock).toHaveBeenCalledTimes(2);
    expect(executeVideoRecoveryMock.mock.calls[0]?.[0]?.selected_recordings).toHaveLength(20);
    expect(executeVideoRecoveryMock.mock.calls[1]?.[0]?.selected_recordings).toHaveLength(5);
  });
});

