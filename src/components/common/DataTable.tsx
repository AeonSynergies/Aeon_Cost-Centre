"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: { icon?: React.ReactNode; heading: string; subtext?: string; cta?: React.ReactNode };
  /** number of skeleton rows while loading */
  skeletonRows?: number;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  onRowClick,
  empty,
  skeletonRows = 8,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [openFilter, setOpenFilter] = React.useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#E8ECF4] bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-max border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F8F9FC]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[#E8ECF4]">
                {hg.headers.map((header) => {
                  const canFilter = header.column.getCanFilter();
                  return (
                    <th
                      key={header.id}
                      className="whitespace-nowrap px-3.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[#64748B]"
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-[#0F1629]"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown size={10} className="opacity-50" />
                          )}
                        </button>
                        {canFilter && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenFilter(openFilter === header.id ? null : header.id)
                              }
                              className="rounded p-0.5 hover:bg-[#E8ECF4]"
                            >
                              <ChevronDown size={11} />
                            </button>
                            {openFilter === header.id && (
                              <div className="absolute left-0 top-6 z-20 w-44 rounded-[7px] border border-[#E8ECF4] bg-white p-2 shadow-lg">
                                <input
                                  autoFocus
                                  placeholder="Filter…"
                                  value={(header.column.getFilterValue() as string) ?? ""}
                                  onChange={(e) =>
                                    header.column.setFilterValue(e.target.value)
                                  }
                                  className="h-[28px] w-full rounded border border-[#E8ECF4] px-2 text-[12px] normal-case outline-none focus:border-[#3266AD]"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-[#E8ECF4]">
                  {columns.map((_c, j) => (
                    <td key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "border-b border-[#E8ECF4] text-[12px] text-[#0F1629]",
                    onRowClick && "cursor-pointer hover:bg-[#F8F9FC]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3.5 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <div className="text-[#94A3B8]">{empty?.icon}</div>
            <div className="text-[14px] font-semibold text-[#0F1629]">
              {empty?.heading ?? "No records"}
            </div>
            {empty?.subtext && (
              <div className="max-w-sm text-[12px] text-[#64748B]">{empty.subtext}</div>
            )}
            {empty?.cta && <div className="mt-2">{empty.cta}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
