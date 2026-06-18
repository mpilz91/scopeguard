import "dotenv/config"
import { Poller } from "./poller"

const PLATFORM_URL = process.env.SCOPEGUARD_URL ?? "https://app.scopeguard.io"
const AGENT_TOKEN = process.env.AGENT_TOKEN

if (!AGENT_TOKEN) {
  console.error("[AGENT] AGENT_TOKEN non configurato. Uscita.")
  process.exit(1)
}

console.log("[AGENT] ScopeGuard Internal Agent avviato")
console.log("[AGENT] Platform URL:", PLATFORM_URL)

const poller = new Poller({
  platformUrl: PLATFORM_URL,
  agentToken: AGENT_TOKEN,
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "30000"),
})

poller.start()

process.on("SIGTERM", () => {
  console.log("[AGENT] Shutdown...")
  poller.stop()
  process.exit(0)
})

process.on("SIGINT", () => {
  poller.stop()
  process.exit(0)
})
