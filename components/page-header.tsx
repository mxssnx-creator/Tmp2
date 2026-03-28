"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ExchangeSelectorTop } from "@/components/exchange-selector-top"

interface PageHeaderProps {
  title?: string
  description?: string
  children?: React.ReactNode
  showExchangeSelector?: boolean
}

export function PageHeader({ title, description, children, showExchangeSelector = true }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-4 py-3">
        <div className="flex items-start gap-4">
          <SidebarTrigger className="h-8 w-8 shrink-0 mt-1" />
          <Separator orientation="vertical" className="h-8 shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {showExchangeSelector && (
              <div className="mt-3">
                <ExchangeSelectorTop />
              </div>
            )}
          </div>
          <div className="shrink-0">
            {children && <div className="flex items-center gap-2">{children}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}