import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    const hosts = await prisma.discoveredHost.findMany({
      where: { assessmentId: params.id, organizationId: orgId },
      include: { scanJob: { select: { id: true, type: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(hosts)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}
