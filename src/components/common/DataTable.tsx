"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
  type Column,
  type ColumnDef,
  type FilterFn,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, Pin } from "lucide-react";
import { Skeleton } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Column-level config consumed by the filter panel + freeze logic.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    filterType?: "text" | "select" | "number" | "date";
    frozen?: boolean;
  }
}

const selectFilter: FilterFn<unknown> = (row, columnId, value: string[]) =>
  !value?.length || value.includes(String(row.getValue(columnId) ?? ""));
const numberFilter: FilterFn<unknown> = (row, columnId, value: { min?: number; max?: number }) => {
  const v = Number(row.getValue(columnId));
  if (Number.isNaN(v)) return false;
  if (value?.min != null && v < value.min) return false;
  if (value?.max != null && v > value.max) return false;
  return true;
};
const dateFilter: FilterFn<unknown> = (row, columnId, value: { from?: string; to?: string }) => {
  const raw = row.getValue(columnId);
  if (!raw) return false;
  const t = new Date(raw as string).getTime();
  if (value?.from && t < new Date(value.from).getTime()) return false;
  if (value?.to && t > new Date(value.to + "T23:59:59").getTime()) return false;
  return true;
};

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  empty?: { icon?: React.ReactNode; heading: string; subtext?: string; cta?: React.ReactNode };
  skeletonRows?: number;
  /** Column id to freeze at the left by default (defaults to the first column). */
  frozenColumnId?: string;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  onRowClick,
  empty,
  skeletonRows = 8,
  frozenColumnId,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [openFilter, setOpenFilter] = React.useState<string | null>(null);

  // Assign a filterFn to each column from its meta.filterType (respecting any explicit fn).
  const cols = React.useMemo(
    () =>
      columns.map((c) => {
        if (c.filterFn) return c;
        const ft = c.meta?.filterType;
        if (ft === "select") return { ...c, filterFn: selectFilter as FilterFn<T> };
        if (ft === "number") return { ...c, filterFn: numberFilter as FilterFn<T> };
        if (ft === "date") return { ...c, filterFn: dateFilter as FilterFn<T> };
        return c;
      }),
    [columns]
  );

  const firstColId = cols[0] && ("id" in cols[0] ? (cols[0] as { id?: string }).id : undefined) ||
    ((cols[0] as { accessorKey?: string })?.accessorKey);
  const [frozenId, setFrozenId] = React.useState<string | null>(frozenColumnId ?? firstColId ?? null);

  const table = useReactTable({
    data,
    columns: cols,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const rows = table.getRowModel().rows;
  const activeFilters = columnFilters.length;

  const frozenTd = (id: string) =>
    id === frozenId ? "sticky left-0 z-[15] bg-white group-hover:bg-[#F8F9FC] shadow-[2px_0_3px_-2px_rgba(15,22,41,0.15)]" : "";
  const frozenTh = (id: string) =>
    id === frozenId ? "sticky left-0 z-[25] bg-[#F8F9FC] shadow-[2px_0_3px_-2px_rgba(15,22,41,0.15)]" : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#E8ECF4] bg-white shadow-sm">
      {activeFilters > 0 && (
        <div className="flex items-center gap-2 border-b border-[#E8ECF4] bg-[#F8F9FC] px-3.5 py-1.5 text-[11px] text-[#64748B]">
          <span>{activeFilters} filter{activeFilters > 1 ? "s" : ""} active</span>
          <button className="text-[#3266AD] hover:underline" onClick={() => setColumnFilters([])}>Clear all</button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto" style={{ maxHeight: "calc(100vh - 248px)" }}>
        <table className="w-full min-w-max border-collapse">
          <thead className="sticky top-0 z-20 bg-[#F8F9FC]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[#E8ECF4]">
                {hg.headers.map((header) => {
                  const col = header.column;
                  const canFilter = col.getCanFilter();
                  const sortDir = col.getIsSorted();
                  const hasFilter = col.getFilterValue() != null && (col.getFilterValue() as unknown[] | string)?.toString().length > 0;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "whitespace-nowrap px-3.5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[#64748B]",
                        frozenTh(col.id)
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <button type="button" className="flex items-center gap-1 hover:text-[#0F1629]" onClick={col.getToggleSortingHandler()}>
                          {flexRender(col.columnDef.header, header.getContext())}
                          {col.getCanSort() && (sortDir === "asc" ? <ArrowUp size={11} className="text-[#3266AD]" /> : sortDir === "desc" ? <ArrowDown size={11} className="text-[#3266AD]" /> : <ArrowUpDown size={10} className="opacity-50" />)}
                        </button>
                        {canFilter && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenFilter(openFilter === header.id ? null : header.id)}
                              className={cn("relative rounded p-0.5 hover:bg-[#E8ECF4]", hasFilter && "text-[#3266AD]")}
                            >
                              <ChevronDown size={11} />
                              {hasFilter && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#3266AD]" />}
                            </button>
                            {openFilter === header.id && (
                              <ColumnFilterPanel
                                column={col as unknown as Column<unknown, unknown>}
                                frozen={col.id === frozenId}
                                onToggleFreeze={() => setFrozenId(col.id === frozenId ? null : col.id)}
                                onClose={() => setOpenFilter(null)}
                              />
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
                  {cols.map((_c, j) => (
                    <td key={j} className="px-3.5 py-3"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))}

            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn("group border-b border-[#E8ECF4] text-[12px] text-[#0F1629]", onRowClick && "cursor-pointer hover:bg-[#F8F9FC]")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={cn("px-3.5 py-2.5 align-middle", frozenTd(cell.column.id))}>
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
            <div className="text-[14px] font-semibold text-[#0F1629]">{empty?.heading ?? "No records"}</div>
            {empty?.subtext && <div className="max-w-sm text-[12px] text-[#64748B]">{empty.subtext}</div>}
            {empty?.cta && <div className="mt-2">{empty.cta}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnFilterPanel({
  column,
  frozen,
  onToggleFreeze,
  onClose,
}: {
  column: Column<unknown, unknown>;
  frozen: boolean;
  onToggleFreeze: () => void;
  onClose: () => void;
}) {
  const type = column.columnDef.meta?.filterType ?? "text";

  return (
    <div className="absolute left-0 top-6 z-30 w-56 rounded-[7px] border border-[#E8ECF4] bg-white p-2 shadow-lg">
      {type === "text" && (
        <div>
          <input
            autoFocus
            placeholder="Search…"
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value)}
            className="h-[28px] w-full rounded border border-[#E8ECF4] px-2 text-[12px] normal-case outline-none focus:border-[#3266AD]"
          />
          <button className="mt-1.5 text-[11px] text-[#3266AD] hover:underline" onClick={() => column.setFilterValue(undefined)}>Clear</button>
        </div>
      )}

      {type === "select" && <SelectFilter column={column} />}

      {type === "number" && <NumberFilter column={column} />}

      {type === "date" && <DateFilter column={column} />}

      <div className="mt-2 flex items-center justify-between border-t border-[#E8ECF4] pt-2">
        <label className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
          <input type="checkbox" checked={frozen} onChange={onToggleFreeze} className="accent-[#3266AD]" />
          <Pin size={11} /> Freeze this column
        </label>
        <button className="text-[11px] text-[#64748B] hover:text-[#0F1629]" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function SelectFilter({ column }: { column: Column<unknown, unknown> }) {
  const options = React.useMemo(() => Array.from(column.getFacetedUniqueValues().keys()).map((v) => String(v ?? "")).filter(Boolean).sort(), [column]);
  const selected = (column.getFilterValue() as string[]) ?? [];
  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    column.setFilterValue(next.length ? next : undefined);
  };
  return (
    <div>
      <div className="mb-1 flex gap-2 text-[11px]">
        <button className="text-[#3266AD] hover:underline" onClick={() => column.setFilterValue(options)}>Select all</button>
        <button className="text-[#64748B] hover:underline" onClick={() => column.setFilterValue(undefined)}>Clear all</button>
      </div>
      <div className="max-h-44 space-y-0.5 overflow-y-auto normal-case">
        {options.length === 0 && <div className="text-[11px] text-[#94A3B8]">No values</div>}
        {options.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-[12px]">
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="accent-[#3266AD]" />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

function NumberFilter({ column }: { column: Column<unknown, unknown> }) {
  const val = (column.getFilterValue() as { min?: number; max?: number }) ?? {};
  const set = (patch: { min?: number; max?: number }) => {
    const next = { ...val, ...patch };
    column.setFilterValue(next.min == null && next.max == null ? undefined : next);
  };
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" placeholder="Min" value={val.min ?? ""} onChange={(e) => set({ min: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-[28px] w-full rounded border border-[#E8ECF4] px-2 text-[12px] outline-none focus:border-[#3266AD]" />
      <span className="text-[#94A3B8]">–</span>
      <input type="number" placeholder="Max" value={val.max ?? ""} onChange={(e) => set({ max: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-[28px] w-full rounded border border-[#E8ECF4] px-2 text-[12px] outline-none focus:border-[#3266AD]" />
    </div>
  );
}

function DateFilter({ column }: { column: Column<unknown, unknown> }) {
  const val = (column.getFilterValue() as { from?: string; to?: string }) ?? {};
  const set = (patch: { from?: string; to?: string }) => {
    const next = { ...val, ...patch };
    column.setFilterValue(!next.from && !next.to ? undefined : next);
  };
  return (
    <div className="space-y-1.5">
      <div><div className="text-[10px] uppercase text-[#94A3B8]">From</div><input type="date" value={val.from ?? ""} onChange={(e) => set({ from: e.target.value || undefined })} className="h-[28px] w-full rounded border border-[#E8ECF4] px-2 text-[12px] outline-none focus:border-[#3266AD]" /></div>
      <div><div className="text-[10px] uppercase text-[#94A3B8]">To</div><input type="date" value={val.to ?? ""} onChange={(e) => set({ to: e.target.value || undefined })} className="h-[28px] w-full rounded border border-[#E8ECF4] px-2 text-[12px] outline-none focus:border-[#3266AD]" /></div>
    </div>
  );
}
