"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Header } from "@/components/layout/header"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
  HIGH:     "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW:      "bg-blue-100 text-blue-800 border-blue-200",
  INFO:     "bg-slate-100 text-slate-700 border-slate-200",
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aperto", CONFIRMED: "Confermato", FALSE_POSITIVE: "Falso Positivo",
  REMEDIATED: "Rimediato", ACCEPTED_RISK: "Rischio Accettato",
}

const SEV_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]

export default function FindingsPage() {
  const { toast } = useToast()
  const [findings, setFindings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/findings")
      if (res.ok) setFindings(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === findings.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(findings.map((f) => f.id)))
    }
  }

  async function deleteSingle(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/findings/${id}`, { method: "DELETE" })
      if (!res.ok) { toast({ variant: "destructive", title: "Errore eliminazione" }); return }
      setFindings((prev) => prev.filter((f) => f.id !== id))
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
      toast({ title: "Finding eliminato" })
    } finally {
      setDeleting(null)
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch("/api/findings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      setFindings((prev) => prev.filter((f) => !selected.has(f.id)))
      setSelected(new Set())
      toast({ title: `${d.deleted} finding eliminati` })
    } finally {
      setBulkDeleting(false)
    }
  }

  const sorted = [...findings].sort(
    (a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
  )

  return (
    <div className="flex flex-col">
      <Header
        title="Findings"
        description={`${findings.length} vulnerabilità rilevate`}
        actions={
          selected.size > 0 ? (
            <Button
              size="sm" variant="destructive"
              onClick={deleteSelected}
              disabled={bulkDeleting}
            >
              {bulkDeleting
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              Elimina {selected.size} selezionati
            </Button>
          ) : undefined
        }
      />
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={findings.length > 0 && selected.size === findings.length}
                      onChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((f) => (
                  <TableRow
                    key={f.id}
                    className={selected.has(f.id) ? "bg-muted/40" : ""}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selected.has(f.id)}
                        onChange={() => toggleSelect(f.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-xs">
                      <p className="truncate">{f.title}</p>
                      {f.port && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {f.port}/{f.protocol}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLOR[f.severity]}`}>
                        {f.severity}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{f.affectedAsset}</TableCell>
                    <TableCell className="text-sm">
                      <Link
                        href={`/assessments/${f.assessment?.id ?? f.assessmentId}`}
                        className="hover:underline text-primary"
                      >
                        {f.assessment?.title ?? "—"}
                      </Link>
                      {f.assessment?.customer && (
                        <p className="text-xs text-muted-foreground">{f.assessment.customer.name}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{STATUS_LABEL[f.status] ?? f.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(f.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSingle(f.id)}
                        disabled={deleting === f.id}
                      >
                        {deleting === f.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {findings.length === 0 && (
              <div className="py-14 text-center text-sm text-muted-foreground">
                Nessun finding ancora. Appariranno qui dopo le scansioni.
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
