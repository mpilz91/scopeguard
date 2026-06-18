"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: "destructive", title: "Errore registrazione", description: data.error ?? "Errore sconosciuto" })
        return
      }
      toast({ title: "Account creato!", description: "Ora puoi accedere alla piattaforma." })
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Crea account</CardTitle>
        <CardDescription>Registra la tua società di cybersecurity su ScopeGuard</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Nome Organizzazione</Label>
            <Input
              id="organizationName"
              placeholder="Acme Security S.r.l."
              required
              value={form.organizationName}
              onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome e Cognome</Label>
            <Input
              id="name"
              placeholder="Mario Rossi"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 caratteri, 1 maiuscola, 1 numero"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crea Account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Hai già un account?{" "}
            <Link href="/login" className="font-medium underline underline-offset-4 hover:text-primary">
              Accedi
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
