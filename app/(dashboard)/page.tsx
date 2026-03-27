"use client"

import { Dashboard } from "@/components/dashboard/dashboard"
import { PageHeader } from "@/components/page-header"

export default function DashboardPage() {
  return (
    <>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your trading system"
        showExchangeSelector={false}
      />
      <Dashboard />
    </>
  )
}
