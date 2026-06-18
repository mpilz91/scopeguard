import { Queue } from "bullmq"
import { redis } from "./redis"

export const SCAN_QUEUE = "scan-jobs"
export const REPORT_QUEUE = "report-jobs"

export const scanQueue = new Queue(SCAN_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 500 },
  },
})

export const reportQueue = new Queue(REPORT_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 3000 },
    removeOnComplete: { age: 86400, count: 50 },
    removeOnFail: { age: 604800, count: 100 },
  },
})

export type ScanJobPayload = {
  scanJobId: string
  organizationId: string
  assessmentId: string
  type: string
  config: Record<string, unknown>
  targets: string[]
}

export type ReportJobPayload = {
  reportId: string
  assessmentId: string
  organizationId: string
  type: string
}
