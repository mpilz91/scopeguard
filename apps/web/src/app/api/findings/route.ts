import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { z } from "zod"

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrg()
    const { searchParams } = new URL(req.url)
    const assessmentId = searchParams.get("assessmentId")
    const findings = await prisma.finding.findMany({
      where: {
        organizationId: session.user.organizationId!,
        ...(assessmentId ? { assessmentId } : {}),
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      include: { assessment: { select: { title: true, customer: { select: { name: true } } } } },
      take: 200,
    })
    return NextResponse.json(findings)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1) })

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!
    const body = await req.json()
    const result = bulkDeleteSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: "ids richiesti" }, { status: 400 })

    const { count } = await prisma.finding.deleteMany({
      where: { id: { in: result.data.ids }, organizationId: orgId },
    })
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error("[FINDINGS BULK DELETE]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
