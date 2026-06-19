import Link from "next/link"
import { redirect } from "next/navigation"
import { requirePlatformAdmin } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/utils"

const ORG_TYPE_LABEL: Record<string, string> = { RESELLER: "Reseller", CLIENT: "Client" }
const ORG_TYPE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  RESELLER: "default",
  CLIENT: "secondary",
}

export default async function AdminOrgsPage() {
  try {
    await requirePlatformAdmin()
  } catch {
    redirect("/dashboard")
  }

  const orgs = await prisma.organization.findMany({
    where: { orgType: { in: ["RESELLER", "CLIENT"] } },
    include: {
      parent: { select: { name: true, slug: true } },
      _count: { select: { memberships: true, contracts: true, children: true, customers: true } },
    },
    orderBy: [{ orgType: "asc" }, { name: "asc" }],
  })

  return (
    <div className="flex flex-col">
      <Header
        title="Organizzazioni"
        description={`${orgs.length} organizzazioni registrate`}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/organizations/new">
              <Plus className="mr-1 h-4 w-4" />
              Nuova Organizzazione
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Membri</TableHead>
                <TableHead>Contratti</TableHead>
                <TableHead>Clienti</TableHead>
                <TableHead>Creata</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nessuna organizzazione. Creane una con il pulsante in alto.
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <div>{org.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{org.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORG_TYPE_VARIANT[org.orgType] ?? "outline"}>
                        {ORG_TYPE_LABEL[org.orgType] ?? org.orgType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {org.parent?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{org._count.memberships}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{org._count.contracts}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{org._count.customers}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(org.createdAt)}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/admin/organizations/${org.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
