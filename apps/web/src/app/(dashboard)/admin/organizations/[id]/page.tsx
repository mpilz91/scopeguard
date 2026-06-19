"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Trash2, Building2, Users, FileText, BarChart } from "lucide-react"

const ORG_TYPE_LABEL: Record<string, string> = { RESELLER: "Reseller", CLIENT: "Client" }
const ORG_TYPE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  RESELLER: "default",
  CLIENT: "secondary",
}

export default function OrgDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [org, setOrg] = useState<any>(null)
  const [form, setForm] = useState({ name: "", website: "", vatNumber: "" })

  useEffect(() => {
    fetch(`/api/admin/organizations/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setOrg(data)
          setForm({
            name: data.name ?? "",
            website: data.website ?? "",
            vatNumber: data.vatNumber ?? "",
          })
        }
        setLoading(false)
      })
  }, [params.id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/organizations/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          website: form.website || null,
          vatNumber: form.vatNumber || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Errore", description: data.error, variant: "destructive" })
        return
      }
      setOrg((o: any) => ({ ...o, ...data }))
      toast({ title: "Organizzazione aggiornata" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const hasChildren = org?._count?.children > 0 || org?.children?.length > 0
    const hasContracts = org?.contracts?.length > 0
    if (hasChildren || hasContracts) {
      toast({
        title: "Impossibile eliminare",
        description: hasChildren
          ? "Ha organizzazioni figlie. Rimuovile prima."
          : "Ha contratti attivi. Rimuovili prima.",
        variant: "destructive",
      })
      return
    }
    if (!confirm(`Eliminare definitivamente "${org?.name}"?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/organizations/${params.id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Eliminata" })
        router.push("/admin/organizations")
      } else {
        const data = await res.json()
        toast({ title: "Errore", description: data.error, variant: "destructive" })
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-col">
        <Header title="Organizzazione non trovata" />
        <div className="p-6">
          <Button asChild variant="outline">
            <Link href="/admin/organizations"><ArrowLeft className="mr-2 h-4 w-4" />Torna alla lista</Link>
          </Button>
        </div>
      </div>
    )
  }

  const subtitle = [
    ORG_TYPE_LABEL[org.orgType] ?? org.orgType,
    org.slug,
    org.parent ? `↑ ${org.parent.name}` : null,
  ].filter(Boolean).join(" · ")

  return (
    <div className="flex flex-col">
      <Header
        title={org.name}
        description={subtitle}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/organizations"><ArrowLeft className="mr-1 h-4 w-4" />Indietro</Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Membri", value: org._count?.memberships ?? 0, icon: Users },
            { label: "Contratti", value: org.contracts?.length ?? 0, icon: FileText },
            { label: "Clienti", value: org._count?.customers ?? 0, icon: Building2 },
            { label: "Assessment", value: org._count?.assessments ?? 0, icon: BarChart },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modifica</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="vatNumber">Partita IVA</Label>
                  <Input
                    id="vatNumber"
                    value={form.vatNumber}
                    onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))}
                    placeholder="IT12345678901"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="website">Sito web</Label>
                  <Input
                    id="website"
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://esempio.it"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvataggio...</> : "Salva"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contracts */}
        {org.contracts?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratti</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Servizio</TableHead>
                    <TableHead>Max Assessment</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.contracts.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.serviceType?.name ?? "—"}</TableCell>
                      <TableCell>{c.maxAssessments ?? "∞"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("it-IT") : "Nessuna"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "success" : "secondary"}>
                          {c.isActive ? "Attivo" : "Sospeso"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Child orgs (if reseller) */}
        {org.children?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organizzazioni figlie</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.children.map((child: any) => (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.name}</TableCell>
                      <TableCell>
                        <Badge variant={ORG_TYPE_VARIANT[child.orgType] ?? "outline"}>
                          {ORG_TYPE_LABEL[child.orgType] ?? child.orgType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{child.slug}</span>
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/organizations/${child.id}`}>Apri</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
