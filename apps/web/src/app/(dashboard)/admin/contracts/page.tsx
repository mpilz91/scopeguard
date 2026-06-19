"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

export default function ContractsPage() {
  const { toast } = useToast()
  const [contracts, setContracts] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    organizationId: "",
    serviceTypeId: "",
    maxAssessments: "",
    expiresAt: "",
  })

  async function load() {
    setLoading(true)
    const [c, o, s] = await Promise.all([
      fetch("/api/admin/contracts").then((r) => r.json()),
      fetch("/api/admin/organizations").then((r) => r.json()),
      fetch("/api/admin/service-types").then((r) => r.json()),
    ])
    if (Array.isArray(c)) setContracts(c)
    if (Array.isArray(o)) setOrgs(o)
    if (Array.isArray(s)) setServiceTypes(s)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo contratto?")) return
    const res = await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Contratto eliminato" })
      load()
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    load()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      organizationId: form.organizationId,
      serviceTypeId: form.serviceTypeId,
      maxAssessments: form.maxAssessments ? parseInt(form.maxAssessments) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    }
    const res = await fetch("/api/admin/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: "Errore", description: data.error, variant: "destructive" })
      return
    }
    toast({ title: "Contratto creato" })
    setShowForm(false)
    setForm({ organizationId: "", serviceTypeId: "", maxAssessments: "", expiresAt: "" })
    load()
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Contratti"
        description="Assegna servizi alle organizzazioni"
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            Nuovo Contratto
          </Button>
        }
      />
      <div className="p-6 space-y-4">
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nuovo contratto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organizzazione *</Label>
                  <Select value={form.organizationId} onValueChange={(v) => setForm((f) => ({ ...f, organizationId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona organizzazione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orgs.map((o: any) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} ({o.orgType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo di Servizio *</Label>
                  <Select value={form.serviceTypeId} onValueChange={(v) => setForm((f) => ({ ...f, serviceTypeId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona servizio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Assessment (vuoto = illimitato)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.maxAssessments}
                    onChange={(e) => setForm((f) => ({ ...f, maxAssessments: e.target.value }))}
                    placeholder="Es. 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scadenza (opzionale)</Label>
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={!form.organizationId || !form.serviceTypeId}>
                    Crea Contratto
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Annulla
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Max Assessment</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Creato</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Caricamento...</TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nessun contratto. Creane uno con il pulsante in alto.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div>{c.organization?.name}</div>
                      <div className="text-xs text-muted-foreground">{c.organization?.orgType}</div>
                    </TableCell>
                    <TableCell>{c.serviceType?.name}</TableCell>
                    <TableCell>
                      {c.maxAssessments ? (
                        <Badge variant="outline">{c.maxAssessments}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Illimitato</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.expiresAt ? formatDate(c.expiresAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(c.id, c.isActive)}>
                        <Badge variant={c.isActive ? "success" : "secondary"}>
                          {c.isActive ? "Attivo" : "Sospeso"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
