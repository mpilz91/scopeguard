import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

interface AgentJob {
  id: string
  type: string
  config: Record<string, unknown>
  targets: string[]
  assessmentId: string
  organizationId: string
}

export interface AgentFinding {
  title: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
  description: string
  evidence?: string
  affectedAsset: string
  port?: number
  protocol?: string
  cve?: string
  metadata?: Record<string, unknown>
}

export async function executeJob(job: AgentJob): Promise<AgentFinding[]> {
  const { type, targets, config } = job

  switch (type) {
    case "NMAP_DISCOVERY":
    case "NMAP_FULL":
    case "NMAP_VULN":
      return runNmap(targets, type, config)
    case "NUCLEI_CVE":
    case "NUCLEI_WEBAPP":
      return runNuclei(targets, type, config)
    default:
      throw new Error(`Tipo job non supportato dall'agent: ${type}`)
  }
}

async function runNmap(
  targets: string[],
  type: string,
  config: Record<string, unknown>
): Promise<AgentFinding[]> {
  const findings: AgentFinding[] = []

  for (const target of targets) {
    const args: string[] = ["-T3", "-oX", "-"]
    if (type === "NMAP_FULL") args.push("-sV", "-sC", "--top-ports", "1000")
    if (type === "NMAP_VULN") args.push("-sV", "--script=vuln")
    if (type === "NMAP_DISCOVERY") args.push("-sn")
    args.push(target)

    const { stdout } = await execFileAsync("nmap", args, {
      timeout: 300_000,
    })

    const portRegex = /portid="(\d+)"[\s\S]*?state state="([^"]+)"[\s\S]*?(?:service name="([^"]*)")?/g
    let match
    while ((match = portRegex.exec(stdout)) !== null) {
      if (match[2] === "open") {
        findings.push({
          title: `Porta ${match[1]} aperta su ${target}`,
          severity: "LOW",
          description: `Servizio ${match[3] ?? "sconosciuto"} rilevato sulla porta ${match[1]}`,
          affectedAsset: target,
          port: parseInt(match[1]),
          protocol: "tcp",
        })
      }
    }
  }

  return findings
}

async function runNuclei(
  targets: string[],
  type: string,
  config: Record<string, unknown>
): Promise<AgentFinding[]> {
  const findings: AgentFinding[] = []
  const templates = type === "NUCLEI_CVE" ? ["cves"] : ["exposures", "misconfiguration"]

  const args: string[] = ["-jsonl", "-silent", "-no-interactsh"]
  for (const t of templates) args.push("-t", t)
  for (const target of targets) args.push("-u", target)

  const { stdout } = await execFileAsync("nuclei", args, { timeout: 600_000 })

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const r = JSON.parse(trimmed)
      findings.push({
        title: r.info?.name ?? r.templateID ?? "Vulnerability",
        severity: mapSeverity(r.info?.severity),
        description: r.info?.description ?? r.templateID,
        evidence: r.matched,
        affectedAsset: r.host ?? targets[0],
        cve: r.info?.classification?.["cve-id"]?.[0],
        metadata: { templateID: r.templateID },
      })
    } catch {}
  }

  return findings
}

function mapSeverity(s?: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
  const m: Record<string, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
    info: "INFO",
  }
  return m[s?.toLowerCase() ?? ""] ?? "INFO"
}
