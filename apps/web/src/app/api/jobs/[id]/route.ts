import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg, requireOperator } from "@/lib/auth"
import { audit } from "@/lib/audit"

const CANCELLABLE = ["PENDING", "QUEUED", "RUNNING"]

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const job = await prisma.scanJob.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
      include: {
        assessment: { select: { id: true, title: true } },
        agentToken: { select: { name: true } },
        _count: { select: { findings: true } },
      },
    })
    if (!job) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    return NextResponse.json(job)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOperator()
    const orgId = session.user.organizationId!

    const job = await prisma.scanJob.findFirst({
      where: { id: params.id, organizationId: orgId },
    })
    if (!job) return NextResponse.json({ error: "Job non trovato" }, { status: 404 })

    if (!CANCELLABLE.includes(job.status)) {
      return NextResponse.json(
        { error: `Un job in stato "${job.status}" non può essere annullato` },
        { status: 400 }
      )
    }

    const updated = await prisma.scanJob.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "SCAN_JOB_CANCELLED",
      resource: "scan_job",
      resourceId: job.id,
      metadata: { previousStatus: job.status, type: job.type },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error("[JOB CANCEL]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
