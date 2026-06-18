import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Server, Target, Bug, TrendingUp, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"

async function getDashboardStats(organizationId: string) {
  const [customers, assets, assessments, findings, recentFindings, recentAssessments] = await Promise.all([
    prisma.customer.count({ where: { organizationId } }),
    prisma.asset.count({ where: { organizationId } }),
    prisma.assessment.count({ where: { organizationId } }),
    prisma.finding.count({ where: { organizationId } }),
    prisma.finding.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        severity: true,
        affectedAsset: true,
        createdAt: true,
        assessment: { select: { title: true } },
      },
    }),
    prisma.assessment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
  ])

  const findingsBySeverity = await prisma.finding.groupBy({
    by: ["severity"],
    where: { organizationId, status: "OPEN" },
    _count: true,
  })

  return { customers, assets, assessments, findings, recentFindings, recentAssessments, findingsBySeverity }
}

const SEVERITY_BADGE: Record<string, any> = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza",
  PENDING_APPROVAL: "In Approvazione",
  APPROVED: "Approvato",
  IN_PROGRESS: "In Corso",
  COMPLETED: "Completato",
  CANCELLED: "Annullato",
}

export default async function DashboardPage() {
  const session = await getSession()
  const stats = await getDashboardStats(session!.user.organizationId!)

  const criticalCount = stats.findingsBySeverity.find((f) => f.severity === "CRITICAL")?._count ?? 0
  const highCount = stats.findingsBySeverity.find((f) => f.severity === "HIGH")?._count ?? 0

  return (
    <div className="flex flex-col">
      <Header title="Dashboard" description={`Benvenuto, ${session?.user?.name}`} />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clienti</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Asset</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assets}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assessment</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assessments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Finding Aperti</CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.findings}</div>
              {(criticalCount > 0 || highCount > 0) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalCount} critici, {highCount} high
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent Findings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ultimi Finding</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentFindings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun finding ancora.</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentFindings.map((f) => (
                    <div key={f.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {f.affectedAsset} · {f.assessment.title}
                        </p>
                      </div>
                      <Badge variant={SEVERITY_BADGE[f.severity]} className="shrink-0">
                        {f.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Assessments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Assessment Recenti</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentAssessments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun assessment ancora.</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentAssessments.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.customer.name} · {a.type} · {formatDate(a.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {STATUS_LABEL[a.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
