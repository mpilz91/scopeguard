import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Plus, Server, Target, Mail, Phone } from "lucide-react"
import { formatDate } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  PENDING_APPROVAL: "In Approvazione",
  APPROVED: "Approvato",
  IN_PROGRESS: "In Corso",
  COMPLETED: "Completato",
  CANCELLED: "Annullato",
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, organizationId: session!.user.organizationId! },
    include: {
      assets: { orderBy: { createdAt: "desc" } },
      assessments: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!customer) notFound()

  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center justify-between border-b bg-background px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-base font-semibold">{customer.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/assets/new?customerId=${customer.id}`}>
              <Plus className="mr-1 h-4 w-4" />
              Aggiungi Asset
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/assessments/new?customerId=${customer.id}`}>
              <Plus className="mr-1 h-4 w-4" />
              Nuovo Assessment
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {/* Info card */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Informazioni Cliente</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            {customer.contactName && (
              <div>
                <p className="text-xs text-muted-foreground">Referente</p>
                <p className="font-medium">{customer.contactName}</p>
              </div>
            )}
            {customer.contactEmail && (
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.contactEmail}
                </p>
              </div>
            )}
            {customer.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Telefono</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </p>
              </div>
            )}
            {customer.address && (
              <div>
                <p className="text-xs text-muted-foreground">Indirizzo</p>
                <p className="font-medium">{customer.address}</p>
              </div>
            )}
            {customer.notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Note</p>
                <p className="font-medium">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assets */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Server className="h-4 w-4" />
              Asset ({customer.assets.length})
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/assets/new?customerId=${customer.id}`}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Aggiungi
              </Link>
            </Button>
          </div>
          <Card>
            {customer.assets.length === 0 ? (
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nessun asset ancora per questo cliente.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valore</TableHead>
                    <TableHead>Aggiunto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.assets.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{a.value}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Assessments */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4" />
              Assessment ({customer.assessments.length})
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/assessments/new?customerId=${customer.id}`}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nuovo
              </Link>
            </Button>
          </div>
          <Card>
            {customer.assessments.length === 0 ? (
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nessun assessment ancora per questo cliente.
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Creato</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.assessments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{STATUS_LABEL[a.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/assessments/${a.id}`}>Apri</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
