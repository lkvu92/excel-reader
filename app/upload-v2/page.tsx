"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { UploadZone } from "@/components/upload/upload-zone";
import { UploadProgress } from "@/components/upload/upload-progress";
import { DataTable } from "@/components/upload/data-table";
import { ErrorList } from "@/components/upload/error-list";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UploadStatus, UploadError, RowData } from "@/lib/types/upload";

/**
 * Field error details from backend
 */
interface FieldError {
    field: string;
    error: string;
    errorCode: string;
    actualValue: any;
}

/**
 * Invalid row details from backend
 */
interface InvalidRow {
    rowNumber: number;
    errors: FieldError[];
}

/**
 * Field definition for validation
 */
interface FieldDefinition {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'email';
    required: boolean;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    pattern?: string;
}

/**
 * Upload and processing progress state (Internal V2)
 */
interface ProgressState {
    status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error' | 'cancelled';
    chunk: number;
    totalChunks: number;
    totalRows: number;
    processedRows: number;
    successRows: RowData[];
    percentage: number;
    invalidRows: InvalidRow[];
    errorMessage?: string;
    sessionId?: string;
}

const initialProgress: ProgressState = {
    status: 'idle',
    chunk: 0,
    totalChunks: 0,
    totalRows: 0,
    processedRows: 0,
    successRows: [],
    percentage: 0,
    invalidRows: []
};

const ExcelUploadComponentV2: React.FC = () => {
    const [progress, setProgress] = useState<ProgressState>(initialProgress);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    // Refs for optimization
    const workerRef = useRef<Worker | null>(null);
    const latestProgressRef = useRef<ProgressState | null>(null);
    const lastUpdateTimeRef = useRef<number>(0);
    const UPDATE_THROTTLE_MS = 150; // Update UI at most every 150ms

    // Map V2 internal state to V1 component types
    const mappedUploadStatus = useMemo((): UploadStatus => {
        if (progress.status === 'processing') return 'uploading';
        if (progress.status === 'cancelled') return 'idle';
        return progress.status as UploadStatus;
    }, [progress.status]);

    const mappedProgress = useMemo(() => ({
        processed: progress.processedRows,
        total: progress.totalRows
    }), [progress.processedRows, progress.totalRows]);

    const mappedErrors = useMemo((): UploadError[] => {
        return progress.invalidRows.flatMap(row =>
            row.errors.map(err => ({
                chunkIndex: progress.chunk,
                rowIndex: row.rowNumber - 1,
                code: err.errorCode,
                message: err.error,
                scope: 'row' as const,
                field: err.field,
                value: String(err.actualValue)
            }))
        );
    }, [progress.invalidRows, progress.chunk]);

    // updateProgress: Updates ref immediately and throttles state updates by timestamp
    const updateProgress = useCallback((payload: ProgressState) => {
        // Append successRows and invalidRows to preserve previous data
        const currentRowCount = latestProgressRef.current?.successRows?.length || 0;
        const successRowsWithIndex = payload.successRows.map((row, index) => ({
            ...row,
            rowIndex: row.rowIndex ?? (currentRowCount + index)
        }));

        const newProgress: ProgressState = {
            ...payload,
            successRows: [...(latestProgressRef.current?.successRows || []), ...successRowsWithIndex],
            invalidRows: [...(latestProgressRef.current?.invalidRows || []), ...payload.invalidRows]
        };

        // Update the ref immediately
        latestProgressRef.current = newProgress;

        // Throttle state updates using timestamp
        const now = Date.now();
        const shouldUpdate = now - lastUpdateTimeRef.current >= UPDATE_THROTTLE_MS;

        // Force update on first chunk OR if enough time has passed
        if (payload.chunk === 1 || shouldUpdate) {
            lastUpdateTimeRef.current = now;
            setProgress(newProgress);
        }
    }, []);
    /**
     * Main upload and process handler using Web Worker
     */
    const handleUpload = useCallback(async (selectedFile: File) => {
        if (!selectedFile) return;

        setIsProcessing(true);
        // Reset state
        setProgress(initialProgress);
        latestProgressRef.current = null;

        const sessionId = `session_${Date.now()}`;

        // no	name	email	address	phone	company	note

        const fields: FieldDefinition[] = [
            { name: 'no', type: 'string', required: false },
            { name: 'name', type: 'string', required: true, maxLength: 100 },
            { name: 'email', type: 'email', required: true },
            { name: 'address', type: 'string', required: false, maxLength: 100 },
            { name: 'phone', type: 'string', required: false },
            { name: 'company', type: 'string', required: false },
            { name: 'note', type: 'string', required: false }
        ];

        const metadata = {
            uploadId: sessionId,
            totalSize: selectedFile.size,
            contentType: selectedFile.type
        };

        if (workerRef.current) workerRef.current.terminate();

        try {
            workerRef.current = new Worker(new URL('./upload-worker.ts', import.meta.url));

            workerRef.current.onmessage = (e: MessageEvent) => {
                const { action, payload } = e.data;

                console.log('Worker payload:', payload);
                // payload example
                // {
                //     "status": "processing",
                //     "chunk": 25,
                //     "totalRows": 5000,
                //     "processedRows": 5000,
                //     "successRows": [
                //         {
                //             "no": "4801",
                //             "name": "Trịnh Hải Nhật",
                //             "email": "trinh.hai.nhat8832@example.com",
                //             "address": "Số 548 Đại lộ Điện Biên Phủ, Phường 3, Quận 10, Nha Trang, Việt Nam",
                //             "phone": "0588428788",
                //             "company": "JSC Mekong Group",
                //             "note": "Đã demo sản phẩm"
                //         },
                //         ...
                //     ],
                //     "percentage": 100,
                //     "invalidRows": [],
                //     "errorMessage": null,
                //     "timestamp": 1769950864290,
                //     "processedRowsList": [],
                //     "totalChunks": 1
                // }

                switch (action) {
                    case 'PROGRESS':
                        updateProgress(payload);

                        break;

                    case 'COMPLETE':
                        // Capture final accumulated data before clearing ref
                        const finalData = latestProgressRef.current;
                        console.log('COMPLETE - finalData successRows:', finalData?.successRows?.length);

                        setProgress(prev => ({
                            ...prev,
                            ...(finalData || {}),
                            status: 'completed',
                            percentage: 100
                        }));
                        latestProgressRef.current = null;
                        setIsProcessing(false);
                        break;

                    case 'ERROR':
                        // Flush final data if exists
                        setProgress(prev => ({
                            ...prev,
                            ...(latestProgressRef.current || {}),
                            status: 'error',
                            errorMessage: payload
                        }));
                        latestProgressRef.current = null;
                        setIsProcessing(false);
                        break;
                }
            };

            workerRef.current.onerror = (err) => {
                console.error('Worker error:', err);
                setProgress(prev => ({ ...prev, status: 'error', errorMessage: 'Worker thread crashed.' }));
                setIsProcessing(false);
            };

            workerRef.current.postMessage({
                action: 'START_UPLOAD',
                payload: {
                    file: selectedFile,
                    sessionId,
                    fields,
                    metadata,
                    apiBaseUrl: 'http://localhost:8080'
                }
            });
        } catch (err) {
            console.error('Failed to start worker:', err);
            setIsProcessing(false);
            setProgress(prev => ({ ...prev, status: 'error', errorMessage: 'Could not initialize worker.' }));
        }
    }, []);

    /**
     * Signal backend to cancel processing and terminate worker
     */
    const handleCancel = useCallback(async () => {
        const sessionId = progress.sessionId;

        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        // stopThrottledUpdate();

        if (!sessionId) {
            setIsProcessing(false);
            setProgress(prev => ({ ...prev, status: 'cancelled' }));
            return;
        };

        try {
            await fetch(`http://localhost:8080/api/v2/excel/process/${sessionId}`, {
                method: 'DELETE'
            });

            setProgress(prev => ({ ...prev, status: 'cancelled', sessionId }));
            setIsProcessing(false);
        } catch (error) {
            console.error('Cancellation error:', error);
            setIsProcessing(false);
            setProgress(prev => ({ ...prev, status: 'cancelled' }));
        }
    }, [progress.sessionId]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    const isUploading = mappedUploadStatus === "uploading" || isProcessing;

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Excel Stream Upload V2</h1>
                <p className="text-muted-foreground">
                    Enterprise-grade processing with Web Worker and Real-time SSE
                </p>
            </div>

            <div className="space-y-6">
                <UploadZone
                    onFileSelect={handleUpload}
                    disabled={isUploading}
                    error={progress.status === 'error' ? progress.errorMessage : undefined}
                />

                <UploadProgress
                    status={mappedUploadStatus}
                    progress={mappedProgress}
                    percentage={progress.percentage}
                    label="rows"
                    onCancel={handleCancel}
                />

                {progress.status === 'error' && progress.errorMessage && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>System Error</AlertTitle>
                        <AlertDescription>{progress.errorMessage}</AlertDescription>
                    </Alert>
                )}

                {mappedErrors.length > 0 && <ErrorList errors={mappedErrors} />}

                {/* V2 Results Section */}
                {(progress.successRows.length > 0) && (
                    <DataTable rows={progress.successRows} errors={mappedErrors} />
                )}
            </div>
        </div>
    );
};

export default ExcelUploadComponentV2;
