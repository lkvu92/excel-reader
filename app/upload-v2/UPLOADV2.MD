# Excel Processing Service - Spring WebFlux Reactive

## Kiến trúc Overview

```
Frontend (React)
    ↓
[1] File Upload → Worker split chunks (5MB/chunk)
    ↓
[2] Send multipart chunks + metadata + field definitions
    ↓
Backend (Spring WebFlux)
    ↓
[3] Merge chunks → Complete file
    ↓
[4] Parse Excel (Apache POI)
    ↓
[5] Process in chunks (100 rows/chunk)
    ↓
[6] Validate each row (type, required, format)
    ↓
[7] Stream progress via SSE
    ↓
Frontend
    ↓
[8] Update UI (progress bar, invalid rows table)
```

## Flow Chi Tiết

### 1. Frontend - File Chunking
```javascript
// Chunk file thành 5MB chunks
const chunks = await chunkFile(file, 5 * 1024 * 1024);

// Prepare multipart request
const formData = new FormData();
chunks.forEach((chunk, index) => {
  formData.append('chunks', chunk, `chunk_${index}`);
});

// Add field definitions
const fields = [
  { name: 'email', type: 'email', required: true },
  { name: 'age', type: 'number', required: false, minValue: 18 }
];
formData.append('fields', JSON.stringify(fields));
```

### 2. Backend - Merge Chunks
```java
// ExcelProcessingService.mergeChunks()
// - Nhận Flux<FilePart> chunks
// - Save từng chunk vào temp directory
// - Merge all chunks thành 1 file
// - Return Path to merged file
```

### 3. Backend - Parse & Validate
```java
// ExcelProcessingService.parseAndProcessExcel()
// - Open Excel file với Apache POI
// - Skip header row
// - Process từng row:
//   - Parse row data theo field definitions
//   - Validate (type, required, format, pattern)
//   - Collect vào batch 100 rows
// - Emit progress qua SSE mỗi batch
```

### 4. SSE Stream Format
```json
{
  "status": "processing",
  "chunk": 5,
  "totalRows": 1000,
  "processedRows": 500,
  "percentage": 50,
  "invalidRows": [
    {
      "rowNumber": 234,
      "errors": [
        {
          "field": "email",
          "error": "Invalid email format",
          "errorCode": "INVALID_EMAIL_FORMAT",
          "actualValue": "invalid-email"
        }
      ]
    }
  ]
}
```

## Field Types & Validation

### Supported Types
1. **string** - Text validation với maxLength
2. **number** - Number validation với minValue, maxValue
3. **boolean** - Boolean validation (true/false)
4. **date** - Date validation
5. **email** - Email format validation với regex

### Field Definition Example
```java
FieldDefinition.builder()
    .name("email")
    .type("email")
    .required(true)
    .pattern("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")
    .build()
```

### Validation Rules
- **REQUIRED**: Check if field value is empty
- **INVALID_TYPE**: Check if value matches expected type
- **INVALID_FORMAT**: Check format (email, date, etc)
- **MAX_LENGTH_EXCEEDED**: String length validation
- **MIN_VALUE_VIOLATION**: Number min value
- **MAX_VALUE_VIOLATION**: Number max value
- **PATTERN_MISMATCH**: Custom regex pattern

## Performance Optimization

### 1. Reactive Processing
- Non-blocking I/O với WebFlux
- Backpressure handling với Reactor
- Stream processing thay vì load toàn bộ vào memory

### 2. Chunking Strategy
```java
// Frontend: 5MB chunks cho upload
// Backend: 100 rows chunks cho processing
private static final int CHUNK_SIZE = 100;
```

### 3. Memory Management
```yaml
spring:
  codec:
    max-in-memory-size: 16MB
  webflux:
    multipart:
      max-in-memory-size: 10MB
      max-disk-usage-per-part: 100MB
```

### 4. Threading
```java
// Use boundedElastic scheduler cho I/O operations
.subscribeOn(Schedulers.boundedElastic())
```

### 5. Cleanup
```java
// Auto cleanup temp files sau khi process
doFinally(signal -> cleanupTempFiles(sessionId))
```

## Error Handling

### 1. Upload Errors
- File size exceeded
- Invalid file format
- Network errors

### 2. Processing Errors
- Excel parsing errors
- Validation errors
- Memory errors

### 3. Cancellation
```javascript
// Frontend cancel
await fetch(`/api/excel/process/${sessionId}`, { method: 'DELETE' });

// Backend handle
public Mono<Void> cancelProcessing(String sessionId) {
    cancelFlags.put(sessionId, true);
    cleanupTempFiles(sessionId);
}
```

## Testing

### 1. Unit Tests
```java
@Test
void testValidateEmail() {
    FieldDefinition field = FieldDefinition.builder()
        .name("email")
        .type("email")
        .required(true)
        .build();
    
    Map<String, Object> rowData = Map.of("email", "invalid-email");
    List<ValidationError> errors = validator.validate(rowData, List.of(field), 1);
    
    assertFalse(errors.isEmpty());
    assertEquals("INVALID_EMAIL_FORMAT", errors.get(0).getErrorCode());
}
```

### 2. Integration Tests
```java
@Test
void testExcelProcessingFlow() {
    // Create test Excel file
    // Send multipart request
    // Verify SSE stream
    // Check progress updates
    // Verify final result
}
```

## Configuration

### application.yml
```yaml
excel:
  processing:
    chunk-size: 100
    temp-dir: temp/excel/
    cleanup-after-hours: 24
  validation:
    max-errors-per-row: 10
```

## Deployment Considerations

### 1. Resources
- CPU: Ít nhất 2 cores cho parallel processing
- Memory: 2GB+ heap cho large files
- Disk: Đủ space cho temp files

### 2. Scaling
- Horizontal scaling: Multiple instances với load balancer
- Vertical scaling: Tăng memory cho large files
- Consider distributed processing cho very large files (>100MB)

### 3. Monitoring
```java
// Add metrics
@Timed("excel.processing.duration")
@Counted("excel.processing.count")
public Flux<ProcessingProgress> processExcelWithChunks(...)
```

## Best Practices

### 1. File Size Limits
- Frontend chunk: 5MB (có thể adjust)
- Max file size: 500MB (có thể adjust)
- Process chunk: 100 rows (có thể adjust theo use case)

### 2. Session Management
- Use unique sessionId cho mỗi upload
- Cleanup expired sessions định kỳ
- Store session info nếu cần resume

### 3. Error Messages
- Clear, actionable error messages
- Include row number và field name
- Provide suggestion để fix

### 4. Progress Updates
- Update mỗi 100 rows (balance between real-time và performance)
- Include percentage cho progress bar
- Send invalid rows incrementally hoặc at the end

## Improvements & Extensions

### 1. Advanced Features
- [ ] Resume upload nếu disconnect
- [ ] Parallel validation với virtual threads (Java 21+)
- [ ] Export invalid rows to Excel
- [ ] Support multiple sheets
- [ ] Custom validation rules via script

### 2. Performance
- [ ] Use virtual threads thay vì boundedElastic
- [ ] Implement caching cho repeated validations
- [ ] Batch database inserts nếu cần persist
- [ ] Compression cho SSE stream

### 3. Security
- [ ] File type validation (magic bytes)
- [ ] Virus scanning
- [ ] Rate limiting
- [ ] Authentication & Authorization

## Troubleshooting

### Issue: Out of Memory
**Solution**: Reduce chunk size hoặc increase heap memory
```
-Xmx2g -Xms1g
```

### Issue: SSE Connection Timeout
**Solution**: Add keepalive
```java
.doOnNext(progress -> /* send keepalive every 30s */)
```

### Issue: Slow Processing
**Solution**: 
- Use parallel processing
- Optimize validation logic
- Consider streaming parser (SAX) cho very large files

## API Documentation

### POST /api/excel/process
**Request:**
- Content-Type: multipart/form-data
- chunks: FilePart[] (multiple chunks)
- totalChunks: int
- fileName: string
- sessionId: string
- fields: FieldDefinition[]
- metadata: ChunkMetadata

**Response:**
- Content-Type: text/event-stream
- Stream: ProcessingProgress events

### DELETE /api/excel/process/{sessionId}
**Request:** sessionId path variable
**Response:** 200 OK