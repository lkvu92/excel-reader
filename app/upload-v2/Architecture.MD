# Architecture Diagram & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐      ┌─────────────┐      ┌──────────────┐      │
│  │   File       │──────▶│   Worker    │──────▶│  Chunk       │      │
│  │   Upload     │      │   Split     │      │  (5MB each)  │      │
│  └──────────────┘      └─────────────┘      └──────────────┘      │
│                                                      │              │
│                                                      ▼              │
│                                        ┌──────────────────────┐    │
│                                        │  FormData            │    │
│                                        │  - chunks[]          │    │
│                                        │  - fields[]          │    │
│                                        │  - metadata          │    │
│                                        └──────────────────────┘    │
│                                                      │              │
│                                                      ▼              │
│                                        ┌──────────────────────┐    │
│                                        │  HTTP POST           │    │
│                                        │  /api/excel/process  │    │
│                                        └──────────────────────┘    │
│                                                      │              │
└──────────────────────────────────────────────────────┼──────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Spring WebFlux)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              ExcelProcessingController                      │   │
│  │  @PostMapping(produces = TEXT_EVENT_STREAM_VALUE)          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │              ExcelProcessingService                         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                  │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────┐   ┌───────────────┐   ┌──────────────┐          │
│  │   Merge     │   │  Parse Excel  │   │  Validate    │          │
│  │   Chunks    │──▶│  (Apache POI) │──▶│  Rows        │          │
│  └─────────────┘   └───────────────┘   └──────────────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │              Reactive Stream (Flux)                      │      │
│  │  - chunk by chunk (100 rows)                            │      │
│  │  - non-blocking I/O                                     │      │
│  │  - backpressure handling                                │      │
│  └─────────────────────────────────────────────────────────┘      │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │              SSE Stream (Server-Sent Events)            │      │
│  │                                                          │      │
│  │  data: {                                                │      │
│  │    "status": "processing",                              │      │
│  │    "chunk": 5,                                          │      │
│  │    "totalRows": 1000,                                   │      │
│  │    "processedRows": 500,                                │      │
│  │    "percentage": 50,                                    │      │
│  │    "invalidRows": [...]                                 │      │
│  │  }                                                       │      │
│  └─────────────────────────────────────────────────────────┘      │
│                             │                                       │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐      ┌─────────────┐      ┌──────────────┐      │
│  │  EventSource │──────▶│   Parse     │──────▶│  Update UI   │      │
│  │  Listener    │      │   JSON      │      │  - Progress  │      │
│  └──────────────┘      └─────────────┘      │  - Table     │      │
│                                              │  - Errors    │      │
│                                              └──────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
1. USER UPLOADS FILE
   ├─▶ File selected in browser
   ├─▶ Web Worker splits file into 5MB chunks
   ├─▶ Creates FormData with chunks + metadata + field definitions
   └─▶ Sends multipart POST request

2. BACKEND RECEIVES REQUEST
   ├─▶ Controller receives Flux<FilePart> chunks
   ├─▶ Service starts merging chunks
   │   ├─▶ Save each chunk to temp directory
   │   ├─▶ Merge all chunks sequentially
   │   └─▶ Delete individual chunks after merge
   └─▶ Return merged file path

3. PARSE EXCEL
   ├─▶ Open Excel file with Apache POI (XSSFWorkbook)
   ├─▶ Get first sheet
   ├─▶ Skip header row
   └─▶ Iterate through data rows

4. PROCESS & VALIDATE (Per 100 rows)
   ├─▶ Parse row → Map<fieldName, value>
   ├─▶ Validate each field
   │   ├─▶ Required check
   │   ├─▶ Type check (string, number, boolean, date, email)
   │   ├─▶ Format check (email regex, etc)
   │   ├─▶ Range check (minValue, maxValue, maxLength)
   │   └─▶ Pattern check (custom regex)
   ├─▶ Collect validation errors
   ├─▶ Add to current batch
   └─▶ When batch reaches 100 rows
       ├─▶ Create ProcessingProgress object
       ├─▶ Emit via SSE stream
       └─▶ Clear batch

5. SSE STREAM TO FRONTEND
   ├─▶ Backend emits progress events
   ├─▶ Frontend EventSource listener receives
   ├─▶ Parse JSON data
   └─▶ Update UI
       ├─▶ Progress bar
       ├─▶ Row counts
       └─▶ Invalid rows table

6. COMPLETION
   ├─▶ Backend sends final status
   │   ├─▶ status: "completed"
   │   ├─▶ totalRows: X
   │   └─▶ All invalidRows[]
   ├─▶ Close SSE connection
   ├─▶ Cleanup temp files
   └─▶ Frontend shows final result
```

## Component Responsibilities

### Frontend Components

#### 1. File Upload Component
```javascript
Responsibilities:
- File selection
- Chunk file into 5MB parts
- Prepare FormData
- Handle upload errors
```

#### 2. SSE Listener
```javascript
Responsibilities:
- Establish EventSource connection
- Parse SSE messages
- Handle connection errors
- Close connection on complete
```

#### 3. Progress Display
```javascript
Responsibilities:
- Show progress bar
- Display row counts
- Update percentage
- Show status (uploading, processing, completed)
```

#### 4. Invalid Rows Table
```javascript
Responsibilities:
- Display validation errors
- Show row numbers
- Display field names and error messages
- Highlight error types
```

### Backend Components

#### 1. ExcelProcessingController
```java
Responsibilities:
- Receive multipart request
- Parse request parameters
- Delegate to service
- Return SSE stream
```

#### 2. ExcelProcessingService
```java
Responsibilities:
- Merge chunks
- Parse Excel file
- Chunk rows (100 per batch)
- Coordinate validation
- Stream progress via SSE
- Cleanup temp files
```

#### 3. ExcelRowValidator
```java
Responsibilities:
- Validate field values
- Check required fields
- Validate data types
- Check formats (email, etc)
- Validate ranges and patterns
- Return ValidationError list
```

## Field Type Validation Details

### String Type
```java
Validations:
- Required check
- Max length check
- Custom pattern (regex)

Example:
{
  "name": "fullName",
  "type": "string",
  "required": true,
  "maxLength": 100
}
```

### Number Type
```java
Validations:
- Required check
- Type check (can parse as number)
- Min value check
- Max value check

Example:
{
  "name": "age",
  "type": "number",
  "required": true,
  "minValue": 18,
  "maxValue": 100
}
```

### Email Type
```java
Validations:
- Required check
- Type check (is string)
- Format check (email regex)

Pattern: ^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$

Example:
{
  "name": "email",
  "type": "email",
  "required": true
}
```

### Date Type
```java
Validations:
- Required check
- Type check (is Date object)

Example:
{
  "name": "joinDate",
  "type": "date",
  "required": true
}
```

### Boolean Type
```java
Validations:
- Required check
- Type check (is boolean or "true"/"false")

Example:
{
  "name": "isActive",
  "type": "boolean",
  "required": false
}
```

## Error Codes Reference

| Error Code | Description | Field Types | Example |
|-----------|-------------|-------------|---------|
| REQUIRED | Field is required but empty | All | Value is null/empty |
| INVALID_TYPE | Value type doesn't match expected | All | String where number expected |
| INVALID_EMAIL_FORMAT | Email format invalid | email | "notanemail" |
| MAX_LENGTH_EXCEEDED | String too long | string | 150 chars when max is 100 |
| MIN_VALUE_VIOLATION | Number below minimum | number | 15 when min is 18 |
| MAX_VALUE_VIOLATION | Number above maximum | number | 150 when max is 100 |
| PATTERN_MISMATCH | Doesn't match regex | string, email | Custom pattern failed |
| INVALID_FORMAT | General format error | date, number | "abc" as number |

## Configuration Examples

### Small Files (<10MB)
```yaml
excel:
  processing:
    chunk-size: 50
spring:
  webflux:
    multipart:
      max-in-memory-size: 10MB
```

### Medium Files (10-100MB)
```yaml
excel:
  processing:
    chunk-size: 100
spring:
  webflux:
    multipart:
      max-in-memory-size: 20MB
      max-disk-usage-per-part: 100MB
```

### Large Files (>100MB)
```yaml
excel:
  processing:
    chunk-size: 200
spring:
  webflux:
    multipart:
      max-in-memory-size: 50MB
      max-disk-usage-per-part: 200MB
```

## Testing Strategy

### Unit Tests
- ExcelRowValidator validation logic
- Field type checking
- Error message generation

### Integration Tests
- End-to-end file processing
- SSE stream verification
- Chunk merging
- Temp file cleanup

### Load Tests
- Concurrent uploads
- Large file processing
- Memory usage under load
- SSE connection handling

## Deployment Architecture

```
┌─────────────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ App 1 │ │ App 2 │  Spring WebFlux Instances
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│  Shared Storage │  For temp files (NFS/S3)
└─────────────────┘
```

## Key Takeaways

1. **Reactive All The Way**: Non-blocking từ upload đến validate đến stream
2. **Memory Efficient**: Không load toàn bộ file vào memory
3. **Real-time Feedback**: SSE cho progress updates ngay lập tức
4. **Scalable**: Horizontal scaling với stateless processing
5. **Error Handling**: Comprehensive validation với clear error messages
6. **Production Ready**: Cleanup, monitoring, cancellation support