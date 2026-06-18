import Link from "next/link"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function CustomersPage() {
  const session = await getSession()
  const customers = await prisma.customer.findMany({
    where: { organizationId: session!.user.organizationId! },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { assets: true, assessments: true } },
    },
  })

  return (
    <div className="flex flex-col">
      <Header
        title="Clienti"
        description={`${customers.length} clienti registrati`}
        actions={
          <Button asChild size="sm">
            <Link href="/customers/new">
              <Plus className="mr-1 h-4 w-4" />
              Nuovo Cliente
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        {customers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun cliente</h3>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">
                Inizia aggiungendo il primo cliente della tua organizzazione.
              </p>
              <Button asChild>
                <Link href="/customers/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Cliente
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contatto</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      {c.contactName && <p className="text-sm">{c.contactName}</p>}
                      {c.contactEmail && (
                        <p className="text-xs text-muted-foreground">{c.contactEmail}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c._count.assets}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c._count.assessments}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/customers/${c.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
