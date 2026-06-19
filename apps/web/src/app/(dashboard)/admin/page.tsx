import { redirect } from "next/navigation"
import { requirePlatformAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, FileText, ShieldCheck, Users } from "lucide-react"

export default async function AdminPage() {
  try {
    await requirePlatformAdmin()
  } catch {
    redirect("/dashboard")
  }

  const [orgsCount, resellerCount, clientCount, serviceTypesCount, contractsCount] = await Promise.all([
    prisma.organization.count({ where: { orgType: { in: ["RESELLER", "CLIENT"] } } }),
    prisma.organization.count({ where: { orgType: "RESELLER" } }),
    prisma.organization.count({ where: { orgType: "CLIENT" } }),
    prisma.serviceType.count(),
    prisma.serviceContract.count({ where: { isActive: true } }),
  ])

  const kpis = [
    { label: "Organizzazioni totali", value: orgsCount, icon: Building2, sub: `${resellerCount} reseller · ${clientCount} client` },
    { label: "Tipi di Servizio", value: serviceTypesCount, icon: ShieldCheck, sub: "Nel catalogo" },
    { label: "Contratti Attivi", value: contractsCount, icon: FileText, sub: "Assegnati" },
  ]

  return (
    <div className="flex flex-col">
      <Header
        title="Pannello Platform Admin"
        description="Gestione globale di organizzazioni, servizi e contratti"
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {kpis.map(({ label, value, icon: Icon, sub }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accesso rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/admin/organizations", label: "Gestisci Organizzazioni", icon: Building2 },
                { href: "/admin/service-types", label: "Catalogo Tipi Servizio", icon: ShieldCheck },
                { href: "/admin/contracts", label: "Gestisci Contratti", icon: FileText },
              ].map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </a>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenziali demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="font-mono text-xs text-muted-foreground">Platform Admin</p>
                <p className="font-medium">admin@example.com</p>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="font-mono text-xs text-muted-foreground">Reseller Demo</p>
                <p className="font-medium">reseller@example.com</p>
              </div>
              <p className="text-xs text-muted-foreground">Password: Admin1234!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
