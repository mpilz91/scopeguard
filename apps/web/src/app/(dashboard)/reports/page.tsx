import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"

export default async function ReportsPage() {
  const session = await getSession()
  const reports = await prisma.report.findMany({
    where: { organizationId: session!.user.organizationId! },
    orderBy: { createdAt: "desc" },
    include: { assessment: { select: { title: true } } },
  })

  return (
    <div className="flex flex-col">
      <Header title="Report" description="Report PDF generati dagli assessment" />
      <div className="p-6">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun report</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                I report PDF verranno generati al completamento degli assessment.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              {reports.length} report disponibili — funzionalità PDF in sviluppo (Sprint 2)
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
