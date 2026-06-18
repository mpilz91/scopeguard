import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

async function verifyAgentToken(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const raw = auth.slice(7)
  const tokens = await prisma.agentToken.findMany({
    where: { status: "ACTIVE" },
    select: { tokenHash: true, organizationId: true },
  })
  for (const t of tokens) {
    if (await bcrypt.compare(raw, t.tokenHash)) return t.organizationId
  }
  return null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const organizationId = await verifyAgentToken(req)
  if (!organizationId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const job = await prisma.scanJob.findFirst({
    where: { id: params.id, organizationId },
    select: { id: true, result: true },
  })
  if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 })

  const { line } = await req.json()
  if (!line || typeof line !== "string") return NextResponse.json({ ok: true })

  const current = (job.result as any) ?? {}
  const logs: string[] = Array.isArray(current.logs) ? current.logs : []
  logs.push(line)

  await prisma.scanJob.update({
    where: { id: params.id },
    data: { result: { ...current, logs } as any },
  })

  return NextResponse.json({ ok: true })
}
