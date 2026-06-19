"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const JOB_TYPES = [
  { value: "NMAP_DISCOVERY", label: "NMAP Discovery", desc: "Host discovery — individua host attivi, nessuna porta scansionata" },
  { value: "NMAP_FULL", label: "NMAP Full", desc: "Port scan completo con rilevamento servizi e versioni" },
  { value: "NMAP_VULN", label: "NMAP Vuln", desc: "Script NSE per vulnerabilità note (lento, invasivo)" },
  { value: "NUCLEI_CVE", label: "Nuclei CVE", desc: "Template Nuclei per CVE — severità critical/high/medium" },
  { value: "NUCLEI_WEBAPP", label: "Nuclei Web App", desc: "Misconfiguration, esposizioni e tecnologie web" },
  { value: "MANUAL", label: "Manuale", desc: "Finding inseriti manualmente dall'analista" },
]

export default function NewScanTypeDefPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [configError, setConfigError] = useState("")
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    scanJobType: "",
    defaultConfig: "{}",
    isActive: true,
  })

  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    setForm((f) => ({ ...f, name, slug }))
  }

  function validateConfig(val: string) {
    try {
      JSON.parse(val)
      setConfigError("")
    } catch {
      setConfigError("JSON non valido")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.scanJobType) {
      toast({ title: "Errore", description: "Seleziona un job type", variant: "destructive" })
      return
    }
    let parsedConfig: Record<string, unknown>
    try {
      parsedConfig = JSON.parse(form.defaultConfig)
    } catch {
      toast({ title: "Errore", description: "Configurazione JSON non valida", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/scan-type-defs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          scanJobType: form.scanJobType,
          defaultConfig: parsedConfig,
          isActive: form.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Errore", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Tipo di scan creato" })
      router.push("/admin/scan-type-defs")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Nuovo Tipo di Scan" description="Aggiungi una definizione di scansione al catalogo" />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dettagli</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Es. Nmap Port Scan Completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="nmap-full"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Breve descrizione della scansione..."
                />
              </div>
              <div className="space-y-2">
                <Label>Job Type *</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {JOB_TYPES.map(({ value, label, desc }) => {
                    const selected = form.scanJobType === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, scanJobType: value }))}
                        className={`flex flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40 hover:bg-muted"
                        }`}
                      >
                        <span className="font-medium">{label}</span>
                        <span className={`text-xs ${selected ? "text-primary/70" : "text-muted-foreground"}`}>{desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultConfig">Configurazione predefinita (JSON)</Label>
                <Textarea
                  id="defaultConfig"
                  value={form.defaultConfig}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, defaultConfig: e.target.value }))
                    validateConfig(e.target.value)
                  }}
                  rows={3}
                  className="font-mono text-xs"
                  placeholder='{"timing": 3}'
                />
                {configError && <p className="text-xs text-destructive">{configError}</p>}
                <p className="text-xs text-muted-foreground">Parametri passati all'agente come config di default per questo tipo di scan.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    form.isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.isActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}>
                  {form.isActive ? "Attivo" : "Disattivo"}
                </Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading || !!configError}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creazione...</> : "Crea Tipo Scan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
