import type { UploadOptions, StreamEvent } from "../types/upload";
import { parseNdjsonStream } from "./ndjson";

/**
 * Upload chunks to the streaming endpoint
 * @param options - Upload configuration
 */
export async function uploadChunks(options: UploadOptions): Promise<void> {
    const { url, chunks, resumeFrom = 0, signal, onEvent } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/x-ndjson",
        "Accept": "application/x-ndjson",
    };

    if (resumeFrom > 0) {
        headers["X-Resume-From-Chunk"] = String(resumeFrom);
    }

    // Use Blob for body to support HTTP/1.1 (standard upload)
    const ndjsonLines = chunks.map((c) => JSON.stringify(c) + "\n");
    const body = new Blob(ndjsonLines, { type: "application/x-ndjson" });

    console.log("Upload request", url, headers, body);

    const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal,
    });

    console.log("Upload response", res);

    if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
        throw new Error("No response body");
    }

    const reader = res.body.getReader();

    await parseNdjsonStream(reader, (data: StreamEvent) => {
        onEvent?.(data);
    });
}
