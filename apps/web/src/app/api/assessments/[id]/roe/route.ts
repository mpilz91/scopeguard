import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOperator } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const roeSchema = z.object({
  content: z.string().min(10, "Contenuto ROE troppo breve"),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOperator()
    const orgId = session.user.organizationId!

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: { roe: true },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    if (assessment.roe?.status === "APPROVED") {
      return NextResponse.json({ error: "ROE già approvata, non modificabile" }, { status: 400 })
    }

    const body = await req.json()
    const result = roeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const roe = await prisma.rulesOfEngagement.upsert({
      where: { assessmentId: params.id },
      create: {
        assessmentId: params.id,
        content: result.data.content,
        status: "DRAFT",
      },
      update: {
        content: result.data.content,
        status: "DRAFT",
      },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "ROE_CREATED",
      resource: "roe",
      resourceId: roe.id,
    })

    return NextResponse.json(roe)
  } catch (err) {
    console.error("[ROE POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
