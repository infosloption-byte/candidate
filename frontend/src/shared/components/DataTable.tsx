import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

export const DataTable = <T,>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) => (
  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead className="bg-slate-50">
          <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {columns.map((column) => (
              <th key={column.key} className={`px-5 py-3 ${column.className ?? ''}`}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-8 text-center text-xs text-slate-400">{emptyMessage}</td>
            </tr>
          ) : rows.map((row) => (
            <tr key={getRowKey(row)} className="text-sm">
              {columns.map((column) => (
                <td key={column.key} className={`px-5 py-4 ${column.className ?? ''}`}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
