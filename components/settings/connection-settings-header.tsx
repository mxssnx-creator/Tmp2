"use client"

import { useExchange } from "@/lib/exchange-context"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Zap } from "lucide-react"

interface Connection {
  id: string
  name: string
  exchange: string
  isReal: boolean
  status: "connected" | "disconnected" | "error"
  createdAt?: string
  lastUsed?: string
}

export function ConnectionSettingsHeader() {
  const { selectedConnectionId, setSelectedConnectionId } = useExchange()
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await fetch("/api/settings/connections")
        if (response.ok) {
          const data = await response.json()
          const realConnections: Connection[] = (data.connections || []).map((c: any) => ({
            id: c.id,
            name: c.name || c.exchange,
            exchange: c.exchange,
            isReal: true,
            status: c.is_enabled ? "connected" : "disconnected",
            createdAt: c.created_at,
            lastUsed: c.last_used,
          }))
          setConnections(realConnections)
        }
      } catch (error) {
        console.error("Failed to load connections:", error)
      }
    }

    loadConnections()
  }, [])

  useEffect(() => {
    const current = connections.find((c) => c.id === selectedConnectionId) || (connections.length > 0 ? connections[0] : null)
    setSelectedConnection(current)
  }, [selectedConnectionId, connections])

  const handleConnectionChange = (id: string) => {
    setSelectedConnectionId(id)
  }

  if (!selectedConnection && connections.length === 0) {
    return (
      <div className="space-y-3 mb-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Active Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No connections available. Add a connection in Settings to get started.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!selectedConnection) return null

  return (
    <div className="space-y-3 mb-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Active Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded bg-muted border border-border">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <div className="font-semibold text-sm text-foreground">{selectedConnection.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Badge className="bg-amber-500/20 text-amber-600 border border-amber-500/30 text-xs px-1.5 py-0 h-4">
                    STANDARD
                  </Badge>
                  <span>{selectedConnection.exchange}</span>
                </div>
              </div>
            </div>
            <Badge
              className={`${
                selectedConnection.status === "connected"
                  ? "bg-green-500/20 text-green-600 border-green-500/30"
                  : "bg-red-500/20 text-red-600 border-red-500/30"
              } border text-xs px-2 py-1`}
            >
              {selectedConnection.status === "connected" ? "✓ Connected" : "✗ Disconnected"}
            </Badge>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Switch Connection:</label>
            <Select value={selectedConnectionId || (connections.length > 0 ? connections[0].id : "")} onValueChange={handleConnectionChange}>
              <SelectTrigger className="h-9 text-xs border-input bg-background">
                <SelectValue placeholder="Select connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <span>{conn.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 flex gap-2">
            <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span>Each connection has its own isolated settings. Changes here only affect the selected connection.</span>
          </div>

          {selectedConnection.createdAt && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-2 border-t border-border">
              <span>Created: {new Date(selectedConnection.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}