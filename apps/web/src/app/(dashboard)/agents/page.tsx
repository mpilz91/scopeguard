import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bot } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default async function AgentsPage() {
  const session = await getSession()
  const agents = await prisma.agentToken.findMany({
    where: { organizationId: session!.user.organizationId! },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="flex flex-col">
      <Header title="Agent Interni" description="Agenti Docker installabili in reti cliente" />
      <div className="p-6 space-y-4">
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="font-medium mb-1">Come installare un agent interno</p>
            <pre className="rounded bg-muted p-3 text-xs font-mono overflow-x-auto">
{`docker run -d \\
  --name scopeguard-agent \\
  --restart unless-stopped \\
  -e SCOPEGUARD_URL=https://your-platform-url \\
  -e AGENT_TOKEN=<your-token> \\
  -e POLL_INTERVAL_MS=30000 \\
  ghcr.io/scopeguard/agent:latest`}
            </pre>
            <p className="mt-2 text-muted-foreground text-xs">
              L&apos;agent esegue solo comunicazione outbound HTTPS. Non richiede apertura di porte inbound.
            </p>
          </CardContent>
        </Card>

        {agents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-base font-semibold">Nessun agent registrato</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea un token agent per installarlo nelle reti dei clienti.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Ultima vista</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Creato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "ACTIVE" ? "success" : a.status === "REVOKED" ? "destructive" : "secondary"}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.lastSeenAt ? formatDateTime(a.lastSeenAt) : "Mai"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{a.lastSeenIp ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(a.createdAt)}
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
