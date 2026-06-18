import Link from "next/link"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Server } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function AssetsPage() {
  const session = await getSession()
  const assets = await prisma.asset.findMany({
    where: { organizationId: session!.user.organizationId! },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true } } },
  })

  return (
    <div className="flex flex-col">
      <Header
        title="Asset"
        description={`${assets.length} asset censiti`}
        actions={
          <Button asChild size="sm">
            <Link href="/assets/new">
              <Plus className="mr-1 h-4 w-4" />
              Nuovo Asset
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        {assets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Server className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun asset</h3>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">
                Censisci gli asset dei tuoi clienti per poterli includere negli assessment.
              </p>
              <Button asChild>
                <Link href="/assets/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Asset
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valore / Target</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Aggiunto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.value}</TableCell>
                    <TableCell>
                      <Link
                        href={`/customers/${a.customer.id}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {a.customer.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
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
