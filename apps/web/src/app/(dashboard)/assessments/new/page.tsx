"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function NewAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [serviceTypes, setServiceTypes] = useState<{ id: string; name: string; description?: string }[]>([])
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "EXTERNAL",
    customerId: searchParams.get("customerId") ?? "",
    serviceTypeId: "",
    startDate: "",
    endDate: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/service-types").then((r) => r.json()),
    ]).then(([c, s]) => {
      setCustomers(Array.isArray(c) ? c : [])
      setServiceTypes(Array.isArray(s) ? s : [])
    })
  }, [])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceTypeId: form.serviceTypeId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: "destructive", title: "Errore", description: data.error ?? "Errore nella creazione" })
        return
      }
      toast({ title: "Assessment creato!", description: "Ora puoi definire lo scope e la ROE." })
      router.push(`/assessments/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center gap-3 border-b bg-background px-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assessments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-base font-semibold">Nuovo Assessment</h1>
      </div>
      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Crea Assessment</CardTitle>
            <CardDescription>
              Definisci il perimetro dell&apos;attività. Lo scope e la ROE verranno configurati dopo la creazione.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.customerId} onValueChange={(v) => set("customerId", v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo di Servizio</Label>
                <Select value={form.serviceTypeId} onValueChange={(v) => set("serviceTypeId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo di servizio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((st) => (
                      <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Il tipo di servizio determina le scansioni disponibili nell&apos;assessment.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Titolo *</Label>
                <Input placeholder="es. External VA Q3 2026 - Acme Corp" required
                  value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXTERNAL">External — Scansione da Internet</SelectItem>
                    <SelectItem value="INTERNAL">Internal — Rete interna (agent)</SelectItem>
                    <SelectItem value="WEBAPP">Web App — Applicazioni web</SelectItem>
                    <SelectItem value="RETEST">Retest — Verifica remediation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Inizio</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fine</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea placeholder="Obiettivi e note dell'assessment..." rows={3}
                  value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea Assessment
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/assessments">Annulla</Link>
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
