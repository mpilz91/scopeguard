import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

const SEVERITY_BADGE: Record<string, any> = {
  CRITICAL: "critical", HIGH: "high", MEDIUM: "medium", LOW: "low", INFO: "info",
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aperto", CONFIRMED: "Confermato", FALSE_POSITIVE: "Falso Positivo",
  REMEDIATED: "Rimediato", ACCEPTED_RISK: "Rischio Accettato",
}

export default async function FindingsPage() {
  const session = await getSession()
  const findings = await prisma.finding.findMany({
    where: { organizationId: session!.user.organizationId! },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    include: {
      assessment: { select: { title: true, customer: { select: { name: true } } } },
    },
    take: 100,
  })

  return (
    <div className="flex flex-col">
      <Header title="Findings" description={`${findings.length} vulnerabilità rilevate`} />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Asset Colpito</TableHead>
                <TableHead>Assessment</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {findings.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium max-w-xs truncate">{f.title}</TableCell>
                  <TableCell>
                    <Badge variant={SEVERITY_BADGE[f.severity]}>{f.severity}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{f.affectedAsset}</TableCell>
                  <TableCell className="text-sm">
                    <p>{f.assessment.title}</p>
                    <p className="text-xs text-muted-foreground">{f.assessment.customer.name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{STATUS_LABEL[f.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(f.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {findings.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nessun finding ancora. I finding appariranno qui dopo le scansioni.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
