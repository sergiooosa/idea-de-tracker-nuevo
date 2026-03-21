import type {
  ExecuteSelectedRecording,
  SuggestedAction,
  VideoRecoveryExecuteAggregate,
  VideoRecoveryExecuteItemResult,
  VideoRecoveryPreviewItem,
} from "../types/videoRecovery.types";

export function chunkSelectedRecordings(
  selectedRecordings: ExecuteSelectedRecording[],
  chunkSize: number = 20,
): ExecuteSelectedRecording[][] {
  const chunks: ExecuteSelectedRecording[][] = [];
  for (let index = 0; index < selectedRecordings.length; index += chunkSize) {
    chunks.push(selectedRecordings.slice(index, index + chunkSize));
  }
  return chunks;
}

export function toDefaultSelection(previewItems: VideoRecoveryPreviewItem[]): Set<number> {
  return new Set(
    previewItems.filter((item) => item.accion_sugerida !== "skip").map((item) => item.recording_id),
  );
}

export function toSelectedRecordingsPayload(
  previewItems: VideoRecoveryPreviewItem[],
  selectedRecordingIds: Set<number>,
  actionOverrides: Map<number, SuggestedAction>,
): ExecuteSelectedRecording[] {
  return previewItems
    .filter((item) => selectedRecordingIds.has(item.recording_id))
    .map((item) => {
      const action = actionOverrides.get(item.recording_id) ?? item.accion_sugerida;
      return {
        recording_id: item.recording_id,
        id_registro_agenda: item.id_registro_agenda ?? undefined,
        action,
        meeting_snapshot: item.meeting_snapshot,
      };
    });
}

export function getLocalAction(
  item: VideoRecoveryPreviewItem,
  actionOverrides: Map<number, SuggestedAction>,
): SuggestedAction {
  return actionOverrides.get(item.recording_id) ?? item.accion_sugerida;
}

export function aggregateExecuteResults(
  aggregates: VideoRecoveryExecuteAggregate[],
  orderedRecordingIds: number[],
): VideoRecoveryExecuteAggregate {
  const joinedItems: VideoRecoveryExecuteItemResult[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const aggregate of aggregates) {
    processed += aggregate.processed;
    skipped += aggregate.skipped;
    errors += aggregate.errors;
    joinedItems.push(...aggregate.items);
  }

  const orderMap = new Map<number, number>();
  orderedRecordingIds.forEach((recordingId, index) => {
    orderMap.set(recordingId, index);
  });

  joinedItems.sort((left, right) => {
    const leftOrder = orderMap.get(left.recording_id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(right.recording_id) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });

  return {
    processed,
    skipped,
    errors,
    items: joinedItems,
  };
}

export function toUniqueTrimmedList(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

