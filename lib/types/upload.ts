// TypeScript types for Excel upload feature

// ==================== Row Data ====================
export interface RowData {
    rowIndex: number;
    email: string;
    name: string;
    phone: string;
    address: string;
    company: string;
    note: string;
}

// ==================== Chunk Request ====================
export interface ChunkRequest {
    fileId: string;
    chunkIndex: number;
    chunkHash: string;
    rows: RowData[];
}

// ==================== Events ====================
export type EventType = 'resume' | 'progress' | 'data' | 'error' | 'done';

export interface BaseEvent {
    type: EventType;
    ts: number;
}

export interface ResumeEvent extends BaseEvent {
    type: 'resume';
    resumeFromChunk: number;
}

export interface ProgressEvent extends BaseEvent {
    type: 'progress';
    processed: number;
    total: number;
    processedChunks?: number; // Backend compatibility
    totalChunks?: number;     // Backend compatibility
}

export interface DataEvent extends BaseEvent {
    type: 'data';
    chunkIndex: number;
    row: RowData;
}

export type ErrorScope = 'row' | 'chunk' | 'system';

export interface ErrorEvent extends BaseEvent {
    type: 'error';
    scope: ErrorScope;
    chunkIndex: number | null;
    rowIndex: number | null;
    code: string;
    message: string;
    field?: string;
    value?: string;
}

export interface DoneEvent extends BaseEvent {
    type: 'done';
}

export type StreamEvent = ResumeEvent | ProgressEvent | DataEvent | ErrorEvent | DoneEvent;

// ==================== Upload State ====================
export type UploadStatus = 'idle' | 'uploading' | 'paused' | 'completed' | 'error';

export interface UploadProgress {
    processed: number;
    total: number;
}

export interface UploadError {
    chunkIndex: number | null;
    rowIndex: number | null;
    code: string;
    message: string;
    scope: ErrorScope;
    field?: string;
    value?: string;
}

export interface UploadState {
    status: UploadStatus;
    progress: UploadProgress;
    errors: UploadError[];
    resumeFromChunk: number;
    processedRows: RowData[];
}

// ==================== File Validation ====================
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

// ==================== Worker Messages ====================
export interface WorkerRequest {
    arrayBuffer: ArrayBuffer;
    chunkSize: number;
}

export interface WorkerResponse {
    rows: RowData[];
}

// ==================== Upload Options ====================
export interface UploadOptions {
    url: string;
    chunks: ChunkRequest[];
    resumeFrom?: number;
    signal?: AbortSignal;
    onEvent?: (event: StreamEvent) => void;
}
