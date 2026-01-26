'use client'
import React, { useState } from 'react'

export default function BenefitForm(props: {
  onCreate: (input: { name: string; type: 'benefit' | 'deduction'; amount: number; amountType: 'fixed' | 'percentage' }) => Promise<void>
}) {
  const { onCreate } = props
  const [name, setName] = useState('')
  const [type, setType] = useState<'benefit' | 'deduction'>('benefit')
  const [amount, setAmount] = useState<number>(0)
  const [amountType, setAmountType] = useState<'fixed' | 'percentage'>('fixed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await onCreate({
        name: name.trim(),
        type,
        amount: Number(amount),
        amountType,
      })
      setName('')
      setAmount(0)
      setType('benefit')
      setAmountType('fixed')
    } catch (err: any) {
      setError(err?.message || 'Failed to create item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Health Insurance"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="min-w-[160px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'benefit' | 'deduction')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="benefit">Benefit</option>
          <option value="deduction">Deduction</option>
        </select>
      </div>

      <div className="min-w-[160px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Type</label>
        <select
          value={amountType}
          onChange={(e) => setAmountType(e.target.value as 'fixed' | 'percentage')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="fixed">Fixed</option>
          <option value="percentage">Percentage</option>
        </select>
      </div>

      <div className="min-w-[140px]">
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
        <input
          required
          type="number"
          value={amount}
          min={0}
          step="0.01"
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="e.g. 50"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Saving...' : 'Add'}
      </button>

      {error ? <div className="w-full text-sm text-red-600">{error}</div> : null}
    </form>
  )
}