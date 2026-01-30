import * as XLSX from "xlsx";

interface WorkerRequest {
    arrayBuffer: ArrayBuffer;
    chunkSize: number;
}

interface WorkerResponse {
    rows: Array<{
        rowIndex: number;
        email: string;
        // first_name: string;
        // last_name: string;
        phone: string;
        address: string;
        company: string;
        note: string;
    }>;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
    const { arrayBuffer } = e.data;

    try {
        // Parse Excel file
        const wb = XLSX.read(arrayBuffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Map to RowData format
        const rows = json.map((r: any, idx: number) => ({
            rowIndex: idx,
            email: String(r.email || r.Email || r["email"] || "").trim(),
            // first_name: String(r.first_name || r.FirstName || r["first_name"] || "").trim(),
            // last_name: String(r.last_name || r.LastName || r["last_name"] || "").trim(),
            phone: String(r.phone || r.Phone || r["phone"] || "").trim(),
            address: String(r.address || r.Address || r["address"] || "").trim(),
            company: String(r.company || r.Company || r["company"] || "").trim(),
            note: String(r.note || r.Note || r["note"] || "").trim(),
        }));

        const response: WorkerResponse = { rows };
        self.postMessage(response);
    } catch (error) {
        self.postMessage({
            error: error instanceof Error ? error.message : "Failed to parse Excel",
        });
    }
};

export { };
