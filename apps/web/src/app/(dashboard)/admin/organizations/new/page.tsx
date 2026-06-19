"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export default function NewOrgPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    slug: "",
    orgType: "RESELLER",
    website: "",
    vatNumber: "",
  })

  function handleNameChange(name: string) {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    setForm((f) => ({ ...f, name, slug }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website: form.website || null, vatNumber: form.vatNumber || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Errore", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Organizzazione creata" })
      router.push("/admin/organizations")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="Nuova Organizzazione" description="Crea un reseller o un client" />
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dettagli organizzazione</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Es. Acme Security S.r.l."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="acme-security"
                  pattern="[a-z0-9-]+"
                  required
                />
                <p className="text-xs text-muted-foreground">Solo lettere minuscole, numeri e trattini.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgType">Tipo *</Label>
                <Select value={form.orgType} onValueChange={(v) => setForm((f) => ({ ...f, orgType: v }))}>
                  <SelectTrigger id="orgType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESELLER">Reseller — può creare i propri client</SelectItem>
                    <SelectItem value="CLIENT">Client — riceve i servizi di sicurezza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sito Web</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">P.IVA</Label>
                <Input
                  id="vatNumber"
                  value={form.vatNumber}
                  onChange={(e) => setForm((f) => ({ ...f, vatNumber: e.target.value }))}
                  placeholder="IT12345678901"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creazione..." : "Crea Organizzazione"}
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
