import Link from "next/link"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Target, ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza", PENDING_APPROVAL: "In Approvazione", APPROVED: "Approvato",
  IN_PROGRESS: "In Corso", COMPLETED: "Completato", CANCELLED: "Annullato",
}

const TYPE_LABEL: Record<string, string> = {
  EXTERNAL: "Esterno", INTERNAL: "Interno", WEBAPP: "Web App", RETEST: "Retest",
}

export default async function AssessmentsPage() {
  const session = await getSession()
  const assessments = await prisma.assessment.findMany({
    where: { organizationId: session!.user.organizationId! },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      _count: { select: { findings: true, scopeItems: true } },
    },
  })

  return (
    <div className="flex flex-col">
      <Header
        title="Assessment"
        description={`${assessments.length} assessment totali`}
        actions={
          <Button asChild size="sm">
            <Link href="/assessments/new">
              <Plus className="mr-1 h-4 w-4" />
              Nuovo Assessment
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        {assessments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Target className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun assessment</h3>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">
                Crea il primo assessment per avviare un&apos;attività di VA/PT.
              </p>
              <Button asChild>
                <Link href="/assessments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Crea Assessment
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Finding</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABEL[a.type]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{a.customer.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a._count.scopeItems} asset</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a._count.findings > 0 ? "destructive" : "secondary"}>
                        {a._count.findings}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_LABEL[a.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/assessments/${a.id}`}>
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
