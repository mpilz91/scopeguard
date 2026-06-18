import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const approveSchema = z.object({
  content: z.string().min(10),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        roe: true,
        scopeItems: true,
      },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    if (assessment.scopeItems.length === 0) {
      return NextResponse.json({ error: "Aggiungi almeno un asset allo scope prima di approvare la ROE" }, { status: 400 })
    }

    if (["COMPLETED", "CANCELLED"].includes(assessment.status)) {
      return NextResponse.json({ error: "Assessment non modificabile in questo stato" }, { status: 400 })
    }

    const body = await req.json()
    const result = approveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: "Contenuto ROE non valido" }, { status: 400 })
    }

    // Upsert ROE con stato APPROVED
    const roe = await prisma.rulesOfEngagement.upsert({
      where: { assessmentId: params.id },
      create: {
        assessmentId: params.id,
        content: result.data.content,
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
      update: {
        content: result.data.content,
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    })

    // Porta automaticamente l'assessment in APPROVED se era DRAFT o PENDING
    if (["DRAFT", "PENDING_APPROVAL"].includes(assessment.status)) {
      await prisma.assessment.update({
        where: { id: params.id },
        data: { status: "APPROVED" },
      })
    }

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "ROE_APPROVED",
      resource: "roe",
      resourceId: roe.id,
      metadata: { approvedBy: session.user.id, scopeCount: assessment.scopeItems.length },
    })

    return NextResponse.json(roe)
  } catch (err) {
    console.error("[ROE APPROVE]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
