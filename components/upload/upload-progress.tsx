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
    onPause?: () => void;
    onResume?: () => void;
    onCancel?: () => void;
}

export function UploadProgress({
    status,
    progress,
    onPause,
    onResume,
    onCancel,
}: UploadProgressProps) {
    const percentage = progress.total > 0
        ? Math.round((progress.processed / progress.total) * 100)
        : 0;

    const getStatusText = () => {
        switch (status) {
            case "uploading":
                return "Đang tải lên...";
            case "paused":
                return "Đã tạm dừng";
            case "completed":
                return "Hoàn thành";
            case "error":
                return "Lỗi tải lên";
            default:
                return "Sẵn sàng";
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
                        <span className="text-muted-foreground">Tiến độ</span>
                        <span className="font-medium">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        {progress.processed} / {progress.total} chunks đã xử lý
                    </p>
                </div>

                {status === "uploading" || status === "paused" ? (
                    <div className="flex gap-2 justify-center">
                        {status === "uploading" && onPause && (
                            <Button onClick={onPause} variant="outline" size="sm">
                                <Pause className="h-4 w-4 mr-2" />
                                Tạm dừng
                            </Button>
                        )}
                        {status === "paused" && onResume && (
                            <Button onClick={onResume} size="sm">
                                <Play className="h-4 w-4 mr-2" />
                                Tiếp tục
                            </Button>
                        )}
                        {onCancel && (
                            <Button onClick={onCancel} variant="destructive" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Hủy
                            </Button>
                        )}
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
