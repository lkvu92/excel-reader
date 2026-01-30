"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import type { UploadError } from "@/lib/types/upload";

interface ErrorListProps {
    errors: UploadError[];
}

export function ErrorList({ errors }: ErrorListProps) {
    if (errors.length === 0) {
        return null;
    }

    // Nhóm lỗi theo scope
    const rowErrors = errors.filter((e) => e.scope === "row");
    const chunkErrors = errors.filter((e) => e.scope === "chunk");
    const systemErrors = errors.filter((e) => e.scope === "system");

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Danh sách lỗi ({errors.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {systemErrors.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Lỗi hệ thống</h4>
                        <div className="space-y-2">
                            {systemErrors.map((error, idx) => (
                                <Alert key={idx} variant="destructive">
                                    <AlertTitle className="text-sm">
                                        {error.code}
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        {error.message}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </div>
                )}

                {chunkErrors.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Lỗi chunk</h4>
                        <div className="space-y-2">
                            {chunkErrors.map((error, idx) => (
                                <Alert key={idx} variant="destructive">
                                    <AlertTitle className="text-sm flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            Chunk {error.chunkIndex}
                                        </Badge>
                                        {error.code}
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        {error.message}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </div>
                )}

                {rowErrors.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-2">
                            Lỗi dòng dữ liệu ({rowErrors.length})
                        </h4>
                        <div className="max-h-[300px] overflow-auto space-y-2">
                            {rowErrors.map((error, idx) => (
                                <Alert key={idx} variant="destructive">
                                    <AlertTitle className="text-sm flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            Dòng {(error.rowIndex ?? 0) + 1}
                                        </Badge>
                                        {error.code}
                                    </AlertTitle>
                                    <AlertDescription className="text-xs space-y-1">
                                        <p>{error.message}</p>
                                        {(error.field || error.value) && (
                                            <div className="flex gap-2 font-mono mt-1 opacity-80">
                                                {error.field && (
                                                    <span>Trường: <span className="font-bold">{error.field}</span></span>
                                                )}
                                                {error.value && (
                                                    <span>Giá trị: <span className="font-bold">"{error.value}"</span></span>
                                                )}
                                            </div>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
