'use client'
import React, { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../../components/PageHeadder'
import DataTable from '../../../components/DataTable'
import BenefitForm from '../../../components/forms/BenefitForm'
import type { BenefitItem } from '../../../types/hr'
import { benefitsService } from '../../../services/benefits'
import { HRMSSidebar } from '@/components/layout/HRMSSidebar'
export default function BenefitsPage() {
  const [benefitRows, setBenefitRows] = useState<BenefitItem[]>([])
  const [deductionRows, setDeductionRows] = useState<BenefitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setError(null)
    setLoading(true)
    try {
      const [benefitsRes, deductionsRes] = await Promise.all([
        benefitsService.listBenefits(),
        benefitsService.listDeductions(),
      ])

      const benefitsItems = (benefitsRes as any)?.data?.data ?? (benefitsRes as any)?.data ?? []
      const deductionsItems = (deductionsRes as any)?.data?.data ?? (deductionsRes as any)?.data ?? []
      const normalizedBenefits = Array.isArray(benefitsItems)
        ? benefitsItems.map((b: any) => ({
            ...b,
            name: b?.benefit_name ?? b?.name ?? 'Benefit',
            amount: Number(b?.amount ?? 0),
            amountType: b?.type,
            type: b?.type,
          }))
        : []
      const normalizedDeductions = Array.isArray(deductionsItems)
        ? deductionsItems.map((d: any) => ({
            ...d,
            name: d?.deduction_name ?? d?.name ?? 'Deduction',
            amount: Number(d?.amount ?? 0),
            amountType: d?.type,
            type: d?.type,
          }))
        : []

      setBenefitRows(normalizedBenefits)
      setDeductionRows(normalizedDeductions)
    } catch (e: any) {
      setError(e?.message || 'Failed to load benefits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create(input: {
    name: string
    type: 'benefit' | 'deduction'
    amount: number
    amountType: 'fixed' | 'percentage'
  }) {
    if (input.type === 'benefit') {
      await benefitsService.createBenefit({
        benefit_name: input.name,
        amount: input.amount,
        type: input.amountType,
      })
    } else {
      await benefitsService.createDeduction({
        deduction_name: input.name,
        amount: input.amount,
        type: input.amountType,
      })
    }
    await load()
  }

  async function remove(id: number) {
    if (!confirm('Delete this item?')) return
    // Try both benefit then deduction endpoints
    try {
      await benefitsService.removeBenefit(id)
    } catch {
      await benefitsService.removeDeduction(id)
    }
    await load()
  }

  const benefits = useMemo(() => benefitRows, [benefitRows])
  const deductions = useMemo(() => deductionRows, [deductionRows])

  return (
    <HRMSSidebar>
    <div className="space-y-6">
      <PageHeader
        title="Benefits & Deductions"
        description="Create benefit and deduction templates. Assign them to employees on the employee create page."
        backHref="/settings"
        backLabel="← Settings"
      />

      <div className="bg-white/80 border border-gray-200 rounded-2xl p-5 shadow-md backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  Catalog
                </p>
                <span className="text-xs text-gray-500">Create reusable items</span>
              </div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Add new benefit or deduction</h4>
              <p className="text-sm text-gray-600 mb-3">Later, assign these to employees on the employee create page.</p>
              <BenefitForm onCreate={create} />
            </div>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600 mt-2">{error}</p> : null}
        {loading ? <p className="text-sm text-gray-500 mt-2">Loading...</p> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white/90 border border-gray-200 rounded-2xl shadow-md p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Benefits</h3>
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
              {benefits.length} item(s)
            </span>
          </div>
          <DataTable
            rows={benefits}
            columns={[
              { header: 'Name', render: (r) => r.name },
              {
                header: 'Type',
                width: 120,
                render: (r) => (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                    {(r as any).amountType === 'percentage' || (r as any).type === 'percentage' ? 'Percent' : 'Fixed'}
                  </span>
                ),
              },
              { header: 'Amount', render: (r) => Number(r.amount ?? 0).toFixed(2), width: 120 },
              {
                header: 'Actions',
                width: 120,
                render: (r) => (
                  <button
                    onClick={() => remove(r.id)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            emptyText="No benefits yet."
          />
        </section>

        <section className="bg-white/90 border border-gray-200 rounded-2xl shadow-md p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Deductions</h3>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
              {deductions.length} item(s)
            </span>
          </div>
          <DataTable
            rows={deductions}
            columns={[
              { header: 'Name', render: (r) => r.name },
              {
                header: 'Type',
                width: 120,
                render: (r) => (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    {(r as any).amountType === 'percentage' || (r as any).type === 'percentage' ? 'Percent' : 'Fixed'}
                  </span>
                ),
              },
              { header: 'Amount', render: (r) => Number(r.amount ?? 0).toFixed(2), width: 120 },
              {
                header: 'Actions',
                width: 120,
                render: (r) => (
                  <button
                    onClick={() => remove(r.id)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            emptyText="No deductions yet."
          />
        </section>
      </div>
    </div>
    </HRMSSidebar>
  )
}