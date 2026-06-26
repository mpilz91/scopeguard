import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg, requireOperator } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const createJobSchema = z.object({
  scanTypeDefId: z.string().cuid("scanTypeDefId non valido"),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const jobs = await prisma.scanJob.findMany({
      where: { assessmentId: params.id, organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(jobs)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOperator()
    const orgId = session.user.organizationId!

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
      include: {
        roe: { select: { status: true } },
        scopeItems: true,
      },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    // Security gate
    if (!["APPROVED", "IN_PROGRESS"].includes(assessment.status)) {
      return NextResponse.json(
        { error: "L'assessment deve essere approvato prima di avviare scansioni" },
        { status: 400 }
      )
    }
    if (assessment.roe?.status !== "APPROVED") {
      return NextResponse.json({ error: "La ROE deve essere approvata prima di avviare scansioni" }, { status: 400 })
    }
    if (assessment.scopeItems.length === 0) {
      return NextResponse.json({ error: "Scope vuoto: aggiungi almeno un asset" }, { status: 400 })
    }

    const body = await req.json()
    const result = createJobSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    // Assign to first active agent token for this org
    const scanTypeDef = await prisma.scanTypeDef.findFirst({
      where: { id: result.data.scanTypeDefId, isActive: true },
    })
    if (!scanTypeDef) {
      return NextResponse.json({ error: "Tipo di scansione non trovato o non attivo" }, { status: 404 })
    }

    const agentToken = await prisma.agentToken.findFirst({
      where: { organizationId: orgId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    })

    const job = await prisma.scanJob.create({
      data: {
        assessmentId: params.id,
        organizationId: orgId,
        type: scanTypeDef.engine as any,
        config: scanTypeDef.defaultConfig as any,
        status: "PENDING",
        agentTokenId: agentToken?.id ?? null,
      },
    })

    // Auto-transition assessment to IN_PROGRESS
    if (assessment.status === "APPROVED") {
      await prisma.assessment.update({
        where: { id: params.id },
        data: { status: "IN_PROGRESS" },
      })
    }

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "SCAN_JOB_CREATED",
      resource: "scan_job",
      resourceId: job.id,
      metadata: { engine: scanTypeDef.engine, scanTypeDefId: scanTypeDef.id, agentTokenId: agentToken?.id ?? null },
    })

    return NextResponse.json(
      { ...job, hasAgent: !!agentToken },
      { status: 201 }
    )
  } catch (err) {
    console.error("[JOBS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
