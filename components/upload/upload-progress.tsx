"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pause, Play, X } from "lucide-react";
import { UploadAnimation } from "./upload-animation";
import type { UploadStatus, UploadProgress as UploadProgressType } from "@/lib/types/upload";

interface UploadProgressProps {
    status: UploadStatus;
    progress: UploadProgressType;
    percentage?: number;
    label?: string;
    onPause?: () => void;
    onResume?: () => void;
    onCancel?: () => void;
}

export function UploadProgress({
    status,
    progress,
    percentage: manualPercentage,
    label = "chunks",
    onPause,
    onResume,
    onCancel,
}: UploadProgressProps) {
    const calculatedPercentage = progress.total > 0
        ? Math.round((progress.processed / progress.total) * 100)
        : 0;

    const percentage = manualPercentage !== undefined ? manualPercentage : calculatedPercentage;

    const getStatusText = () => {
        switch (status) {
            case "uploading":
                return "Uploading...";
            case "paused":
                return "Paused";
            case "completed":
                return "Completed";
            case "error":
                return "Upload error";
            default:
                return "Ready to upload";
        }
    };

    if (status === "idle") return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-center">{getStatusText()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Lottie Animation - hiển thị trạng thái upload */}
                <div className="flex justify-center">
                    <UploadAnimation status={status} size={120} />
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progess</span>
                        <span className="font-medium">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        {progress.processed} / {progress.total} {label} processed
                    </p>
                </div>

                {status === "uploading" || status === "paused" ? (
                    <div className="flex gap-2 justify-center">
                        {status === "uploading" && onPause && (
                            <Button onClick={onPause} variant="outline" size="sm">
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                            </Button>
                        )}
                        {status === "paused" && onResume && (
                            <Button onClick={onResume} size="sm">
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                            </Button>
                        )}
                        {onCancel && (
                            <Button onClick={onCancel} variant="destructive" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        )}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
