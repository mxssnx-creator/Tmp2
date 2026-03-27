"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, Zap, Check } from "lucide-react"
import { useExchange } from "@/lib/exchange-context"

interface Connection {
  id: string
  name: string
  exchange: string
  isReal: boolean
  apiKey?: string
  status: "connected" | "disconnected" | "error"
}

const STANDARD_OPTION = {
  id: "standard",
  name: "Standard",
  exchange: "Mock",
  isReal: false,
  status: "connected" as const,
}

export function ExchangeSelectorTop() {
  const { selectedConnectionId, setSelectedConnectionId, activeConnections } = useExchange()
  const [connections, setConnections] = useState<Connection[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await fetch("/api/settings/connections")
        if (response.ok) {
          const data = await response.json()
          const realConnections: Connection[] = (data.connections || [])
            .filter((c: any) => c.is_active_inserted === "1" || c.is_active_inserted === true)
            .map((c: any) => ({
              id: c.id,
              name: c.name || c.exchange,
              exchange: c.exchange,
              isReal: true,
              status: c.is_enabled ? "connected" : "disconnected",
            }))
          setConnections(realConnections)
        }
      } catch (error) {
        console.error("Failed to load connections:", error)
      }
    }

    loadConnections()
  }, [])

  const currentConnection = connections.find((c) => c.id === selectedConnectionId) || STANDARD_OPTION

  const handleSelectConnection = (id: string) => {
    setSelectedConnectionId(id)
    setIsOpen(false)
  }

  const defaultValue = selectedConnectionId || "standard"

  return (
    <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-lg font-bold text-primary">
            CTS v3
          </div>
          <div className="hidden sm:block h-4 w-px bg-border"></div>
        </div>

        <div className="flex-1 flex items-center justify-center max-w-sm mx-4">
          <Select value={defaultValue} onValueChange={handleSelectConnection}>
            <SelectTrigger className="w-full h-8 text-xs border-input bg-background hover:bg-muted">
              <div className="flex items-center gap-2 w-full">
                <Zap className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                <SelectValue placeholder="Select connection" />
                {currentConnection.isReal && currentConnection.status === "connected" && (
                  <Check className="h-3 w-3 text-green-500 ml-auto flex-shrink-0" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="min-w-[200px]">
              <SelectItem value="standard" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span>Standard</span>
                </div>
              </SelectItem>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span>{conn.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            {currentConnection.isReal && currentConnection.status === "connected" ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-green-600">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted border border-border">
                <div className="h-2 w-2 rounded-full bg-muted-foreground"></div>
                <span className="text-muted-foreground">Mock Data</span>
              </div>
            )}
          </div>

          {currentConnection.isReal && currentConnection.exchange && (
            <Badge className="bg-blue-500/20 text-blue-600 border border-blue-500/30 text-xs px-1.5 py-0 h-5">
              {currentConnection.exchange}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-1 text-xs text-muted-foreground border-t border-border">
        {currentConnection.isReal ? (
          <span>
            Connected to <span className="font-semibold text-foreground">{currentConnection.name}</span>
          </span>
        ) : (
          <span>
            Standard mode - displaying mock data for testing
          </span>
        )}
      </div>
    </div>
  )
}