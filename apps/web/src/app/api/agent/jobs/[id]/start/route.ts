import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

async function verifyAgentToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const raw = auth.slice(7)

  const tokens = await prisma.agentToken.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, tokenHash: true, organizationId: true },
  })

  for (const token of tokens) {
    if (await bcrypt.compare(raw, token.tokenHash)) return token.organizationId
  }
  return null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = await verifyAgentToken(req)
  if (!organizationId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const job = await prisma.scanJob.findFirst({
    where: { id: params.id, organizationId },
  })
  if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 })

  await prisma.scanJob.update({
    where: { id: params.id },
    data: { status: "RUNNING", startedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
