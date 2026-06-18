import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietario",
  ADMIN: "Admin",
  PENTESTER: "Pentester",
  VIEWER: "Viewer",
}

export default async function SettingsPage() {
  const session = await getSession()
  const [org, memberships] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session!.user.organizationId! },
    }),
    prisma.membership.findMany({
      where: { organizationId: session!.user.organizationId! },
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return (
    <div className="flex flex-col">
      <Header title="Impostazioni" />

      <div className="space-y-6 p-6">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Organizzazione</CardTitle>
            <CardDescription>Dettagli della tua organizzazione su ScopeGuard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{org?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{org?.slug}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{org?.id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creata il</span>
              <span>{org ? formatDate(org.createdAt) : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>Membri del team con accesso alla piattaforma</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Membro dal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.user.name ?? m.user.email}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.role === "OWNER" ? "default" : "secondary"}>
                        {ROLE_LABEL[m.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
