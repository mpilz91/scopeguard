import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOperator } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const addScopeSchema = z.object({
  assetId: z.string().cuid(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOperator()
    const orgId = session.user.organizationId!

    // Verifica assessment appartenga al tenant
    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    if (["COMPLETED", "CANCELLED"].includes(assessment.status)) {
      return NextResponse.json({ error: "Assessment non modificabile in questo stato" }, { status: 400 })
    }

    const body = await req.json()
    const result = addScopeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    // Verifica asset appartenga al tenant E al customer dell'assessment
    const asset = await prisma.asset.findFirst({
      where: {
        id: result.data.assetId,
        organizationId: orgId,
        customerId: assessment.customerId,
      },
    })
    if (!asset) {
      return NextResponse.json({ error: "Asset non trovato o non appartiene al cliente" }, { status: 404 })
    }

    const scopeItem = await prisma.scopeItem.create({
      data: { assessmentId: params.id, assetId: result.data.assetId },
      include: { asset: true },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "ASSESSMENT_UPDATED",
      resource: "scope_item",
      resourceId: scopeItem.id,
      metadata: { action: "add", assetId: asset.id, assetValue: asset.value },
    })

    return NextResponse.json(scopeItem, { status: 201 })
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Asset già presente nello scope" }, { status: 409 })
    }
    console.error("[SCOPE POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
