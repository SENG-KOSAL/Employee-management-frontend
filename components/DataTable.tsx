import React from 'react'

type Column<T> = {
  header: string
  render: (row: T) => React.ReactNode
  width?: number | string
}

export default function DataTable<T extends { id: number }>(props: {
  columns: Column<T>[]
  rows: T[]
  emptyText?: string
  zebraRows?: boolean
}) {
  const { columns, rows, emptyText = 'No data.', zebraRows = true } = props

  return (
    <div className="ui-card mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/85">
          <tr className="text-left">
            {columns.map((c, idx) => (
              <th
                key={idx}
                style={{ width: c.width }}
                className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-14 text-center text-slate-500">
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M7 8h10M7 12h6" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`ui-row-hover transition-colors hover:bg-indigo-50/40 ${zebraRows && rowIndex % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
              >
                {columns.map((c, idx) => (
                  <td key={idx} className="border-b border-slate-100 px-4 py-3.5 text-sm text-slate-700">
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}