/**
 * Split an array into chunks of specified size
 * @param arr - Array to split
 * @param size - Size of each chunk (default: 200)
 * @returns Array of chunks
 */
export function chunkArray<T>(arr: T[], size = 200): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}
