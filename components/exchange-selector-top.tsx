"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap } from "lucide-react"
import { useExchange } from "@/lib/exchange-context"

interface Connection {
  id: string
  name: string
  exchange: string
  isReal: boolean
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
  const { selectedConnectionId, setSelectedConnectionId } = useExchange()
  const [connections, setConnections] = useState<Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadConnections = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/settings/connections")
        if (response.ok) {
          const data = await response.json()
          const allConnections: Connection[] = (data.connections || []).map((c: any) => ({
            id: c.id,
            name: c.name || c.exchange,
            exchange: c.exchange,
            isReal: true,
            status: c.is_enabled ? "connected" : "disconnected",
            isActiveInserted: c.is_active_inserted === "1" || c.is_active_inserted === true,
          })).filter((c: any) => c.isActiveInserted)
          
          setConnections(allConnections)
        }
      } catch (error) {
        console.error("Failed to load connections:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConnections()
  }, [])

  const currentConnection = connections.find((c) => c.id === selectedConnectionId) || STANDARD_OPTION

  const handleSelectConnection = (id: string) => {
    setSelectedConnectionId(id)
  }

  const defaultValue = selectedConnectionId || "standard"

  return (
    <div className="flex items-center gap-2">
      <Zap className="h-4 w-4 text-yellow-500" />
      <Select value={defaultValue} onValueChange={handleSelectConnection}>
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue placeholder="Select connection" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="standard" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <span>Standard</span>
              <span className="text-muted-foreground text-xs">(Mock)</span>
            </div>
          </SelectItem>
          
          {isLoading ? (
            <div className="px-2 py-2 text-center text-muted-foreground text-xs">Loading...</div>
          ) : connections.length === 0 ? (
            <div className="px-2 py-2 text-center text-muted-foreground text-xs">No Main Connections</div>
          ) : (
            connections.map((conn) => (
              <SelectItem key={conn.id} value={conn.id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>{conn.name}</span>
                  <Badge variant="outline" className="text-[10px]">{conn.exchange}</Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {currentConnection.isReal && (
        <Badge variant="secondary" className="text-xs">{currentConnection.exchange}</Badge>
      )}
    </div>
  )
}