'use client'
import React, { useState } from 'react'

export default function LeaveTypeForm(props: {
  onCreate: (input: { name: string; code?: string; is_paid: boolean; default_days: number; days_per_year?: number }) => Promise<void>
}) {
  const { onCreate } = props
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isPaid, setIsPaid] = useState(true)
  const [daysPerYear, setDaysPerYear] = useState('')
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
        default_days: Number(daysPerYear) || 0,
        days_per_year: Number(daysPerYear) || 0,
      })
      setName('')
      setCode('')
      setIsPaid(true)
      setDaysPerYear('')
    } catch (err: any) {
      setError(err?.message || 'Failed to create leave type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        padding: 12,
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        background: '#f8fafc',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div style={{ minWidth: 240, flex: '1 1 260px' }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, color: '#0f172a' }}>
          Leave type <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Annual Leave"
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ minWidth: 180, flex: '1 1 200px' }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, color: '#0f172a' }}>Code (optional)</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. AL"
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            fontSize: 14,
          }}
        />
      </div>

        <div style={{ minWidth: 200, flex: '1 1 220px' }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, color: '#0f172a' }}>
            Days allowed / year <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            required
            type="number"
            min={0}
            value={daysPerYear}
            onChange={(e) => setDaysPerYear(e.target.value)}
            placeholder="e.g. 12"
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#0f172a',
              fontSize: 14,
            }}
          />
        </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, color: '#0f172a', fontWeight: 500 }}>
        <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
        Paid leave
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 16px',
          background: 'var(--brand, #2563eb)',
          color: '#fff',
          border: '1px solid #1d4ed8',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
          transition: 'transform 120ms ease, box-shadow 120ms ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        {loading ? 'Saving...' : 'Add leave type'}
      </button>

      {error ? <div style={{ width: '100%', color: 'crimson', fontWeight: 500 }}>{error}</div> : null}
    </form>
  )
}