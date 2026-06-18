import "dotenv/config"
import { Worker, Job } from "bullmq"
import { redis } from "./lib/redis"
import { prisma } from "./lib/db"
import { processNmapJob } from "./processors/nmap"
import { processNucleiJob } from "./processors/nuclei"

const SCAN_QUEUE = "scan-jobs"

console.log("[WORKER] ScopeGuard Scanner Worker avviato")
console.log("[WORKER] Collegamento a Redis:", process.env.REDIS_URL ?? "redis://localhost:6379")

const worker = new Worker(
  SCAN_QUEUE,
  async (job: Job) => {
    const { scanJobId, organizationId, assessmentId, type, config, targets } = job.data

    console.log(`[WORKER] Job ricevuto: ${scanJobId} (${type})`)

    // Re-verifica che il job esista e appartenga al tenant (doppio controllo)
    const scanJob = await prisma.scanJob.findFirst({
      where: { id: scanJobId, organizationId },
    })

    if (!scanJob) {
      throw new Error(`ScanJob ${scanJobId} non trovato per org ${organizationId}`)
    }

    if (scanJob.status === "CANCELLED") {
      console.log(`[WORKER] Job ${scanJobId} annullato, skip`)
      return
    }

    switch (type) {
      case "NMAP_DISCOVERY":
        await processNmapJob({ scanJobId, organizationId, assessmentId, targets, config: { ...config, scanType: "DISCOVERY" } })
        break
      case "NMAP_FULL":
        await processNmapJob({ scanJobId, organizationId, assessmentId, targets, config: { ...config, scanType: "FULL" } })
        break
      case "NMAP_VULN":
        await processNmapJob({ scanJobId, organizationId, assessmentId, targets, config: { ...config, scanType: "VULN" } })
        break
      case "NUCLEI_CVE":
        await processNucleiJob({ scanJobId, organizationId, assessmentId, targets, config: { ...config, templates: ["cves"] } })
        break
      case "NUCLEI_WEBAPP":
        await processNucleiJob({ scanJobId, organizationId, assessmentId, targets, config: { ...config, templates: ["exposures", "misconfiguration", "technologies"] } })
        break
      default:
        throw new Error(`Tipo di scan non supportato: ${type}`)
    }

    console.log(`[WORKER] Job completato: ${scanJobId}`)
  },
  {
    connection: redis,
    concurrency: 2,  // Max 2 scan parallele
    limiter: {
      max: 5,
      duration: 60_000,  // Max 5 job al minuto
    },
  }
)

worker.on("completed", (job) => {
  console.log(`[WORKER] ✓ Job ${job.id} completato`)
})

worker.on("failed", (job, err) => {
  console.error(`[WORKER] ✗ Job ${job?.id} fallito:`, err.message)
})

worker.on("error", (err) => {
  console.error("[WORKER] Errore worker:", err)
})

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[WORKER] Shutdown in corso...")
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on("SIGINT", async () => {
  console.log("[WORKER] Interruzione...")
  await worker.close()
  await prisma.$disconnect()
  process.exit(0)
})
