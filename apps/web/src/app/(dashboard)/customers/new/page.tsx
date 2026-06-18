"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function NewCustomerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    phone: "",
    address: "",
    notes: "",
  })

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: "destructive", title: "Errore", description: data.error ?? "Errore nella creazione" })
        return
      }
      toast({ title: "Cliente creato!", description: `${form.name} è stato aggiunto.` })
      router.push("/customers")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center gap-3 border-b bg-background px-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">Nuovo Cliente</h1>
      </div>

      <div className="p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Dati Cliente</CardTitle>
            <CardDescription>Inserisci le informazioni del cliente da censire</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Azienda *</Label>
                <Input
                  id="name"
                  placeholder="Acme S.p.A."
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Nome Referente</Label>
                  <Input
                    id="contactName"
                    placeholder="Mario Rossi"
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email Referente</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="ciso@acme.corp"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    placeholder="+39 02 1234567"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Indirizzo</Label>
                  <Input
                    id="address"
                    placeholder="Via Roma 1, Milano"
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  placeholder="Note aggiuntive sul cliente..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea Cliente
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/customers">Annulla</Link>
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
