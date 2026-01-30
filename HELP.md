# Dịch vụ đọc Excel dạng Streaming (Stateless + Resume + Idempotency)

Tài liệu này mô tả giao thức backend và hướng dẫn tích hợp Frontend (Next.js) cho dịch vụ upload dữ liệu Excel theo từng “chunk” (NDJSON) với khả năng resume và idempotency.

## 1) Tổng quan
- Streaming qua WebFlux: Client gửi NDJSON, server trả NDJSON events theo thời gian thực.
- Stateless: Backend không giữ state giữa các request, idempotency tồn tại trong phạm vi 1 request.
- Resume từ chunk N: Client dùng header `X-Resume-From-Chunk` để tiếp tục gửi từ chunk N.
- Hash verify bắt buộc: Mỗi chunk phải kèm `chunkHash = SHA256(JSON_CANONICAL(rows))` để đảm bảo đúng nội dung khi retry.

Kiến trúc đã áp dụng trong mã nguồn:
- Endpoint: `POST /api/v1/stream`
- Content-Type vào/ra: `application/x-ndjson`
- DTO yêu cầu: `ChunkRequest(fileId, chunkIndex, chunkHash, rows)`
- Events trả về: `DataEvent`, `ProgressEvent`, `ErrorEvent`, `DoneEvent`, `ResumeEvent` (tất cả implement `BaseEvent`).

## 2) Protocol chi tiết
1) Client gửi NDJSON, mỗi dòng là 1 `ChunkRequest`:
```json
{"fileId":"upload-20250130-abc","chunkIndex":0,"chunkHash":"<sha256>","rows":[{"rowIndex":0,"email":"a@x.com","name":"A","phone":"+84123"}]}
{"fileId":"upload-20250130-abc","chunkIndex":1,"chunkHash":"<sha256>","rows":[...]}
```
- `rows` là mảng các `RowData`: `{ rowIndex: number, email: string, name: string, phone: string }`.
- `chunkHash` là SHA‑256 của JSON canonical của `rows` (không hash raw JSON chưa chuẩn hóa thứ tự key).

2) Resume (tuỳ chọn):
- FE gửi header: `X-Resume-From-Chunk: <N>`.
- Backend bỏ qua chunk có `chunkIndex < N`.
- Backend phát `ResumeEvent` ở đầu stream để FE hiển thị UX resume.

3) Idempotency per request:
- Backend dùng `Set<String> processedChunkHashes` để loại trùng hash trong cùng request.
- Nếu trùng → `ErrorEvent` `CHUNK_002`.

4) Hash verify:
- Tính lại hash phía server; nếu khác `chunk.chunkHash` → `ErrorEvent` `CHUNK_003`.

## 3) Endpoint
- Method: `POST`
- URL: `/api/v1/stream`
- Headers:
  - `Content-Type: application/x-ndjson`
  - `Accept: application/x-ndjson`
  - `X-Resume-From-Chunk: <int>` (tuỳ chọn)
- Body: NDJSON, mỗi dòng một `ChunkRequest`.
- Response: NDJSON events liên tục cho đến khi kết thúc (hoặc client hủy).

## 4) Schema DTO vào/ra (rút gọn)
- Request — `ChunkRequest`:
```java
public record ChunkRequest(
    String fileId,
    int chunkIndex,
    String chunkHash,
    List<RowData> rows
) {}
```
- Request — `RowData`:
```java
public record RowData(
    int rowIndex,
    String email,
    String name,
    String phone
) {}
```

- Event cơ sở — `BaseEvent`:
```java
public sealed interface BaseEvent
    permits DataEvent, ProgressEvent, ErrorEvent, DoneEvent, ResumeEvent {
  String type();
  long ts();
}
```

- Ví dụ các event (JSON NDJSON):
  - ResumeEvent:
    ```json
    {"type":"resume","ts":1730000000000,"resumeFromChunk":12}
    ```
  - DataEvent:
    ```json
    {"type":"data","ts":1730000000001,"chunkIndex":0,"row":{...}}
    ```
  - ProgressEvent:
    ```json
    {"type":"progress","ts":1730000000123,"processed":5,"total":5}
    ```
  - ErrorEvent (row/chunk/system):
    ```json
    {"type":"error","ts":1730000000456,"scope":"chunk","chunkIndex":1,"rowIndex":null,"code":"CHUNK_003","message":"Chunk hash mismatch"}
    ```

- ErrorCode quan trọng:
  - `CHUNK_002` = Duplicate chunk
  - `CHUNK_003` = Chunk hash mismatch
  - `VALID_*` = nhóm lỗi xác thực hàng (ví dụ `VALID_EMAIL_INVALID`)
  - `SYS_001` = Unexpected system error

## 5) Hash canonical JSON (bắt buộc)
Nguyên tắc: `SHA256(JSON_CANONICAL(rows))`
- Không hash raw JSON vì thứ tự key có thể khác nhau giữa FE/BE.
- Backend dùng Jackson với cấu hình ổn định:
  - `MapperFeature.SORT_PROPERTIES_ALPHABETICALLY = true`
  - `SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS = true`

Ví dụ FE (Web Crypto):
```js
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function canonicalStringifyRows(rows) {
  if (!rows || rows.length === 0) return "[]";
  const keys = Object.keys(rows[0]).sort();
  return JSON.stringify(rows, keys);
}

async function computeChunkHash(rows) {
  const canonical = canonicalStringifyRows(rows);
  const buf = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return toHex(hash);
}
```

## 6) Ví dụ gọi thử bằng curl
```bash
curl -v \
  -H "Content-Type: application/x-ndjson" \
  -H "Accept: application/x-ndjson" \
  -H "X-Resume-From-Chunk: 0" \
  -X POST \
  --data-binary @chunks.ndjson \
  http://localhost:8080/api/v1/stream
```
File `chunks.ndjson` ví dụ:
```
{"fileId":"f-1","chunkIndex":0,"chunkHash":"<sha256>","rows":[{"rowIndex":0,"email":"a@x.com","name":"A","phone":"+8401"}]}
{"fileId":"f-1","chunkIndex":1,"chunkHash":"<sha256>","rows":[{"rowIndex":15,"email":"b@x.com","name":"B","phone":"+8402"}]}
```

## 7) Hướng dẫn FE (Next.js – App Router)

Mục tiêu:
- Đọc Excel phía client → chia thành các chunk 200–300 hàng.
- Tính `chunkHash` cho mỗi chunk bằng Web Crypto (canonical JSON).
- Tạo ReadableStream NDJSON để POST và đọc stream NDJSON trả về.
- Hỗ trợ resume bằng header `X-Resume-From-Chunk` và lọc chunk theo `chunkIndex`.

Yêu cầu phụ:
- Thư viện `xlsx` để parse Excel (có thể chạy trong Web Worker để mượt UI).

Bước 1 — Tách mảng thành chunk:
```ts
export function chunkArray<T>(arr: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
```

Bước 2 — Canonical JSON + SHA‑256:
```ts
function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalStringifyRows(rows: any[]): string {
  if (!rows || rows.length === 0) return "[]";
  const keys = Object.keys(rows[0]).sort();
  return JSON.stringify(rows, keys);
}

export async function computeChunkHash(rows: any[]): Promise<string> {
  const canonical = canonicalStringifyRows(rows);
  const buf = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return toHex(hash);
}
```

Bước 3 — NDJSON ReadableStream:
```ts
export function ndjsonStream(chunks: any[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= chunks.length) { controller.close(); return; }
      const line = JSON.stringify(chunks[i]) + "\n";
      controller.enqueue(encoder.encode(line));
      i++;
    }
  });
}
```

Bước 4 — Upload và đọc NDJSON events:
```ts
import { ndjsonStream } from "./ndjson";

export async function uploadChunks({ url, chunks, resumeFrom = 0 }: { url: string; chunks: any[]; resumeFrom?: number; }) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-ndjson",
      "Accept": "application/x-ndjson",
      ...(resumeFrom > 0 ? { "X-Resume-From-Chunk": String(resumeFrom) } : {}),
    },
    body: ndjsonStream(chunks),
  });

  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
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
      const evt = JSON.parse(line);
      console.log("event", evt);
    }
  }
}
```

Bước 5 — Build `ChunkRequest` từ Excel:
```ts
import { chunkArray } from "./chunk";
import { computeChunkHash } from "./hash";

type RowData = { rowIndex: number; email: string; name: string; phone: string };

type ChunkRequest = { fileId: string; chunkIndex: number; chunkHash: string; rows: RowData[] };

export async function buildChunkRequests(fileId: string, rows: RowData[], chunkSize = 200): Promise<ChunkRequest[]> {
  const chunks = chunkArray(rows, chunkSize);
  const out: ChunkRequest[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const rowsWithIndex = chunks[i].map((r, j) => ({ ...r, rowIndex: i * chunkSize + j }));
    const chunkHash = await computeChunkHash(rowsWithIndex);
    out.push({ fileId, chunkIndex: i, chunkHash, rows: rowsWithIndex });
  }
  return out;
}
```

Bước 6 — Tích hợp vào Next.js (client component):
```tsx
"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { buildChunkRequests } from "./prepareChunks";
import { uploadChunks } from "./upload";

export default function UploadPage() {
  const [resumeFrom, setResumeFrom] = useState(0);
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const rows = json.map((r: any, idx: number) => ({
      rowIndex: idx,
      email: String(r.email || r.Email || r["Email"]).trim(),
      name: String(r.name || r.Name || r["Name"]).trim(),
      phone: String(r.phone || r.Phone || r["Phone"]).trim(),
    }));
    const fileId = `upload-${Date.now()}-${file.name}`;
    const chunkRequests = await buildChunkRequests(fileId, rows, 200);
    const toSend = chunkRequests.filter(c => c.chunkIndex >= resumeFrom);
    await uploadChunks({ url: "/api/v1/stream", chunks: toSend, resumeFrom });
  }
  return (
    <div style={{ padding: 24 }}>
      <h1>Excel Stream Upload</h1>
      <label>
        Resume from chunk:&nbsp;
        <input type="number" value={resumeFrom} onChange={e => setResumeFrom(parseInt(e.target.value || "0", 10))} />
      </label>
      <div style={{ marginTop: 12 }}>
        <input type="file" accept=".xlsx,.xls" onChange={onFileChange} />
      </div>
    </div>
  );
}
```

## 8) Best practices & giới hạn
- Chunk size: 200–300 rows; tránh > 500 để hạn chế GC spike.
- Không `collectList()` ở FE/BE để giữ streaming.
- Dùng Web Worker khi parse file lớn để tránh block UI.
- Tên cột Excel nên map rõ sang `RowData`.
