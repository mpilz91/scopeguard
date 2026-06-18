import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export type LogFn = (msg: string) => void | Promise<void>

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

export async function executeJob(job: AgentJob, log: LogFn = () => {}): Promise<AgentFinding[]> {
  const { type, targets, config } = job
  switch (type) {
    case "NMAP_DISCOVERY":
    case "NMAP_FULL":
    case "NMAP_VULN":
      return runNmap(targets, type, config, log)
    case "NUCLEI_CVE":
    case "NUCLEI_WEBAPP":
      return runNuclei(targets, type, config, log)
    default:
      throw new Error(`Tipo job non supportato: ${type}`)
  }
}

// ── Nmap ──────────────────────────────────────────────────────────────────────

async function runNmap(
  targets: string[],
  type: string,
  _config: Record<string, unknown>,
  log: LogFn
): Promise<AgentFinding[]> {
  const findings: AgentFinding[] = []

  for (const target of targets) {
    const args: string[] = ["-T4", "-oX", "-", "--open"]

    if (type === "NMAP_DISCOVERY") {
      args.push("-F", "-sV", "--version-intensity", "2")
    } else if (type === "NMAP_FULL") {
      args.push("-sV", "-sC", "-p-")
    } else if (type === "NMAP_VULN") {
      args.push("-sV", "--script=vuln,safe")
    }

    args.push(target)

    await log(`[nmap] Avvio: nmap ${args.filter(a => a !== "-oX" && a !== "-").join(" ")}`)

    const { stdout } = await execFileAsync("nmap", args, { timeout: 600_000 })

    // Split per blocchi <host> — gestisce sia singoli IP che CIDR
    const hostBlocks = stdout.split(/<host[ >]/).slice(1)
    await log(`[nmap] ${hostBlocks.length} host trovato/i per target: ${target}`)

    for (const block of hostBlocks) {
      // Estrai IP reale dall'XML (fondamentale per CIDR)
      const ipMatch = block.match(/<address addr="([^"]+)" addrtype="ipv4"/)
      const hostIp = ipMatch?.[1] ?? target

      const stateMatch = block.match(/state="([^"]+)"/)
      if (!stateMatch || stateMatch[1] === "down") continue

      await log(`[nmap] Host up: ${hostIp}`)

      // Porte aperte nel blocco di questo host
      const portRegex = /<port protocol="([^"]+)" portid="(\d+)"><state state="([^"]+)"[^/]*\/>(?:<service name="([^"]*)"[^/]*?(?:product="([^"]*)")?[^/]*?(?:version="([^"]*)")?)?/g
      let match
      let portCount = 0

      while ((match = portRegex.exec(block)) !== null) {
        const [, protocol, portid, state, service, product, version] = match
        if (state !== "open") continue

        const port = parseInt(portid)
        const svcLabel = product ? `${product}${version ? " " + version : ""}` : (service ?? "unknown")
        const severity = portRiskSeverity(port, service)

        await log(`[nmap]   ${portid}/${protocol} open — ${svcLabel} [${severity}]`)

        findings.push({
          title: `Porta ${portid}/${protocol} aperta su ${hostIp} — ${svcLabel}`,
          severity,
          description: buildPortDescription(port, protocol, service, product, version, hostIp),
          affectedAsset: hostIp,
          port,
          protocol,
          metadata: { service, product, version, scanType: type, originalTarget: target },
        })
        portCount++
      }

      // Script NSE (NMAP_VULN)
      if (type === "NMAP_VULN") {
        const scriptRegex = /<script id="([^"]+)"[^>]*output="([^"]+)"/g
        while ((match = scriptRegex.exec(block)) !== null) {
          const [, scriptId, output] = match
          const decoded = output.replace(/\\n/g, "\n").replace(/&#xa;/g, "\n")
          if (!decoded.includes("VULNERABLE") && !decoded.includes("CVE-")) continue
          const cveMatch = decoded.match(/(CVE-\d{4}-\d+)/i)
          await log(`[nmap]   Script ${scriptId}: VULNERABLE${cveMatch ? " (" + cveMatch[1] + ")" : ""}`)
          findings.push({
            title: `${scriptId} — vulnerabilità su ${hostIp}`,
            severity: "HIGH",
            description: decoded.slice(0, 1000),
            affectedAsset: hostIp,
            cve: cveMatch?.[1],
            metadata: { scriptId, scanType: type, originalTarget: target },
          })
        }
      }

      if (portCount === 0) await log(`[nmap]   Nessuna porta aperta rilevata su ${hostIp}`)
    }
  }

  return findings
}

// ── Nuclei ────────────────────────────────────────────────────────────────────

async function runNuclei(
  targets: string[],
  type: string,
  _config: Record<string, unknown>,
  log: LogFn
): Promise<AgentFinding[]> {
  const findings: AgentFinding[] = []
  const templates = type === "NUCLEI_CVE" ? ["cves"] : ["exposures", "misconfiguration"]
  const args: string[] = ["-jsonl", "-silent", "-no-interactsh"]
  for (const t of templates) args.push("-t", t)
  for (const target of targets) args.push("-u", target)

  await log(`[nuclei] Avvio con template: ${templates.join(", ")}`)
  await log(`[nuclei] Target: ${targets.join(", ")}`)

  const { stdout } = await execFileAsync("nuclei", args, { timeout: 600_000 })

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const r = JSON.parse(trimmed)
      const sev = mapSeverity(r.info?.severity)
      await log(`[nuclei] ${r.templateID} — ${sev} — ${r.host}`)
      findings.push({
        title: r.info?.name ?? r.templateID ?? "Vulnerability",
        severity: sev,
        description: r.info?.description ?? r.templateID,
        evidence: r.matched,
        affectedAsset: r.host ?? targets[0],
        cve: r.info?.classification?.["cve-id"]?.[0],
        metadata: { templateID: r.templateID },
      })
    } catch {}
  }

  await log(`[nuclei] Completato: ${findings.length} finding`)
  return findings
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function portRiskSeverity(port: number, service?: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
  if ([23, 21, 2323, 512, 513, 514].includes(port)) return "CRITICAL"
  if ([445, 139, 3389, 5900, 5901, 4444, 1433, 3306, 5432, 27017, 6379, 11211].includes(port)) return "HIGH"
  if ([22, 80, 443, 8080, 8443, 8000, 8888, 9200, 9300].includes(port)) return "MEDIUM"
  return "LOW"
}

function buildPortDescription(
  port: number, protocol: string, service?: string,
  product?: string, version?: string, host?: string
): string {
  const svc = product ? `${product}${version ? " " + version : ""}` : (service ?? "unknown")
  let desc = `Porta ${port}/${protocol} aperta su ${host}. Servizio: ${svc}.`
  const notes: Record<number, string> = {
    21:    "FTP trasmette credenziali in chiaro. Sostituire con SFTP/SCP.",
    22:    "SSH esposto. Verificare versione, cipher e autenticazione a chiave.",
    23:    "Telnet trasmette tutto in chiaro. Disabilitare immediatamente.",
    80:    "HTTP non cifrato. Verificare redirect HTTPS e header di sicurezza.",
    443:   "HTTPS. Verificare certificato, TLS version e cipher suite.",
    445:   "SMB esposto. Verificare patch MS17-010 e condivisioni aperte.",
    3389:  "RDP esposto. Elevato rischio brute-force. Restringere con firewall.",
    3306:  "MySQL esposto pubblicamente. Verificare accesso da IP remoti.",
    5432:  "PostgreSQL esposto pubblicamente. Verificare bind address.",
    6379:  "Redis esposto. Rischio RCE se senza autenticazione.",
    27017: "MongoDB esposto. Verificare autenticazione abilitata.",
  }
  if (notes[port]) desc += " " + notes[port]
  return desc
}

function mapSeverity(s?: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" {
  const m: Record<string, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"> = {
    critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW", info: "INFO",
  }
  return m[s?.toLowerCase() ?? ""] ?? "INFO"
}
