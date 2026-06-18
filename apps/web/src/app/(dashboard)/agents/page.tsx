"use client"

import { useEffect, useState } from "react"
import {
  Bot, Plus, Copy, Check, Trash2, Loader2,
  AlertTriangle, CheckCircle, Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Header } from "@/components/layout/header"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/utils"

export default function AgentsPage() {
  const { toast } = useToast()
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [newToken, setNewToken] = useState<{ id: string; name: string; rawToken: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/agents")
      if (res.ok) setTokens(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function createToken() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      setNewToken(d)
      setNewName("")
      setShowForm(false)
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function revokeToken(id: string) {
    setRevoking(id)
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      await load()
      toast({ title: "Token revocato" })
    } finally {
      setRevoking(null)
    }
  }

  function copyToken() {
    if (!newToken) return
    navigator.clipboard.writeText(newToken.rawToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Agent Interni"
        description="Agenti Docker installabili nelle reti cliente"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuovo Token
          </Button>
        }
      />

      <div className="p-6 space-y-5">

        {/* ── Token appena creato ── */}
        {newToken && (
          <div className="rounded-lg border-2 border-green-400 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <p className="font-semibold text-green-800">Token creato: {newToken.name}</p>
            </div>
            <p className="text-sm text-amber-700 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Copia il token adesso — non verrà più mostrato.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-white px-3 py-2 text-sm font-mono break-all select-all">
                {newToken.rawToken}
              </code>
              <Button size="sm" variant="outline" onClick={copyToken} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              size="sm" variant="ghost"
              className="text-green-700"
              onClick={() => setNewToken(null)}
            >
              Ho copiato il token, chiudi
            </Button>
          </div>
        )}

        {/* ── Form nuovo token ── */}
        {showForm && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Nuovo agent token</CardTitle>
              <CardDescription className="text-xs">
                Dai un nome descrittivo, es. "Agent-ClienteRossi-Milano"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createToken()}
                  placeholder="Nome agent…"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button size="sm" onClick={createToken} disabled={creating || !newName.trim()}>
                  {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Crea
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setNewName("") }}>
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Istruzioni Docker ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Installazione agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <pre className="rounded-md bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed">
{`docker run -d \\
  --name scopeguard-agent \\
  --restart unless-stopped \\
  -e SCOPEGUARD_URL=https://your-platform-url \\
  -e AGENT_TOKEN=<token> \\
  -e POLL_INTERVAL_MS=15000 \\
  ghcr.io/scopeguard/agent:latest`}
            </pre>
            <p className="text-xs text-muted-foreground">
              L&apos;agent usa solo comunicazione outbound HTTPS (polling). Nessuna porta inbound richiesta.
            </p>
          </CardContent>
        </Card>

        {/* ── Lista token ── */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-base font-semibold">Nessun token registrato</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea il primo token per installare un agent nelle reti cliente.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Nuovo Token
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Job eseguiti</TableHead>
                  <TableHead>Ultima vista</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "ACTIVE" ? "success" : "destructive"} className="text-xs">
                        {t.status === "ACTIVE" ? "Attivo" : "Revocato"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t._count?.scanJobs ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.lastSeenAt ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(t.lastSeenAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">Mai</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.lastSeenIp ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell>
                      {t.status === "ACTIVE" && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => revokeToken(t.id)}
                          disabled={revoking === t.id}
                          title="Revoca token"
                        >
                          {revoking === t.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
