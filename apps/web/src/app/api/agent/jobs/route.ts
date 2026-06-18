import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

async function verifyAgentToken(req: NextRequest): Promise<{ agentToken: any; organizationId: string } | null> {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const raw = auth.slice(7)

  const tokens = await prisma.agentToken.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, tokenHash: true, organizationId: true },
  })

  for (const token of tokens) {
    if (await bcrypt.compare(raw, token.tokenHash)) {
      await prisma.agentToken.update({
        where: { id: token.id },
        data: { lastSeenAt: new Date(), lastSeenIp: req.headers.get("x-forwarded-for") ?? undefined },
      })
      return { agentToken: token, organizationId: token.organizationId }
    }
  }
  return null
}

// Agent polling: GET /api/agent/jobs
export async function GET(req: NextRequest) {
  const auth = await verifyAgentToken(req)
  if (!auth) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const job = await prisma.scanJob.findFirst({
    where: {
      organizationId: auth.organizationId,
      status: "PENDING",
      OR: [
        { agentTokenId: auth.agentToken.id },
        { agentTokenId: null },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      assessment: {
        include: {
          roe: { select: { status: true } },
          scopeItems: { include: { asset: { select: { value: true } } } },
        },
      },
    },
  })

  if (!job) return new NextResponse(null, { status: 204 })

  // Security gate
  if (!["APPROVED", "IN_PROGRESS"].includes(job.assessment.status)) {
    return new NextResponse(null, { status: 204 })
  }
  if (job.assessment.roe?.status !== "APPROVED") {
    return new NextResponse(null, { status: 204 })
  }

  // Claim the job atomically: set to QUEUED and assign this agent
  const claimed = await prisma.scanJob.updateMany({
    where: { id: job.id, status: "PENDING" },
    data: { status: "QUEUED", agentTokenId: auth.agentToken.id },
  })
  if (claimed.count === 0) return new NextResponse(null, { status: 204 }) // another agent claimed it first

  const targets = job.assessment.scopeItems.map((s) => s.asset.value)

  return NextResponse.json({
    id: job.id,
    type: job.type,
    config: job.config,
    targets,
    assessmentId: job.assessmentId,
    organizationId: job.organizationId,
  })
}
