/**
 * Create a ReadableStream that outputs NDJSON (newline-delimited JSON)
 * @param chunks - Array of objects to serialize
 * @returns ReadableStream of Uint8Array
 */
export function ndjsonStream(chunks: any[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let i = 0;

    return new ReadableStream<Uint8Array>({
        pull(controller) {
            if (i >= chunks.length) {
                controller.close();
                return;
            }
            const line = JSON.stringify(chunks[i]) + "\n";
            controller.enqueue(encoder.encode(line));
            i++;
        },
    });
}

/**
 * Parse NDJSON stream from response body
 * @param reader - ReadableStreamDefaultReader from response.body
 * @param onLine - Callback for each parsed JSON line
 */
export async function parseNdjsonStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onLine: (data: any) => void
): Promise<void> {
    const decoder = new TextDecoder();
    let buffered = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffered += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffered.indexOf("\n")) >= 0) {
            const line = buffered.slice(0, idx).trim();
            buffered = buffered.slice(idx + 1);

            if (!line) continue;

            try {
                const data = JSON.parse(line);
                onLine(data);
            } catch (err) {
                console.error("Failed to parse NDJSON line:", line, err);
            }
        }
    }
}
