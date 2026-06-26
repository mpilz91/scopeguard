"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Play, Loader2, CheckCircle, XCircle, Clock,
  RefreshCw, Filter, Ban, ChevronDown, ChevronRight, Terminal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/layout/header"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/utils"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: "In attesa",     color: "bg-slate-100 text-slate-700",   icon: <Clock className="h-3 w-3" /> },
  QUEUED:    { label: "In coda",       color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  RUNNING:   { label: "In esecuzione", color: "bg-blue-100 text-blue-800",     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  COMPLETED: { label: "Completato",    color: "bg-green-100 text-green-800",   icon: <CheckCircle className="h-3 w-3" /> },
  FAILED:    { label: "Fallito",       color: "bg-red-100 text-red-800",       icon: <XCircle className="h-3 w-3" /> },
  CANCELLED: { label: "Annullato",     color: "bg-slate-100 text-slate-500",   icon: <XCircle className="h-3 w-3" /> },
}

const SCAN_LABEL: Record<string, string> = {
  NMAP:   "Nmap",
  NUCLEI: "Nuclei",
  MANUAL: "Manuale",
}

// ── Log viewer ────────────────────────────────────────────────────────────────

function LogViewer({ jobId, status }: { jobId: string; status: string }) {
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const active = ["RUNNING", "QUEUED"].includes(status)

  const fetchLogs = useCallback(async () => {
    const res = await fetch(`/api/jobs/${jobId}`)
    if (!res.ok) return
    const d = await res.json()
    const l: string[] = (d.result as any)?.logs ?? []
    setLogs(l)
    setLoading(false)
  }, [jobId])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    if (!active) return
    const id = setInterval(fetchLogs, 3000)
    return () => clearInterval(id)
  }, [active, fetchLogs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="rounded-md bg-slate-900 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs text-slate-400 font-mono uppercase tracking-wide">
          Log
          {active && <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-0.5 font-mono text-xs">
        {loading ? (
          <p className="text-slate-500">Caricamento...</p>
        ) : logs.length === 0 ? (
          <p className="text-slate-500">Nessun log ancora.</p>
        ) : (
          logs.map((line, i) => {
            const color = line.includes("CRITICAL") || line.includes("Errore") ? "text-red-400"
              : line.includes("HIGH") ? "text-orange-400"
              : line.includes("MEDIUM") ? "text-yellow-400"
              : line.includes("Completato") ? "text-green-400"
              : line.includes("Host up") || line.includes("open") ? "text-cyan-300"
              : "text-slate-300"
            return <p key={i} className={color}>{line}</p>
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/jobs${params}`)
      if (res.ok) setJobs(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const hasActive = jobs.some((j) => ["PENDING", "QUEUED", "RUNNING"].includes(j.status))
    if (!hasActive) return
    const id = setInterval(() => load(true), 8000)
    return () => clearInterval(id)
  }, [jobs, load])

  async function cancelJob(id: string) {
    setCancelling(id)
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "PATCH" })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status: "CANCELLED" } : j))
      toast({ title: "Job annullato" })
    } finally {
      setCancelling(null)
    }
  }

  const counts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col">
      <Header
        title="Scan Jobs"
        description="Monitoraggio scansioni"
        actions={
          <Button size="sm" variant="outline" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Aggiorna
          </Button>
        }
      />

      <div className="p-6 space-y-5">
        {/* Status summary */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "ALL" : status)}
              className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm
                ${statusFilter === status ? "ring-2 ring-primary border-primary" : "border-border"}`}
            >
              <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                {cfg.icon}{cfg.label}
              </div>
              <p className="mt-1.5 text-xl font-bold tabular-nums">{counts[status] ?? 0}</p>
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 text-sm h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti gli stati</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                <SelectItem key={s} value={s}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter !== "ALL" && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setStatusFilter("ALL")}>
              Rimuovi filtro
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <Play className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-base font-semibold">Nessun job trovato</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter !== "ALL" ? "Nessun job con questo stato." : "Avvia una scansione da un assessment approvato."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Tipo</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead>Avviato</TableHead>
                  <TableHead>Completato</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => {
                  const cfg = STATUS_CONFIG[j.status] ?? STATUS_CONFIG.PENDING
                  const isExpanded = expanded === j.id
                  return (
                    <>
                      <TableRow
                        key={j.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setExpanded(isExpanded ? null : j.id)}
                      >
                        <TableCell>
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{SCAN_LABEL[j.type] ?? j.type}</span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/assessments/${j.assessment?.id}`}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {j.assessment?.title ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {j.agentToken?.name ?? <span className="text-amber-600">Non assegnato</span>}
                        </TableCell>
                        <TableCell>
                          {(j._count?.findings ?? 0) > 0
                            ? <Badge variant="destructive" className="text-xs">{j._count.findings}</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {j.startedAt ? formatDateTime(j.startedAt) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {j.completedAt ? formatDateTime(j.completedAt) : "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {["PENDING", "QUEUED", "RUNNING"].includes(j.status) && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => cancelJob(j.id)}
                              disabled={cancelling === j.id}
                              title="Annulla"
                            >
                              {cancelling === j.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Ban className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Log viewer expandable row */}
                      {isExpanded && (
                        <TableRow key={`${j.id}-logs`} className="bg-slate-950/5 hover:bg-slate-950/5">
                          <TableCell colSpan={9} className="p-3">
                            <LogViewer jobId={j.id} status={j.status} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
