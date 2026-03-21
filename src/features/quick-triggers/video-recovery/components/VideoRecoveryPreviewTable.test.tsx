import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VideoRecoveryPreviewTable } from "./VideoRecoveryPreviewTable";
import type { VideoRecoveryPreviewItem } from "../types/videoRecovery.types";

const previewItems: VideoRecoveryPreviewItem[] = [
  {
    recording_id: 101,
    meeting_title: "Demo cliente",
    share_url: "https://fathom.video/1",
    scheduled_start_time: "2026-03-20T10:00:00Z",
    lead_email_detected: "lead@dominio.com",
    estado_bd_actual: "pendiente",
    accion_sugerida: "recover_existing",
    motivo: "Pendiente de recuperacion",
    id_registro_agenda: null,
    meeting_snapshot: {
      recording_id: 101,
    },
  },
];

describe("VideoRecoveryPreviewTable", () => {
  it("renderiza badges y columnas requeridas", () => {
    render(
      <VideoRecoveryPreviewTable
        items={previewItems}
        selectedRecordingIds={new Set([101])}
        actionOverrides={new Map()}
        estadoFilter="all"
        actionFilter="all"
        onToggleSelection={vi.fn()}
        onSelectRecoverable={vi.fn()}
        onClearSelection={vi.fn()}
        onSetBulkAction={vi.fn()}
        onSetActionForRow={vi.fn()}
        onChangeEstadoFilter={vi.fn()}
        onChangeActionFilter={vi.fn()}
      />,
    );

    expect(screen.getByText("recording_id")).toBeInTheDocument();
    expect(screen.getByText("meeting_title")).toBeInTheDocument();
    expect(screen.getByText("estado_bd_actual")).toBeInTheDocument();
    expect(screen.getByText("accion_sugerida")).toBeInTheDocument();
    expect(screen.getAllByText("pendiente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("recover_existing").length).toBeGreaterThan(0);
    expect(screen.getByRole("checkbox", { name: /Seleccionar recording 101/i })).toBeChecked();
  });
});

