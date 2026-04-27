import Link from 'next/link'
import React from 'react'

export default function PageHeader(props: {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  right?: React.ReactNode
}) {
  const { title, description, backHref, backLabel = 'Back', right } = props

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
      <div>
        {backHref ? (
          <div className="mb-2">
            <Link href={backHref} className="text-sm font-medium text-slate-500 hover:text-slate-900">
              {backLabel}
            </Link>
          </div>
        ) : null}

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p> : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
