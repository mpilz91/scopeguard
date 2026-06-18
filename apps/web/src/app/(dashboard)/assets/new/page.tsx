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

const ASSET_TYPE_LABELS = {
  IP: "IP Address",
  CIDR: "CIDR (es. 192.168.1.0/24)",
  DOMAIN: "Dominio (es. example.com)",
  URL: "URL (es. https://app.example.com)",
  HOST: "Hostname",
}

export default function NewAssetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    name: "",
    type: "IP" as keyof typeof ASSET_TYPE_LABELS,
    value: "",
    customerId: searchParams.get("customerId") ?? "",
    description: "",
  })

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(data))
  }, [])

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: "destructive", title: "Errore", description: data.error ?? "Errore nella creazione" })
        return
      }
      toast({ title: "Asset creato!", description: `${form.name} (${form.value}) aggiunto.` })
      router.push(form.customerId ? `/customers/${form.customerId}` : "/assets")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center gap-3 border-b bg-background px-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/assets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">Nuovo Asset</h1>
      </div>

      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Censimento Asset</CardTitle>
            <CardDescription>
              Aggiungi un asset da associare a un cliente. Il valore deve essere preciso per poter
              essere usato come target delle scansioni.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Cliente *</Label>
                <Select value={form.customerId} onValueChange={(v) => set("customerId", v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Asset *</Label>
                <Input
                  id="name"
                  placeholder="es. Web Server Produzione"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select value={form.type} onValueChange={(v) => set("type", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{ASSET_TYPE_LABELS[form.type]}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Valore / Target *</Label>
                  <Input
                    id="value"
                    placeholder="es. 203.0.113.10"
                    required
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  placeholder="Descrizione opzionale dell'asset..."
                  rows={2}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea Asset
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/assets">Annulla</Link>
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
