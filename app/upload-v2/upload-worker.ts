/**
 * upload-worker.ts
 * Offloads file chunking and SSE stream processing to a background thread.
 */

self.onmessage = async (e: MessageEvent) => {
    const { action, payload } = e.data;

    if (action === 'START_UPLOAD') {
        const { file, sessionId, fields, metadata, apiBaseUrl } = payload;

        try {
            // 1. Chunk file
            const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
            const chunks: Blob[] = [];
            let offset = 0;
            while (offset < file.size) {
                chunks.push(file.slice(offset, offset + CHUNK_SIZE));
                offset += CHUNK_SIZE;
            }

            // 2. Prepare FormData
            const formData = new FormData();
            chunks.forEach((chunk, index) => {
                formData.append('chunks', chunk, `chunk_${index}`);
            });
            formData.append('fields', new Blob([JSON.stringify(fields)], { type: 'application/json' }));
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));

            const params = new URLSearchParams({
                totalChunks: chunks.length.toString(),
                fileName: file.name,
                sessionId: sessionId
            });

            // 3. Fetch and Stream
            const response = await fetch(`${apiBaseUrl}/api/v2/excel/process?${params.toString()}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.text();
                self.postMessage({ action: 'ERROR', payload: `Upload failed: ${response.status} ${errorData}` });
                return;
            }

            if (!response.body) {
                self.postMessage({ action: 'ERROR', payload: 'No response body from server' });
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const accumulatedInvalidRows: any[] = [];
            const accumulatedRows: any[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    self.postMessage({ action: 'COMPLETE' });
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const jsonStr = line.replace(/^data:\s*/, '').trim();
                        if (jsonStr) {
                            try {
                                const data = JSON.parse(jsonStr);

                                // Accumulate errors
                                if (data.invalidRows && Array.isArray(data.invalidRows)) {
                                    accumulatedInvalidRows.push(...data.invalidRows);
                                }


                                // Accumulate successful rows
                                if (data.row) {
                                    accumulatedRows.push(data.row);
                                }

                                self.postMessage({
                                    action: 'PROGRESS',
                                    payload: {
                                        ...data,
                                        invalidRows: [...accumulatedInvalidRows],
                                        processedRowsList: [...accumulatedRows],
                                        successRows: [...data.successRows],
                                        totalChunks: chunks.length
                                    }
                                });
                            } catch (err) {
                                console.error('Worker parse error:', err);
                            }
                        }
                    }
                }
            }
        } catch (error: any) {
            self.postMessage({ action: 'ERROR', payload: error.message || 'Worker encountered an error' });
        }
    }
};