import type { UploadOptions, StreamEvent } from "../types/upload";
import { uploadChunks } from "./upload";

interface RetryOptions extends UploadOptions {
    maxRetries?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Upload chunks with automatic retry on network failures
 * Uses exponential backoff strategy
 */
export async function uploadChunksWithRetry(
    options: RetryOptions
): Promise<void> {
    const { maxRetries = 3, onRetry, ...uploadOptions } = options;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
        try {
            await uploadChunks(uploadOptions);
            return; // Success
        } catch (err) {
            lastError = err as Error;

            // Don't retry if aborted by user
            if (err instanceof Error && err.name === "AbortError") {
                throw err;
            }

            attempt++;

            if (attempt >= maxRetries) {
                throw lastError;
            }

            // Exponential backoff: 1s, 2s, 4s, 8s...
            const delay = Math.pow(2, attempt) * 1000;

            onRetry?.(attempt, lastError);

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
