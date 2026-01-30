"use client";

import { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RowData, UploadError } from "@/lib/types/upload";
import { cn } from "@/lib/utils";

interface DataTableProps {
    rows: RowData[];
    errors: UploadError[];
}

export function DataTable({ rows, errors }: DataTableProps) {
    // Tạo map các lỗi theo rowIndex để tra cứu nhanh
    const errorMap = useMemo(() => {
        const map = new Map<number, UploadError[]>();
        errors.forEach((error) => {
            if (error.rowIndex !== null) {
                const existing = map.get(error.rowIndex) || [];
                map.set(error.rowIndex, [...existing, error]);
            }
        });
        return map;
    }, [errors]);

    if (rows.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dữ liệu đã xử lý</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {rows.length} dòng đã xử lý
                    {errors.length > 0 && (
                        <span className="text-destructive ml-2">
                            ({errors.filter(e => e.rowIndex !== null).length} lỗi)
                        </span>
                    )}
                </p>
            </CardHeader>
            <CardContent>
                <div className="max-h-[400px] overflow-auto rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Dòng</TableHead>
                                <TableHead>Email</TableHead>
                                {/* <TableHead>Họ</TableHead> */}
                                {/* <TableHead>Tên</TableHead> */}
                                <TableHead>Số điện thoại</TableHead>
                                <TableHead>Địa chỉ</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead className="w-[100px]">Trạng thái</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => {
                                const rowErrors = errorMap.get(row.rowIndex);
                                const hasError = rowErrors && rowErrors.length > 0;

                                return (
                                    <TableRow
                                        key={row.rowIndex}
                                        className={cn(
                                            hasError && "bg-destructive/10 hover:bg-destructive/20"
                                        )}
                                    >
                                        <TableCell className="font-medium">
                                            {row.rowIndex + 1}
                                        </TableCell>
                                        <TableCell>{row.email}</TableCell>
                                        {/* <TableCell>{row.first_name}</TableCell> */}
                                        {/* <TableCell>{row.last_name}</TableCell> */}
                                        <TableCell>{row.phone}</TableCell>
                                        <TableCell>{row.address}</TableCell>
                                        <TableCell>{row.company}</TableCell>
                                        <TableCell>{row.note}</TableCell>
                                        <TableCell>
                                            {hasError ? (
                                                <Badge variant="destructive" className="text-xs">
                                                    Lỗi
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">
                                                    OK
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
