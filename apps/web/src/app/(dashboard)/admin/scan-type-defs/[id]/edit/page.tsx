"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const ENGINES = [
  { value: "NMAP",   label: "Nmap",    desc: "Scanner di rete (port scan, discovery, vuln scripts)" },
  { value: "NUCLEI", label: "Nuclei",  desc: "Scanner basato su template (CVE, misconfigurazioni, web)" },
  { value: "MANUAL", label: "Manuale", desc: "Finding inseriti manualmente dall'analista" },
]

export default function EditScanTypeDefPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configError, setConfigError] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    engine: "",
    defaultConfig: "{}",
    isActive: true,
  })

  useEffect(() => {
    fetch(`/api/admin/scan-type-defs/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setForm({
            name: data.name ?? "",
            description: data.description ?? "",
            engine: data.engine ?? "",
            defaultConfig: JSON.stringify(data.defaultConfig ?? {}, null, 2),
            isActive: data.isActive ?? true,
          })
        }
        setLoading(false)
      })
  }, [params.id])

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
    let parsedConfig: Record<string, unknown>
    try {
      parsedConfig = JSON.parse(form.defaultConfig)
    } catch {
      toast({ title: "Errore", description: "Configurazione JSON non valida", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/scan-type-defs/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          engine: form.engine || undefined,
          defaultConfig: parsedConfig,
          isActive: form.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Errore", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Tipo di scan aggiornato" })
      router.push("/admin/scan-type-defs")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header title="Modifica Tipo di Scan" description={form.name} />
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
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                />
              </div>
              <div className="space-y-2">
                <Label>Engine</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ENGINES.map(({ value, label, desc }) => {
                    const selected = form.engine === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, engine: value }))}
                        className={`flex flex-col items-start rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40 hover:bg-muted"
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className={`mt-0.5 text-xs leading-snug ${selected ? "text-primary/70" : "text-muted-foreground"}`}>{desc}</span>
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
                  rows={4}
                  className="font-mono text-xs"
                />
                {configError && <p className="text-xs text-destructive">{configError}</p>}
                <p className="text-xs text-muted-foreground">
                  Per Nmap: <code className="bg-muted px-1 rounded">mode</code> (DISCOVERY | FULL | VULN). Per Nuclei: <code className="bg-muted px-1 rounded">templates</code> (array di stringhe).
                </p>
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
                <Button type="submit" disabled={saving || !!configError}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : "Salva Modifiche"}
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
