import { execFile } from "child_process"
import { promisify } from "util"
import { prisma } from "../lib/db"
import { validateJobScope } from "../lib/security"

const execFileAsync = promisify(execFile)

export interface NmapConfig {
  scanType: "DISCOVERY" | "FULL" | "VULN"
  timing?: number  // Nmap -T0 to -T5
  ports?: string   // es. "80,443,8080" o "1-1000"
}

export async function processNmapJob(payload: {
  scanJobId: string
  organizationId: string
  assessmentId: string
  targets: string[]
  config: NmapConfig
}) {
  const { scanJobId, organizationId, assessmentId, targets, config } = payload

  // 1. Security gate — nessuna scansione senza autorizzazione
  const { valid, reason } = await validateJobScope({ scanJobId, organizationId, assessmentId, targets })
  if (!valid) {
    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: { status: "FAILED", errorMessage: `SECURITY GATE: ${reason}` },
    })
    throw new Error(`Security gate blocked scan: ${reason}`)
  }

  // 2. Aggiorna stato a RUNNING
  await prisma.scanJob.update({
    where: { id: scanJobId },
    data: { status: "RUNNING", startedAt: new Date() },
  })

  try {
    const results: Record<string, unknown>[] = []

    for (const target of targets) {
      const args = buildNmapArgs(target, config)
      console.log(`[NMAP] Scanning ${target}: nmap ${args.join(" ")}`)

      const { stdout, stderr } = await execFileAsync("nmap", args, {
        timeout: 300_000,
        maxBuffer: 10 * 1024 * 1024,
      })

      const parsed = parseNmapOutput(stdout, target)
      results.push(...parsed.hosts)

      if (config.scanType === "DISCOVERY") {
        // Fase mappatura: crea DiscoveredHost, nessun Finding
        for (const host of parsed.hosts) {
          const openPorts = (host.ports as any[])?.filter((p) => p.state === "open") ?? []
          await prisma.discoveredHost.upsert({
            where: {
              scanJobId_ipAddress: { scanJobId, ipAddress: host.ip as string },
            },
            create: {
              scanJobId,
              assessmentId,
              organizationId,
              ipAddress: host.ip as string,
              openPorts,
              rawOutput: { ports: host.ports },
            },
            update: {
              openPorts,
              rawOutput: { ports: host.ports },
              updatedAt: new Date(),
            },
          })
        }
      } else {
        // Fase vulnerabilità (FULL / VULN): crea Findings per porte aperte
        for (const host of parsed.hosts) {
          for (const port of (host.ports as any[]) ?? []) {
            if (port.state === "open") {
              await prisma.finding.create({
                data: {
                  assessmentId,
                  scanJobId,
                  organizationId,
                  title: `Porta ${port.port}/${port.protocol} aperta su ${host.ip}`,
                  severity: getPortSeverity(port.port),
                  status: "OPEN",
                  description: `Il servizio ${port.service ?? "sconosciuto"} è raggiungibile sulla porta ${port.port}.`,
                  affectedAsset: host.ip as string,
                  port: parseInt(port.port),
                  protocol: port.protocol,
                  metadata: { nmapOutput: port },
                },
              })
            }
          }
        }
      }
    }

    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        result: { hosts: results },
      },
    })
  } catch (err: any) {
    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: { status: "FAILED", errorMessage: err.message },
    })
    throw err
  }
}

function buildNmapArgs(target: string, config: NmapConfig): string[] {
  const timing = config.timing ?? 3
  const args = [
    "-T" + timing,
    "-oX", "-",  // XML output to stdout
    "--host-timeout", "60s",
  ]

  switch (config.scanType) {
    case "DISCOVERY":
      args.push("-sn")  // Ping scan, no port scan
      break
    case "FULL":
      args.push("-sV", "-sC")
      if (config.ports) args.push("-p", config.ports)
      else args.push("--top-ports", "1000")
      break
    case "VULN":
      args.push("-sV", "--script=vuln")
      if (config.ports) args.push("-p", config.ports)
      break
  }

  args.push(target)
  return args
}

function parseNmapOutput(xml: string, target: string): { hosts: Record<string, unknown>[] } {
  // Parsing XML semplificato — in produzione usare una libreria XML
  const hosts: Record<string, unknown>[] = []
  const hostRegex = /<host>([\s\S]*?)<\/host>/g
  let match

  while ((match = hostRegex.exec(xml)) !== null) {
    const hostXml = match[1]
    const ip = (/<addr addr="([^"]+)" addrtype="ipv4"/).exec(hostXml)?.[1] ?? target
    const ports: Record<string, unknown>[] = []

    const portRegex = /<port protocol="([^"]+)" portid="([^"]+)">[\s\S]*?<state state="([^"]+)"[\s\S]*?(?:<service name="([^"]*)")?/g
    let portMatch
    while ((portMatch = portRegex.exec(hostXml)) !== null) {
      ports.push({
        protocol: portMatch[1],
        port: portMatch[2],
        state: portMatch[3],
        service: portMatch[4] ?? null,
      })
    }

    hosts.push({ ip, ports })
  }

  return { hosts }
}

function getPortSeverity(port: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
  const portNum = parseInt(port)
  const highRiskPorts = [21, 23, 135, 137, 138, 139, 445, 1433, 3306, 3389, 5432, 6379, 27017]
  const medRiskPorts = [22, 25, 110, 143, 3000, 8080, 8443, 8888]

  if (highRiskPorts.includes(portNum)) return "HIGH"
  if (medRiskPorts.includes(portNum)) return "MEDIUM"
  return "LOW"
}
