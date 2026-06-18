import { prisma } from "./db"

/**
 * Verifica che il job possa essere eseguito:
 * 1. L'assessment esiste e appartiene al tenant
 * 2. L'assessment ha status APPROVED o IN_PROGRESS
 * 3. Tutti i target sono nello scope autorizzato
 */
export async function validateJobScope(params: {
  scanJobId: string
  organizationId: string
  assessmentId: string
  targets: string[]
}): Promise<{ valid: boolean; reason?: string }> {
  const { scanJobId, organizationId, assessmentId, targets } = params

  // 1. Verifica tenant isolation
  const job = await prisma.scanJob.findFirst({
    where: { id: scanJobId, organizationId },
    include: {
      assessment: {
        include: {
          roe: true,
          scopeItems: { include: { asset: true } },
        },
      },
    },
  })

  if (!job) return { valid: false, reason: "Job non trovato o accesso non autorizzato" }
  if (job.assessmentId !== assessmentId) return { valid: false, reason: "Assessment mismatch" }

  const { assessment } = job

  // 2. Stato assessment deve essere APPROVED o IN_PROGRESS
  if (!["APPROVED", "IN_PROGRESS"].includes(assessment.status)) {
    return {
      valid: false,
      reason: `Assessment in stato ${assessment.status}. Richiesto: APPROVED o IN_PROGRESS`,
    }
  }

  // 3. ROE deve essere APPROVED
  if (!assessment.roe || assessment.roe.status !== "APPROVED") {
    return { valid: false, reason: "Rules of Engagement non approvate dal cliente" }
  }

  // 4. Ogni target deve essere nello scope autorizzato
  const scopeValues = assessment.scopeItems.map((s) => s.asset.value.toLowerCase())
  for (const target of targets) {
    const inScope = scopeValues.some((sv) => {
      if (sv === target.toLowerCase()) return true
      // CIDR: controllo semplificato — in produzione usare un lib IP
      if (sv.includes("/") && isInCidr(target, sv)) return true
      // Dominio wildcard
      if (sv.startsWith("*.") && target.endsWith(sv.slice(1))) return true
      return false
    })
    if (!inScope) {
      return {
        valid: false,
        reason: `Target "${target}" non è nello scope autorizzato dell'assessment`,
      }
    }
  }

  return { valid: true }
}

function isInCidr(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split("/")
    const mask = ~(2 ** (32 - parseInt(bits)) - 1)
    const ipNum = ipToNum(ip)
    const rangeNum = ipToNum(range)
    return (ipNum & mask) === (rangeNum & mask)
  } catch {
    return false
  }
}

function ipToNum(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
}
