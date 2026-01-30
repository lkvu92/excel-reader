import * as XLSX from "xlsx";
import type { ValidationResult } from "../types/upload";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ROWS = 100000;
const ALLOWED_EXTENSIONS = /\.(xlsx|xls)$/i;

/**
 * Validate Excel file before upload
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export async function validateFile(file: File): Promise<ValidationResult> {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File quá lớn (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        };
    }

    // Check file extension
    if (!file.name.match(ALLOWED_EXTENSIONS)) {
        return {
            valid: false,
            error: "Chỉ chấp nhận file Excel (.xlsx, .xls)",
        };
    }

    // Quick row count check
    try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { sheetRows: 1 }); // Only read first row for metadata
        const ws = wb.Sheets[wb.SheetNames[0]];

        if (!ws["!ref"]) {
            return {
                valid: false,
                error: "File Excel trống hoặc không hợp lệ",
            };
        }

        const range = XLSX.utils.decode_range(ws["!ref"]);
        const rowCount = range.e.r - range.s.r;

        if (rowCount > MAX_ROWS) {
            return {
                valid: false,
                error: `Quá nhiều dòng (max ${MAX_ROWS.toLocaleString()})`,
            };
        }

        return { valid: true };
    } catch (err) {
        return {
            valid: false,
            error: "Không thể đọc file Excel",
        };
    }
}
