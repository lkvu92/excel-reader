import type { UploadOptions, StreamEvent } from "../types/upload";
import { parseNdjsonStream } from "./ndjson";

/**
 * Upload chunks to the streaming endpoint - one chunk per request
 * @param options - Upload configuration
 */
export async function uploadChunks(options: UploadOptions): Promise<void> {
    const { url, chunks, resumeFrom = 0, signal, onEvent } = options;

    console.log(`Starting upload: ${chunks.length} chunks, resume from ${resumeFrom}`);

    // Send each chunk as a separate request
    for (let i = resumeFrom; i < chunks.length; i++) {
        const chunk = chunks[i];

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Accept": "application/x-ndjson",
            "X-Chunk-Index": String(i),
            "X-Total-Chunks": String(chunks.length),
        };

        if (resumeFrom > 0) {
            headers["X-Resume-From-Chunk"] = String(resumeFrom);
        }

        const body = JSON.stringify(chunk);

        console.log(`Uploading chunk ${i}/${chunks.length}...`);

        const res = await fetch(url, {
            method: "POST",
            headers,
            body,
            signal,
        });

        if (!res.ok) {
            throw new Error(`Upload failed for chunk ${i}: ${res.status} ${res.statusText}`);
        }

        if (!res.body) {
            throw new Error(`No response body for chunk ${i}`);
        }

        const reader = res.body.getReader();

        // Parse response stream for this chunk
        await parseNdjsonStream(reader, (data: StreamEvent) => {
            onEvent?.(data);
        });

        console.log(`Chunk ${i} completed`);
    }

    console.log("All chunks uploaded successfully");
}
