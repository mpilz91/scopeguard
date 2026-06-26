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


export default function EditServiceTypePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanDefs, setScanDefs] = useState<any[]>([])
  const [form, setForm] = useState({
    name: "",
    description: "",
    scanTypeDefIds: [] as string[],
    isActive: true,
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/service-types/${params.id}`).then((r) => r.json()),
      fetch("/api/admin/scan-type-defs").then((r) => r.json()),
    ]).then(([serviceData, defsData]) => {
      if (serviceData.id) {
        setForm({
          name: serviceData.name ?? "",
          description: serviceData.description ?? "",
          scanTypeDefIds: (serviceData.scanTypeDefs ?? []).map((d: any) => d.id),
          isActive: serviceData.isActive ?? true,
        })
      }
      setScanDefs(Array.isArray(defsData) ? defsData : [])
      setLoading(false)
    })
  }, [params.id])

  function toggleDef(id: string) {
    setForm((f) => ({
      ...f,
      scanTypeDefIds: f.scanTypeDefIds.includes(id)
        ? f.scanTypeDefIds.filter((s) => s !== id)
        : [...f.scanTypeDefIds, id],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.scanTypeDefIds.length === 0) {
      toast({ title: "Errore", description: "Seleziona almeno uno scan type", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/service-types/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, description: form.description || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Errore", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Servizio aggiornato" })
      router.push("/admin/service-types")
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
      <Header title="Modifica Tipo di Servizio" description={form.name} />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dettagli servizio</CardTitle>
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
                <Label>Scan Types abilitati *</Label>
                {scanDefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun tipo di scan disponibile.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {scanDefs.map((def) => {
                      const checked = form.scanTypeDefIds.includes(def.id)
                      return (
                        <button
                          key={def.id}
                          type="button"
                          onClick={() => toggleDef(def.id)}
                          className={`flex flex-col items-start rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            checked
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/40 hover:bg-muted"
                          }`}
                        >
                          <span className="font-medium">{def.name}</span>
                          <span className={`text-xs ${checked ? "text-primary/70" : "text-muted-foreground"}`}>
                            {def.engine}
                            {def.description ? ` — ${def.description}` : ""}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{form.scanTypeDefIds.length} selezionati</p>
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
                  {form.isActive ? "Servizio attivo" : "Servizio disattivo"}
                </Label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving}>
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
