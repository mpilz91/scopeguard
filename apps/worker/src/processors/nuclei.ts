import { execFile } from "child_process"
import { promisify } from "util"
import { prisma } from "../lib/db"
import { validateJobScope } from "../lib/security"

const execFileAsync = promisify(execFile)

export interface NucleiConfig {
  templates?: string[]   // es. ["cves", "exposures/configs"]
  severity?: string      // es. "critical,high,medium"
  rateLimit?: number
}

const NUCLEI_SEVERITY_MAP: Record<string, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  info: "INFO",
  unknown: "INFO",
}

export async function processNucleiJob(payload: {
  scanJobId: string
  organizationId: string
  assessmentId: string
  targets: string[]
  config: NucleiConfig
}) {
  const { scanJobId, organizationId, assessmentId, targets, config } = payload

  // Security gate
  const { valid, reason } = await validateJobScope({ scanJobId, organizationId, assessmentId, targets })
  if (!valid) {
    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: { status: "FAILED", errorMessage: `SECURITY GATE: ${reason}` },
    })
    throw new Error(`Security gate blocked scan: ${reason}`)
  }

  await prisma.scanJob.update({
    where: { id: scanJobId },
    data: { status: "RUNNING", startedAt: new Date() },
  })

  try {
    const args = buildNucleiArgs(targets, config)
    console.log(`[NUCLEI] Running: nuclei ${args.join(" ")}`)

    const { stdout } = await execFileAsync("nuclei", args, {
      timeout: 600_000,
      maxBuffer: 50 * 1024 * 1024,
    })

    const findings = parseNucleiJsonl(stdout)

    for (const finding of findings) {
      await prisma.finding.create({
        data: {
          assessmentId,
          scanJobId,
          organizationId,
          title: finding.info?.name ?? finding.templateID ?? "Vulnerability rilevata",
          severity: NUCLEI_SEVERITY_MAP[finding.info?.severity?.toLowerCase() ?? "info"] ?? "INFO",
          status: "OPEN",
          description: finding.info?.description ?? `Rilevato da template ${finding.templateID}`,
          evidence: finding.matched ?? finding.extractedResults?.join("\n"),
          remediation: finding.info?.remediation,
          affectedAsset: extractHost(finding.host ?? targets[0]),
          cve: finding.info?.classification?.["cve-id"]?.[0],
          cvss: finding.info?.classification?.["cvss-score"],
          cwe: finding.info?.classification?.["cwe-id"]?.[0],
          metadata: {
            templateID: finding.templateID,
            matched: finding.matched,
            tags: finding.info?.tags,
          },
        },
      })
    }

    await prisma.scanJob.update({
      where: { id: scanJobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        result: { totalFindings: findings.length },
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

function buildNucleiArgs(targets: string[], config: NucleiConfig): string[] {
  const args = [
    "-jsonl",
    "-no-interactsh",
    "-silent",
    "-rate-limit", String(config.rateLimit ?? 50),
  ]

  if (config.templates?.length) {
    for (const t of config.templates) {
      args.push("-t", t)
    }
  } else {
    args.push("-t", "cves", "-t", "exposures/configs", "-t", "misconfiguration")
  }

  if (config.severity) {
    args.push("-severity", config.severity)
  }

  // Target
  args.push("-list", "-")  // stdin list — alternativa: -u per singoli target
  // In realtà passiamo con -u
  // Rimuoviamo -list e usiamo -u per ogni target
  args.splice(args.indexOf("-list"), 2)
  for (const target of targets) {
    args.push("-u", target)
  }

  return args
}

function parseNucleiJsonl(output: string): any[] {
  const results: any[] = []
  for (const line of output.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      results.push(JSON.parse(trimmed))
    } catch {
      // linea non JSON, skip
    }
  }
  return results
}

function extractHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
