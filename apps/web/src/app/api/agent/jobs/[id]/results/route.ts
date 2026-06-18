import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"

async function verifyAgentToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const raw = auth.slice(7)

  const tokens = await prisma.agentToken.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, tokenHash: true, organizationId: true },
  })

  for (const token of tokens) {
    if (await bcrypt.compare(raw, token.tokenHash)) {
      return token.organizationId
    }
  }
  return null
}

const findingSchema = z.object({
  title: z.string(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
  description: z.string(),
  evidence: z.string().optional(),
  affectedAsset: z.string(),
  port: z.number().optional(),
  protocol: z.string().optional(),
  cve: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const resultSchema = z.object({
  status: z.enum(["COMPLETED", "FAILED"]),
  findings: z.array(findingSchema).optional(),
  error: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = await verifyAgentToken(req)
  if (!organizationId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const job = await prisma.scanJob.findFirst({
    where: { id: params.id, organizationId },
  })
  if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 })

  const body = await req.json()
  const result = resultSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 })
  }

  const { status, findings, error } = result.data

  await prisma.$transaction(async (tx) => {
    await tx.scanJob.update({
      where: { id: params.id },
      data: {
        status: status === "COMPLETED" ? "COMPLETED" : "FAILED",
        completedAt: new Date(),
        errorMessage: error,
        result: findings ? { totalFindings: findings.length } : undefined,
      },
    })

    if (findings?.length) {
      await tx.finding.createMany({
        data: findings.map((f) => ({
          assessmentId: job.assessmentId,
          scanJobId: job.id,
          organizationId,
          title: f.title,
          severity: f.severity,
          status: "OPEN" as const,
          description: f.description,
          evidence: f.evidence,
          affectedAsset: f.affectedAsset,
          port: f.port,
          protocol: f.protocol,
          cve: f.cve,
          metadata: f.metadata,
        })),
      })
    }
  })

  return NextResponse.json({ success: true })
}
