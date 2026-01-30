"use client";

import { useState, useCallback, useRef } from "react";
import type {
    UploadState,
    UploadError,
    StreamEvent,
    ChunkRequest,
    RowData,
} from "@/lib/types/upload";
import { uploadChunksWithRetry } from "@/lib/upload/retry";

interface UseUploadOptions {
    url: string;
    onComplete?: () => void;
    onError?: (error: Error) => void;
    maxRetries?: number;
}

export function useUpload(options: UseUploadOptions) {
    const { url, onComplete, onError, maxRetries = 3 } = options;

    const [state, setState] = useState<UploadState>({
        status: "idle",
        progress: { processed: 0, total: 0 },
        errors: [],
        resumeFromChunk: 0,
        processedRows: [],
    });

    const abortControllerRef = useRef<AbortController | null>(null);
    const currentChunkRowsRef = useRef<RowData[]>([]);
    const processedRowIndicesRef = useRef<Set<number>>(new Set());
    const rowDataMapRef = useRef<Map<number, RowData>>(new Map());

    const handleEvent = useCallback((event: StreamEvent) => {
        switch (event.type) {
            case "resume":
                console.log("Resume event:", event);
                setState((prev) => ({
                    ...prev,
                    resumeFromChunk: event.resumeFromChunk,
                }));
                break;

            case "progress":
                console.log("Progress event:", event);
                const rowsToAdd = [...currentChunkRowsRef.current];
                const processed = event.processedChunks ?? event.processed;
                const total = event.totalChunks ?? event.total;

                setState((prev) => ({
                    ...prev,
                    progress: {
                        processed: processed,
                        total: total,
                    },
                    // Batch update: add current chunk rows when chunk completes
                    processedRows: [
                        ...prev.processedRows,
                        ...rowsToAdd,
                    ],
                }));
                // Clear current chunk buffer
                currentChunkRowsRef.current = [];
                break;

            case "data":
                console.log("Data event:", event);
                // Buffer rows for batch update
                processedRowIndicesRef.current.add(event.row.rowIndex);
                currentChunkRowsRef.current.push(event.row);
                break;

            case "error":
                console.log("Error event:", event);
                const uploadError: UploadError = {
                    chunkIndex: event.chunkIndex,
                    rowIndex: event.rowIndex,
                    code: event.code,
                    message: event.message,
                    scope: event.scope,
                    field: event.field,
                    value: event.value,
                };
                setState((prev) => ({
                    ...prev,
                    errors: [...prev.errors, uploadError],
                }));

                // Fallback: If row error but no data event received, force add row to table
                if (event.scope === "row" && event.rowIndex !== null) {
                    if (!processedRowIndicesRef.current.has(event.rowIndex)) {
                        const row = rowDataMapRef.current.get(event.rowIndex);
                        if (row) {
                            processedRowIndicesRef.current.add(event.rowIndex);
                            currentChunkRowsRef.current.push(row);
                        }
                    }
                }
                break;

            case "done":
                console.log("Done event:", event);
                const finalRowsFromDone = [...currentChunkRowsRef.current];
                setState((prev) => ({
                    ...prev,
                    status: "completed", // Always mark as completed when stream ends
                    // Add any remaining buffered rows
                    processedRows: [
                        ...prev.processedRows,
                        ...finalRowsFromDone,
                    ],
                }));
                currentChunkRowsRef.current = [];
                onComplete?.();
                break;
        }
    }, [onComplete]);

    const startUpload = useCallback(
        async (chunks: ChunkRequest[], resumeFrom = 0) => {
            // Reset state
            setState({
                status: "uploading",
                progress: { processed: 0, total: chunks.length },
                errors: [],
                resumeFromChunk: resumeFrom,
                processedRows: [],
            });

            currentChunkRowsRef.current = [];
            processedRowIndicesRef.current.clear();
            rowDataMapRef.current.clear();

            // Populate row map
            chunks.forEach((c) =>
                c.rows.forEach((r) => rowDataMapRef.current.set(r.rowIndex, r))
            );

            // Create new abort controller
            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                await uploadChunksWithRetry({
                    url,
                    chunks: chunks.filter((c) => c.chunkIndex >= resumeFrom),
                    resumeFrom,
                    signal: controller.signal,
                    onEvent: handleEvent,
                    maxRetries,
                    onRetry: (attempt, error) => {
                        console.log(`Retry attempt ${attempt}:`, error.message);
                    },
                });

                // Ensure status is completed even if backend didn't send "done" event
                const remainingRows = [...currentChunkRowsRef.current];
                setState((prev) => {
                    if (prev.status === "uploading" || prev.status === "paused") {
                        return {
                            ...prev,
                            status: "completed",
                            processedRows: [
                                ...prev.processedRows,
                                ...remainingRows,
                            ],
                        };
                    }
                    return prev;
                });
                currentChunkRowsRef.current = [];
            } catch (err) {
                const error = err as Error;

                if (error.name === "AbortError") {
                    setState((prev) => ({ ...prev, status: "paused" }));
                } else {
                    setState((prev) => ({ ...prev, status: "error" }));
                    onError?.(error);
                }
            }
        },
        [url, handleEvent, maxRetries, onError]
    );

    const pauseUpload = useCallback(() => {
        abortControllerRef.current?.abort();
        setState((prev) => ({ ...prev, status: "paused" }));
    }, []);

    const resumeUpload = useCallback(
        async (chunks: ChunkRequest[]) => {
            const resumeFrom = state.progress.processed;
            await startUpload(chunks, resumeFrom);
        },
        [state.progress.processed, startUpload]
    );

    const cancelUpload = useCallback(() => {
        abortControllerRef.current?.abort();
        setState({
            status: "idle",
            progress: { processed: 0, total: 0 },
            errors: [],
            resumeFromChunk: 0,
            processedRows: [],
        });
        currentChunkRowsRef.current = [];
    }, []);

    return {
        state,
        startUpload,
        pauseUpload,
        resumeUpload,
        cancelUpload,
    };
}
