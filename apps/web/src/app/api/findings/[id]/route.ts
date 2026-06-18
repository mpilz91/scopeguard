import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!
    const finding = await prisma.finding.findFirst({ where: { id: params.id, organizationId: orgId } })
    if (!finding) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    await prisma.finding.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[FINDING DELETE]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
