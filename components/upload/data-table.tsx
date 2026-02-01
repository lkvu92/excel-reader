"use client";

import { useState, useMemo } from "react";
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
import { PaginationCustom } from "./pagination-custom";

interface DataTableProps {
    rows: RowData[];
    errors: UploadError[];
}

export function DataTable({ rows, errors }: DataTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(200);

    // Tính toán dữ liệu hiển thị theo trang
    const totalPages = Math.ceil(rows.length / pageSize);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return rows.slice(start, start + pageSize);
    }, [rows, currentPage, pageSize]);

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

    // Reset về trang 1 nếu pageSize thay đổi hoặc rows thay đổi đáng kể
    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Processed Data</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Total {rows.length} rows processed
                        {errors.length > 0 && (
                            <span className="text-destructive ml-2">
                                ({errors.filter(e => e.rowIndex !== null).length} errors)
                            </span>
                        )}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                <Table className="table-fixed" containerClassName="h-[600px] overflow-auto rounded-md border">
                    <TableHeader className="bg-muted sticky top-0 z-20 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[80px] bg-muted">Row</TableHead>
                            <TableHead className="w-[150px] bg-muted truncate">Name</TableHead>
                            <TableHead className="w-[200px] bg-muted truncate">Email</TableHead>
                            <TableHead className="w-[150px] bg-muted truncate">Phone</TableHead>
                            <TableHead className="w-[200px] bg-muted truncate">Address</TableHead>
                            <TableHead className="w-[200px] bg-muted truncate">Company</TableHead>
                            <TableHead className="w-[200px] bg-muted truncate">Note</TableHead>
                            <TableHead className="w-[100px] bg-muted">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedRows.map((row) => {
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
                                    <TableCell className="truncate" title={row.name}>{row.name}</TableCell>
                                    <TableCell className="truncate" title={row.email}>{row.email}</TableCell>
                                    <TableCell className="truncate" title={row.phone}>{row.phone}</TableCell>
                                    <TableCell className="truncate" title={row.address}>{row.address}</TableCell>
                                    <TableCell className="truncate" title={row.company}>{row.company}</TableCell>
                                    <TableCell className="truncate" title={row.note}>{row.note}</TableCell>
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

                <PaginationCustom
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    totalItems={rows.length}
                />
            </CardContent>
        </Card>
    );
}

