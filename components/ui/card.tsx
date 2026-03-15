import * as React from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={`ui-card rounded-2xl border border-gray-200/90 bg-white/95 shadow-sm ring-1 ring-black/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
      {...props}
    />
  )
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className = "", ...props }: CardHeaderProps) {
  return (
    <div className={`flex flex-col space-y-1.5 border-b border-gray-200/80 p-6 ${className}`} {...props} />
  )
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className = "", ...props }: CardFooterProps) {
  return (
    <div className={`flex items-center p-6 pt-4 ${className}`} {...props} />
  )
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className = "", ...props }: CardTitleProps) {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight text-gray-900 ${className}`} {...props} />
  )
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function CardDescription({ className = "", ...props }: CardDescriptionProps) {
  return <p className={`text-sm text-gray-500 leading-relaxed ${className}`} {...props} />
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className = "", ...props }: CardContentProps) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />
}
