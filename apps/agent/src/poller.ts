import { executeJob } from "./executor"

interface PollConfig {
  platformUrl: string
  agentToken: string
  pollIntervalMs: number
}

interface AgentJob {
  id: string
  type: string
  config: Record<string, unknown>
  targets: string[]
  assessmentId: string
  organizationId: string
}

export class Poller {
  private running = false
  private timer: NodeJS.Timeout | null = null
  private readonly config: PollConfig

  constructor(config: PollConfig) {
    this.config = config
  }

  start() {
    this.running = true
    this.poll()
  }

  stop() {
    this.running = false
    if (this.timer) clearTimeout(this.timer)
  }

  private schedule() {
    if (!this.running) return
    this.timer = setTimeout(() => this.poll(), this.config.pollIntervalMs)
  }

  private async poll() {
    try {
      const job = await this.fetchNextJob()
      if (job) {
        console.log(`[AGENT] Job ricevuto: ${job.id} (${job.type}) — target: ${job.targets.join(", ")}`)
        await this.runJob(job)
      }
    } catch (err: any) {
      console.error("[AGENT] Errore polling:", err.message)
    } finally {
      this.schedule()
    }
  }

  private async fetchNextJob(): Promise<AgentJob | null> {
    const { default: fetch } = await import("node-fetch")
    const res = await fetch(`${this.config.platformUrl}/api/agent/jobs`, {
      headers: {
        Authorization: `Bearer ${this.config.agentToken}`,
        "Content-Type": "application/json",
        "User-Agent": "ScopeGuard-Agent/0.1",
      },
    })
    if (res.status === 204) return null
    if (!res.ok) {
      if (res.status === 401) {
        console.error("[AGENT] Token non valido o revocato. Uscita.")
        this.stop()
        process.exit(1)
      }
      throw new Error(`Poll failed: ${res.status} ${res.statusText}`)
    }
    return res.json() as Promise<AgentJob>
  }

  private async sendLog(jobId: string, line: string) {
    try {
      const { default: fetch } = await import("node-fetch")
      await fetch(`${this.config.platformUrl}/api/agent/jobs/${jobId}/log`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.agentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ line }),
      })
    } catch {
      // log push non bloccante
    }
  }

  private async runJob(job: AgentJob) {
    const { default: fetch } = await import("node-fetch")

    const ts = () => new Date().toISOString().slice(11, 19)
    const log = async (msg: string) => {
      const line = `[${ts()}] ${msg}`
      console.log(`[AGENT][${job.id.slice(-6)}] ${msg}`)
      await this.sendLog(job.id, line)
    }

    // Notifica inizio
    const startRes = await fetch(`${this.config.platformUrl}/api/agent/jobs/${job.id}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.agentToken}`, "Content-Type": "application/json" },
    })
    if (!startRes.ok) {
      const d = await startRes.json() as any
      console.error(`[AGENT] Start rifiutato: ${d.error}`)
      return
    }

    await log(`Avvio job ${job.type} su ${job.targets.length} target: ${job.targets.join(", ")}`)

    try {
      const findings = await executeJob(job, log)

      await log(`Completato. ${findings.length} finding trovati.`)

      await fetch(`${this.config.platformUrl}/api/agent/jobs/${job.id}/results`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.agentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED", findings }),
      })

      console.log(`[AGENT] Job ${job.id} completato: ${findings.length} finding`)
    } catch (err: any) {
      await log(`Errore: ${err.message}`)
      await fetch(`${this.config.platformUrl}/api/agent/jobs/${job.id}/results`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.agentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FAILED", error: err.message }),
      })
      console.error(`[AGENT] Job ${job.id} fallito:`, err.message)
    }
  }
}
