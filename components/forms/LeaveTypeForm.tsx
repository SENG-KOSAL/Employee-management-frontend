'use client'
import React, { useState } from 'react'

export default function LeaveTypeForm(props: {
  onCreate: (input: { name: string; code?: string; is_paid: boolean }) => Promise<void>
}) {
  const { onCreate } = props
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isPaid, setIsPaid] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onCreate({
        name: name.trim(),
        code: code.trim() ? code.trim() : undefined,
        is_paid: isPaid,
      })
      setName('')
      setCode('')
      setIsPaid(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to create leave type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 220 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Leave type</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Annual Leave"
          style={{ width: '100%', padding: 8,  borderRadius: 6, border: '1px solid #000104ff' }}
        />
      </div>

      <div style={{ minWidth: 160 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>Code (optional)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. AL"
          style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #000000ff' }}
        />
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
        <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
        Paid leave
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{ padding: '8px 12px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 6 }}
      >
        {loading ? 'Saving...' : 'Add'}
      </button>

      {error ? <div style={{ width: '100%', color: 'crimson' }}>{error}</div> : null}
    </form>
  )
}