"use client";

import { useState, useCallback, useRef } from "react";
import { UploadZone } from "@/components/upload/upload-zone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { DataTable } from "@/components/upload/data-table";
import { ErrorList } from "@/components/upload/error-list";
import { useUpload } from "@/hooks/useUpload";
import { validateFile } from "@/lib/upload/validation";
import { chunkArray } from "@/lib/upload/chunk";
import { computeChunkHash } from "@/lib/upload/hash";
import type { ChunkRequest, RowData } from "@/lib/types/upload";

export default function UploadPage() {
    const [validationError, setValidationError] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const workerRef = useRef<Worker | null>(null);
    const chunksRef = useRef<ChunkRequest[]>([]);

    const { state, startUpload, pauseUpload, resumeUpload, cancelUpload } =
        useUpload({
            url: "http://localhost:8686/api/v1/stream",
            onComplete: () => {
                console.log("Upload hoàn thành!");
            },
            onError: (error) => {
                console.error("Lỗi upload:", error);
            },
        });

    const handleFileSelect = useCallback(async (file: File) => {
        setValidationError("");
        setIsProcessing(true);

        try {
            // Validate file
            const validation = await validateFile(file);
            if (!validation.valid) {
                setValidationError(validation.error || "File không hợp lệ");
                setIsProcessing(false);
                return;
            }

            // Khởi tạo worker nếu chưa có
            if (!workerRef.current) {
                workerRef.current = new Worker(
                    new URL("@/lib/workers/excel-parser.worker.ts", import.meta.url)
                );
            }

            const arrayBuffer = await file.arrayBuffer();

            // Gửi đến worker để parse
            workerRef.current.postMessage({
                arrayBuffer,
                chunkSize: 200,
            });

            workerRef.current.onmessage = async (e) => {
                if (e.data.error) {
                    setValidationError(e.data.error);
                    setIsProcessing(false);
                    return;
                }

                const rows: RowData[] = e.data.rows;

                // Tạo chunk requests
                const fileId = `upload-${Date.now()}-${file.name}`;
                const rowChunks = chunkArray(rows, 200);
                const chunkRequests: ChunkRequest[] = [];

                for (let i = 0; i < rowChunks.length; i++) {
                    const chunkRows = rowChunks[i];
                    const chunkHash = await computeChunkHash(chunkRows);
                    chunkRequests.push({
                        fileId,
                        chunkIndex: i,
                        chunkHash,
                        rows: chunkRows,
                    });
                }

                chunksRef.current = chunkRequests;
                setIsProcessing(false);

                // Bắt đầu upload
                await startUpload(chunkRequests);
            };
        } catch (error) {
            console.error("Lỗi xử lý file:", error);
            setValidationError("Không thể xử lý file");
            setIsProcessing(false);
        }
    }, [startUpload]);

    const handleResume = useCallback(async () => {
        if (chunksRef.current.length > 0) {
            await resumeUpload(chunksRef.current);
        }
    }, [resumeUpload]);

    const isUploading = state.status === "uploading" || isProcessing;

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Excel Stream Upload</h1>
                <p className="text-muted-foreground">
                    Tải lên file Excel với xử lý real-time và theo dõi lỗi chi tiết
                </p>
            </div>

            <div className="space-y-6">
                <UploadZone
                    onFileSelect={handleFileSelect}
                    disabled={isUploading}
                    error={validationError}
                />

                <UploadProgress
                    status={isProcessing ? "uploading" : state.status}
                    progress={state.progress}
                    onPause={pauseUpload}
                    onResume={handleResume}
                    onCancel={cancelUpload}
                />

                {state.errors.length > 0 && <ErrorList errors={state.errors} />}

                <DataTable rows={state.processedRows} errors={state.errors} />
            </div>
        </div>
    );
}
