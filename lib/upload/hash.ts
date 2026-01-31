/**
 * Convert ArrayBuffer to hex string
 */
function toHex(buffer: ArrayBuffer): string {
    return [...new Uint8Array(buffer)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Canonical keys for consistent hashing
 */
export const CANONICAL_KEYS = [
    "address",
    "company",
    "email",
    "name",
    "note",
    "phone",
    "rowIndex",
];

/**
 * Create canonical JSON string from rows (sorted keys)
 * This ensures consistent hash generation between client and server
 */
export function canonicalStringifyRows(rows: any[]): string {
    if (!rows || rows.length === 0) return "[]";
    return JSON.stringify(rows, CANONICAL_KEYS);
}

/**
 * Compute SHA-256 hash of rows using canonical JSON
 * @param rows - Array of row objects
 * @returns Hex-encoded SHA-256 hash
 */
export async function computeChunkHash(rows: any[]): Promise<string> {
    const canonical = canonicalStringifyRows(rows);
    const buf = new TextEncoder().encode(canonical);
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return toHex(hash);
}
