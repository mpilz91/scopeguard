"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Plus, Trash2, Shield, CheckCircle,
  AlertTriangle, Server, Bug, Loader2, FileText, Edit3,
  Play, RefreshCw, Clock, XCircle, Ban,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { formatDate, formatDateTime } from "@/lib/utils"

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string[] }> = {
  DRAFT:            { label: "Bozza",           color: "bg-slate-200 text-slate-700",   next: ["PENDING_APPROVAL", "CANCELLED"] },
  PENDING_APPROVAL: { label: "In Approvazione", color: "bg-yellow-100 text-yellow-800", next: ["APPROVED", "DRAFT", "CANCELLED"] },
  APPROVED:         { label: "Approvato",        color: "bg-green-100 text-green-800",   next: ["IN_PROGRESS", "CANCELLED"] },
  IN_PROGRESS:      { label: "In Corso",         color: "bg-blue-100 text-blue-800",     next: ["COMPLETED", "CANCELLED"] },
  COMPLETED:        { label: "Completato",       color: "bg-purple-100 text-purple-800", next: [] },
  CANCELLED:        { label: "Annullato",        color: "bg-red-100 text-red-800",       next: [] },
}

const TYPE_LABEL: Record<string, string> = {
  EXTERNAL: "External", INTERNAL: "Internal", WEBAPP: "Web App", RETEST: "Retest",
}

const ROE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: "Bozza",     color: "bg-slate-200 text-slate-700" },
  SENT:     { label: "Inviata",   color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Approvata", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rifiutata", color: "bg-red-100 text-red-800" },
}

const SEVERITY_BADGE: Record<string, any> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low", INFO: "info",
}

const SCAN_TYPES: { value: string; label: string; description: string }[] = [
  { value: "NMAP_DISCOVERY", label: "Discovery",          description: "Host discovery e porte principali (veloce)" },
  { value: "NMAP_FULL",      label: "Port Scan completo", description: "Tutte le 65535 porte TCP/UDP" },
  { value: "NMAP_VULN",      label: "Vulnerability Scan", description: "Script NSE per CVE e misconfigurazioni" },
  { value: "NUCLEI_CVE",     label: "CVE Scan (Nuclei)",  description: "Template Nuclei per vulnerabilità note" },
  { value: "NUCLEI_WEBAPP",  label: "Web App Scan",       description: "Template Nuclei per applicazioni web" },
]

const JOB_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: "In attesa",  color: "bg-slate-100 text-slate-700",  icon: <Clock className="h-3 w-3" /> },
  QUEUED:    { label: "In coda",    color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  RUNNING:   { label: "In esecuzione", color: "bg-blue-100 text-blue-800", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  COMPLETED: { label: "Completato", color: "bg-green-100 text-green-800",  icon: <CheckCircle className="h-3 w-3" /> },
  FAILED:    { label: "Fallito",    color: "bg-red-100 text-red-800",      icon: <XCircle className="h-3 w-3" /> },
  CANCELLED: { label: "Annullato",  color: "bg-slate-100 text-slate-500",  icon: <XCircle className="h-3 w-3" /> },
}

const DEFAULT_ROE = `# Rules of Engagement

## Oggetto
Il presente documento definisce le regole di ingaggio per l'attività di Vulnerability Assessment autorizzata dalla presente organizzazione.

## Perimetro Autorizzato
Il testing è limitato **esclusivamente** agli asset indicati nella sezione Scope. Qualsiasi sistema non esplicitamente incluso è **FUORI SCOPE**.

## Attività Autorizzate
- Scansione di rete (port scanning, service discovery)
- Identificazione servizi, versioni e banner grabbing
- Vulnerability scanning automatico (Nmap, Nuclei)
- Analisi configurazioni esposte pubblicamente

## Attività NON Autorizzate
- Exploitation attiva di vulnerabilità trovate
- Denial of Service (DoS / DDoS)
- Social engineering o phishing
- Accesso, modifica o cancellazione di dati utente
- Movimento laterale oltre il perimetro autorizzato

## Periodo di Attività
Le attività sono autorizzate esclusivamente nelle date di inizio e fine indicate nell'assessment.

## Responsabilità
La società di cybersecurity si impegna a non divulgare informazioni riservate acquisite durante le attività e a segnalare immediatamente qualsiasi impatto involontario sui sistemi.

## Contatti di Emergenza
In caso di incidente imprevisto, contattare immediatamente il referente tecnico indicato nel contratto.

## Consenso
La firma / approvazione del presente documento costituisce **autorizzazione formale** all'esecuzione delle attività descritte nel rispetto dei vincoli sopra indicati.`

// ─── Markdown preview ────────────────────────────────────────────────────────

function MarkdownDoc({ content, assessment }: { content: string; assessment: any }) {
  const lines = content.split("\n")
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={i} className="text-2xl font-bold text-slate-900 pb-3 mb-4 border-b-2 border-slate-200">
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="text-base font-semibold text-slate-800 mb-2 mt-7 uppercase tracking-wide">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="text-sm font-semibold text-slate-700 mb-1 mt-5">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith("- ")) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2))
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc ml-6 space-y-1 mb-4 text-slate-700">
          {items.map((item, j) => (
            <li key={j} className="text-sm leading-relaxed">
              {item.split(/\*\*(.+?)\*\*/g).map((part, k) =>
                k % 2 === 1 ? <strong key={k}>{part}</strong> : part
              )}
            </li>
          ))}
        </ul>
      )
      continue
    } else if (line.trim() === "") {
      // empty line — spacer
    } else {
      nodes.push(
        <p key={i} className="text-sm text-slate-700 mb-3 leading-relaxed">
          {line.split(/\*\*(.+?)\*\*/g).map((part, k) =>
            k % 2 === 1 ? <strong key={k}>{part}</strong> : part
          )}
        </p>
      )
    }
    i++
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-8 font-serif min-h-[500px]">
      {/* Document Header */}
      <div className="mb-8 pb-6 border-b border-slate-200 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-slate-600" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Rules of Engagement — Documento Confidenziale
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-500 font-sans">
            <span><span className="font-medium text-slate-700">Assessment:</span> {assessment.title}</span>
            <span><span className="font-medium text-slate-700">Tipo:</span> {TYPE_LABEL[assessment.type]}</span>
            <span><span className="font-medium text-slate-700">Cliente:</span> {assessment.customer?.name}</span>
            <span><span className="font-medium text-slate-700">Data:</span> {formatDate(assessment.createdAt)}</span>
          </div>
        </div>
        {assessment.roe?.status === "APPROVED" && (
          <div className="shrink-0 flex flex-col items-center gap-1 rounded-lg border-2 border-green-400 bg-green-50 px-4 py-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Approvato</span>
            <span className="text-xs text-green-600">{formatDate(assessment.roe.approvedAt)}</span>
          </div>
        )}
      </div>

      {/* Scope summary inside document */}
      {assessment.scopeItems?.length > 0 && (
        <div className="mb-6 rounded-md bg-slate-50 border border-slate-200 p-4 font-sans">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Asset in Scope ({assessment.scopeItems.length})
          </p>
          <div className="grid grid-cols-2 gap-1">
            {assessment.scopeItems.map((s: any) => (
              <div key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="font-mono">{s.asset.value}</span>
                <span className="text-slate-400">— {s.asset.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document body */}
      <div>{nodes}</div>

      {/* Signature block */}
      <div className="mt-10 pt-6 border-t border-slate-200 font-sans">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-6">
              Firma Responsabile Assessment
            </p>
            <div className="border-b border-slate-300 mb-1" />
            <p className="text-xs text-slate-400">Nome, Cognome, Data</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-6">
              Firma Referente Cliente
            </p>
            <div className="border-b border-slate-300 mb-1" />
            <p className="text-xs text-slate-400">Nome, Cognome, Data</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const [assessment, setAssessment] = useState<any>(null)
  const [availableAssets, setAvailableAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roeTab, setRoeTab] = useState<"edit" | "preview">("edit")

  // Separate states — avoids cross-disabling between save and approve
  const [scopeAssetId, setScopeAssetId] = useState("")
  const [addingScope, setAddingScope] = useState(false)
  const [removingScope, setRemovingScope] = useState<string | null>(null)
  const [roeContent, setRoeContent] = useState(DEFAULT_ROE)
  const [savingDraft, setSavingDraft] = useState(false)
  const [approvingRoe, setApprovingRoe] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [scanType, setScanType] = useState("NMAP_DISCOVERY")
  const [launchingJob, setLaunchingJob] = useState(false)
  const [refreshingJobs, setRefreshingJobs] = useState(false)
  const [cancellingJob, setCancellingJob] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [aRes, allAssetsRes] = await Promise.all([
        fetch(`/api/assessments/${params.id}`),
        fetch(`/api/assessments/${params.id}`),
      ])
      if (!aRes.ok) { router.push("/assessments"); return }
      const data = await aRes.json()
      setAssessment(data)
      if (data.roe?.content) setRoeContent(data.roe.content)

      const ar = await fetch(`/api/assets?customerId=${data.customerId}`)
      const allAssets = await ar.json()
      const scopedIds = new Set(data.scopeItems?.map((s: any) => s.assetId))
      setAvailableAssets(allAssets.filter((a: any) => !scopedIds.has(a.id)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [params.id])

  async function addToScope() {
    if (!scopeAssetId) return
    setAddingScope(true)
    try {
      const res = await fetch(`/api/assessments/${params.id}/scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: scopeAssetId }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      setScopeAssetId("")
      await load()
      toast({ title: "Asset aggiunto allo scope" })
    } finally {
      setAddingScope(false)
    }
  }

  async function removeFromScope(assetId: string) {
    setRemovingScope(assetId)
    try {
      await fetch(`/api/assessments/${params.id}/scope/${assetId}`, { method: "DELETE" })
      await load()
      toast({ title: "Asset rimosso dallo scope" })
    } finally {
      setRemovingScope(null)
    }
  }

  async function saveRoe() {
    setSavingDraft(true)
    try {
      const res = await fetch(`/api/assessments/${params.id}/roe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: roeContent }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      await load()
      toast({ title: "Bozza ROE salvata" })
    } finally {
      setSavingDraft(false)
    }
  }

  async function approveRoe() {
    setApprovingRoe(true)
    try {
      const res = await fetch(`/api/assessments/${params.id}/roe/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: roeContent }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Approvazione fallita", description: d.error }); return }
      await load()
      setRoeTab("preview")
      toast({ title: "ROE approvata!", description: "Le scansioni sono ora autorizzate." })
    } finally {
      setApprovingRoe(false)
    }
  }

  async function launchScan() {
    setLaunchingJob(true)
    try {
      const res = await fetch(`/api/assessments/${params.id}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: scanType }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore avvio scansione", description: d.error }); return }
      await load()
      if (!d.hasAgent) {
        toast({
          variant: "default",
          title: "Job creato — nessun agent attivo",
          description: "Il job è in coda ma non c'è un agent registrato. Registra un agent token per eseguire la scansione.",
        })
      } else {
        toast({ title: "Scansione avviata", description: `Job ${d.type} creato — l'agent lo preleverà a breve.` })
      }
    } finally {
      setLaunchingJob(false)
    }
  }

  async function cancelJob(jobId: string) {
    setCancellingJob(jobId)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "PATCH" })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      setAssessment((prev: any) => ({
        ...prev,
        scanJobs: prev.scanJobs.map((j: any) => j.id === jobId ? { ...j, status: "CANCELLED" } : j),
      }))
      toast({ title: "Job annullato" })
    } finally {
      setCancellingJob(null)
    }
  }

  async function refreshJobs() {
    setRefreshingJobs(true)
    try {
      const res = await fetch(`/api/assessments/${params.id}/jobs`)
      if (res.ok) {
        const jobs = await res.json()
        setAssessment((prev: any) => ({ ...prev, scanJobs: jobs }))
      }
    } finally {
      setRefreshingJobs(false)
    }
  }

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/assessments/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      const d = await res.json()
      if (!res.ok) { toast({ variant: "destructive", title: "Errore", description: d.error }); return }
      await load()
      toast({ title: `Stato: ${STATUS_CONFIG[newStatus]?.label}` })
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!assessment) return null

  const status = STATUS_CONFIG[assessment.status]
  const roeStatus = assessment.roe ? ROE_STATUS_CONFIG[assessment.roe.status] : null
  const roeApproved = assessment.roe?.status === "APPROVED"
  const locked = ["COMPLETED", "CANCELLED"].includes(assessment.status)
  const scopeEmpty = (assessment.scopeItems?.length ?? 0) === 0

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assessments"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold leading-none">{assessment.title}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {assessment.customer?.name} · {TYPE_LABEL[assessment.type]}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          {status.next.length > 0 && (
            <Select onValueChange={updateStatus} disabled={updatingStatus}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Cambia stato…" />
              </SelectTrigger>
              <SelectContent>
                {status.next.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-6">
        {/* ── Left column ── */}
        <div className="col-span-2 space-y-5">

          {/* Security Gate Banner */}
          {!roeApproved && !locked && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <span className="font-semibold">Scansioni bloccate. </span>
                {scopeEmpty
                  ? "Prima aggiungi almeno un asset allo scope, poi approva la ROE."
                  : "Approva la ROE per sbloccare le scansioni."}
              </div>
            </div>
          )}
          {roeApproved && (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                ROE approvata — l&apos;assessment è autorizzato alle scansioni.
              </p>
            </div>
          )}

          {/* ── Scope ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <Server className="h-4 w-4" />
                Scope
                <Badge variant="secondary" className="ml-1">{assessment.scopeItems?.length ?? 0} asset</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Solo gli asset qui presenti saranno inclusi nelle scansioni.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!locked && (
                <div className="flex gap-2">
                  <Select value={scopeAssetId} onValueChange={setScopeAssetId}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder={
                        availableAssets.length === 0
                          ? "Tutti gli asset del cliente sono già in scope"
                          : "Seleziona asset da aggiungere…"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="font-mono text-xs">{a.value}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{a.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={addToScope} disabled={!scopeAssetId || addingScope}>
                    {addingScope ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Aggiungi
                  </Button>
                </div>
              )}

              {scopeEmpty ? (
                <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 py-5 text-center">
                  <Server className="mx-auto mb-2 h-6 w-6 text-amber-400" />
                  <p className="text-sm font-medium text-amber-800">Scope vuoto</p>
                  <p className="text-xs text-amber-600">Aggiungi almeno un asset per poter approvare la ROE.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Target</TableHead>
                      {!locked && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessment.scopeItems?.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">{s.asset.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.asset.type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{s.asset.value}</TableCell>
                        {!locked && (
                          <TableCell>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromScope(s.assetId)}
                              disabled={removingScope === s.assetId || roeApproved}
                            >
                              {removingScope === s.assetId
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* ── Rules of Engagement ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                    <Shield className="h-4 w-4" />
                    Rules of Engagement
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Documento di autorizzazione formale al testing.
                  </CardDescription>
                </div>
                {roeStatus && (
                  <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${roeStatus.color}`}>
                    {roeStatus.label}
                  </span>
                )}
              </div>

              {/* Tabs */}
              {!locked && (
                <div className="mt-3 flex gap-1 rounded-lg border bg-muted p-0.5 w-fit">
                  <button
                    onClick={() => setRoeTab("edit")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                      ${roeTab === "edit" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Edit3 className="h-3 w-3" /> Modifica
                  </button>
                  <button
                    onClick={() => setRoeTab("preview")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
                      ${roeTab === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <FileText className="h-3 w-3" /> Anteprima documento
                  </button>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {roeTab === "edit" && !roeApproved && !locked ? (
                <div className="space-y-3">
                  <Textarea
                    rows={18}
                    className="font-mono text-xs leading-relaxed resize-y"
                    value={roeContent}
                    onChange={(e) => setRoeContent(e.target.value)}
                    placeholder="Inserisci le rules of engagement in formato Markdown…"
                  />

                  <Separator />

                  {/* Approve block */}
                  <div className="space-y-2">
                    {scopeEmpty && (
                      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Aggiungi almeno un asset allo scope prima di approvare.
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="outline"
                        onClick={saveRoe}
                        disabled={savingDraft}
                      >
                        {savingDraft && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Salva Bozza
                      </Button>
                      <Button
                        size="sm"
                        onClick={approveRoe}
                        disabled={approvingRoe || scopeEmpty}
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                      >
                        {approvingRoe
                          ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                        Approva ROE
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview / approved view */
                <div className="space-y-3">
                  <MarkdownDoc content={roeContent} assessment={assessment} />
                  {roeApproved && (
                    <p className="flex items-center gap-1.5 text-xs text-green-700 pt-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approvata il {assessment.roe?.approvedAt ? formatDateTime(assessment.roe.approvedAt) : "—"}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Lancia Scansione ── */}
          {roeApproved && !locked && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <Play className="h-4 w-4" />
                  Lancia Scansione
                </CardTitle>
                <CardDescription className="text-xs">
                  Seleziona il tipo di scansione. L&apos;agent interno la eseguirà sugli asset in scope.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  {SCAN_TYPES.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => setScanType(st.value)}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors
                        ${scanType === st.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"}`}
                    >
                      <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 transition-colors
                        ${scanType === st.value ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                      />
                      <div>
                        <p className="text-xs font-semibold leading-none text-foreground">{st.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{st.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={launchScan}
                  disabled={launchingJob}
                >
                  {launchingJob
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Avvio in corso…</>
                    : <><Play className="mr-2 h-4 w-4" />Avvia scansione</>}
                </Button>

                {/* Scan jobs list */}
                {(assessment.scanJobs?.length ?? 0) > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Job recenti
                      </p>
                      <button
                        onClick={refreshJobs}
                        disabled={refreshingJobs}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className={`h-3 w-3 ${refreshingJobs ? "animate-spin" : ""}`} />
                        Aggiorna
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {assessment.scanJobs.slice(0, 8).map((j: any) => {
                        const cfg = JOB_STATUS_CONFIG[j.status] ?? JOB_STATUS_CONFIG.PENDING
                        const scanLabel = SCAN_TYPES.find((s) => s.value === j.type)?.label ?? j.type
                        const cancellable = ["PENDING", "QUEUED", "RUNNING"].includes(j.status)
                        return (
                          <div key={j.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="text-xs font-medium">{scanLabel}</span>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                                {cfg.icon}
                                {cfg.label}
                              </span>
                              {cancellable && (
                                <button
                                  onClick={() => cancelJob(j.id)}
                                  disabled={cancellingJob === j.id}
                                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                                  title="Annulla job"
                                >
                                  {cancellingJob === j.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Ban className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Findings ── */}
          {(assessment.findings?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <Bug className="h-4 w-4" />
                  Finding
                  <Badge variant="secondary" className="ml-1">{assessment.findings.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessment.findings.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm max-w-xs truncate">{f.title}</TableCell>
                        <TableCell><Badge variant={SEVERITY_BADGE[f.severity]}>{f.severity}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{f.affectedAsset}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{f.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dettagli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant="outline">{TYPE_LABEL[assessment.type]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <Link href={`/customers/${assessment.customer?.id}`}
                  className="text-xs font-medium text-primary hover:underline">
                  {assessment.customer?.name}
                </Link>
              </div>
              {assessment.startDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inizio</span>
                  <span className="text-xs">{formatDate(assessment.startDate)}</span>
                </div>
              )}
              {assessment.endDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fine</span>
                  <span className="text-xs">{formatDate(assessment.endDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creato</span>
                <span className="text-xs">{formatDate(assessment.createdAt)}</span>
              </div>
              {assessment.description && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground">{assessment.description}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riepilogo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Scope</span>
                <Badge variant={scopeEmpty ? "outline" : "secondary"}>
                  {assessment.scopeItems?.length ?? 0} asset
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ROE</span>
                {roeApproved
                  ? <span className="text-xs font-medium text-green-700 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Approvata</span>
                  : <span className="text-xs text-amber-600">{assessment.roe ? "Bozza" : "Da creare"}</span>
                }
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Finding</span>
                <Badge variant={(assessment.findings?.length ?? 0) > 0 ? "destructive" : "secondary"}>
                  {assessment.findings?.length ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Scan Job</span>
                <Badge variant="secondary">{assessment.scanJobs?.length ?? 0}</Badge>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
