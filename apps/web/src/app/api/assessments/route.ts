import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg, requireOperator } from "@/lib/auth"
import { assessmentSchema } from "@/lib/validations"
import { audit } from "@/lib/audit"

export async function GET() {
  try {
    const session = await requireOrg()
    const assessments = await prisma.assessment.findMany({
      where: { organizationId: session.user.organizationId! },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        roe: { select: { id: true, status: true } },
        _count: { select: { findings: true, scopeItems: true, scanJobs: true } },
      },
    })
    return NextResponse.json(assessments)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOperator()
    const body = await req.json()
    const result = assessmentSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    // Verifica customer tenant
    const customer = await prisma.customer.findFirst({
      where: { id: result.data.customerId, organizationId: session.user.organizationId! },
    })
    if (!customer) {
      return NextResponse.json({ error: "Cliente non trovato" }, { status: 404 })
    }

    const assessment = await prisma.assessment.create({
      data: {
        title: result.data.title,
        description: result.data.description,
        type: result.data.type as any,
        status: "DRAFT",
        customerId: result.data.customerId,
        organizationId: session.user.organizationId!,
        startDate: result.data.startDate ? new Date(result.data.startDate) : null,
        endDate: result.data.endDate ? new Date(result.data.endDate) : null,
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ASSESSMENT_CREATED",
      resource: "assessment",
      resourceId: assessment.id,
      metadata: { title: assessment.title, type: assessment.type },
    })

    return NextResponse.json(assessment, { status: 201 })
  } catch (err) {
    console.error("[ASSESSMENTS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
