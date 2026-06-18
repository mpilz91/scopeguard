import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { audit } from "@/lib/audit"

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const token = await prisma.agentToken.findFirst({
      where: { id: params.id, organizationId: orgId },
    })
    if (!token) return NextResponse.json({ error: "Token non trovato" }, { status: 404 })
    if (token.status === "REVOKED") {
      return NextResponse.json({ error: "Token già revocato" }, { status: 400 })
    }

    await prisma.agentToken.update({
      where: { id: params.id },
      data: { status: "REVOKED" },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "AGENT_TOKEN_REVOKED",
      resource: "agent_token",
      resourceId: token.id,
      metadata: { name: token.name },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[AGENTS DELETE]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
