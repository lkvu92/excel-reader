"use client";

import { useCallback } from "react";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
    error?: string;
}

export function UploadZone({ onFileSelect, disabled, error }: UploadZoneProps) {
    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
                onFileSelect(file);
            }
        },
        [onFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }, []);

    return (
        <Card>
            <CardContent className="p-6">
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                        disabled
                            ? "border-muted bg-muted/20 cursor-not-allowed"
                            : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer",
                        error && "border-destructive"
                    )}
                >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        Tải lên file Excel
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Kéo thả file Excel vào đây hoặc nhấn để chọn file
                    </p>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={disabled}
                        className="hidden"
                        id="file-upload"
                    />
                    <label htmlFor="file-upload">
                        <Button asChild disabled={disabled}>
                            <span>Chọn file</span>
                        </Button>
                    </label>
                    {error && (
                        <p className="text-sm text-destructive mt-4">{error}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
