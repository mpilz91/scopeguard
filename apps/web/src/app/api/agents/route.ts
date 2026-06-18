import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const createSchema = z.object({
  name: z.string().min(2).max(80),
})

export async function GET() {
  try {
    const session = await requireOrg()
    const tokens = await prisma.agentToken.findMany({
      where: { organizationId: session.user.organizationId! },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, status: true,
        lastSeenAt: true, lastSeenIp: true, createdAt: true,
        _count: { select: { scanJobs: true } },
      },
    })
    return NextResponse.json(tokens)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const body = await req.json()
    const result = createSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = await bcrypt.hash(rawToken, 12)

    const token = await prisma.agentToken.create({
      data: {
        name: result.data.name,
        tokenHash,
        organizationId: orgId,
        status: "ACTIVE",
      },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "AGENT_TOKEN_CREATED",
      resource: "agent_token",
      resourceId: token.id,
      metadata: { name: token.name },
    })

    // Return raw token only once — never stored in plaintext
    return NextResponse.json({ id: token.id, name: token.name, rawToken }, { status: 201 })
  } catch (err) {
    console.error("[AGENTS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
