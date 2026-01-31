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
                <CardTitle>Processed Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {rows.length} rows processed
                    {errors.length > 0 && (
                        <span className="text-destructive ml-2">
                            ({errors.filter(e => e.rowIndex !== null).length} errors)
                        </span>
                    )}
                </p>
            </CardHeader>
            <CardContent>
                <Table containerClassName="max-h-[400px] overflow-auto rounded-md border">
                    <TableHeader className="bg-muted sticky top-0 z-20 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[80px] bg-muted">Row</TableHead>
                            <TableHead className="bg-muted">Email</TableHead>
                            <TableHead className="bg-muted">Name</TableHead>
                            <TableHead className="bg-muted">Phone</TableHead>
                            <TableHead className="bg-muted">Address</TableHead>
                            <TableHead className="bg-muted">Company</TableHead>
                            <TableHead className="bg-muted">Note</TableHead>
                            <TableHead className="w-[100px] bg-muted">Status</TableHead>
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
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.phone}</TableCell>
                                        <TableCell>{row.address}</TableCell>
                                        <TableCell>{row.company}</TableCell>
                                        <TableCell>{row.note}</TableCell>
                                        <TableCell>
                                            {hasError ? (
                                                <Badge variant="destructive" className="text-xs">
                                                    Error
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
            </CardContent>
        </Card>
    );
}
