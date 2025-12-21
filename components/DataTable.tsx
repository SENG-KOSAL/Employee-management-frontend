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
}) {
  const { columns, rows, emptyText = 'No data.' } = props

  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c, idx) => (
              <th
                key={idx}
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  borderBottom: '1px solid #e5e7eb',
                  width: c.width,
                  fontWeight: 600,
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 12, color: 'var(--muted)' }}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((c, idx) => (
                  <td key={idx} style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
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