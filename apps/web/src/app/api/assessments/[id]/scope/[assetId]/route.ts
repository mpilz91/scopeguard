import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOperator } from "@/lib/auth"
import { audit } from "@/lib/audit"

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; assetId: string } }
) {
  try {
    const session = await requireOperator()
    const orgId = session.user.organizationId!

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    if (["COMPLETED", "CANCELLED"].includes(assessment.status)) {
      return NextResponse.json({ error: "Assessment non modificabile" }, { status: 400 })
    }

    const scopeItem = await prisma.scopeItem.findUnique({
      where: { assessmentId_assetId: { assessmentId: params.id, assetId: params.assetId } },
    })
    if (!scopeItem) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    await prisma.scopeItem.delete({
      where: { assessmentId_assetId: { assessmentId: params.id, assetId: params.assetId } },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "ASSESSMENT_UPDATED",
      resource: "scope_item",
      resourceId: scopeItem.id,
      metadata: { action: "remove", assetId: params.assetId },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[SCOPE DELETE]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
