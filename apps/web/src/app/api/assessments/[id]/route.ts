import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { audit } from "@/lib/audit"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
      include: {
        customer: true,
        roe: true,
        scopeItems: { include: { asset: true } },
        scanJobs: { orderBy: { createdAt: "desc" }, take: 20 },
        findings: { orderBy: [{ severity: "asc" }, { createdAt: "desc" }], take: 50 },
        reports: true,
      },
    })
    if (!assessment) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    return NextResponse.json(assessment)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const existing = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
    })
    if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    const body = await req.json()
    const { status, ...rest } = body

    // Transizioni di stato valide
    if (status && status !== existing.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
        PENDING_APPROVAL: ["APPROVED", "DRAFT", "CANCELLED"],
        APPROVED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      }
      if (!validTransitions[existing.status]?.includes(status)) {
        return NextResponse.json(
          { error: `Transizione ${existing.status} → ${status} non valida` },
          { status: 400 }
        )
      }
    }

    const assessment = await prisma.assessment.update({
      where: { id: params.id },
      data: { ...rest, ...(status ? { status } : {}) },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ASSESSMENT_UPDATED",
      resource: "assessment",
      resourceId: assessment.id,
      metadata: { status },
    })

    return NextResponse.json(assessment)
  } catch (err) {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
