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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {backHref ? (
          <div className="mb-2">
            <Link href={backHref} className="text-sm text-gray-600 hover:text-gray-900">
              {backLabel}
            </Link>
          </div>
        ) : null}

        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description ? <p className="text-gray-500 mt-1">{description}</p> : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
