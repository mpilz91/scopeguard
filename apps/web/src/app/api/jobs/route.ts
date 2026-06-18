import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)

    const jobs = await prisma.scanJob.findMany({
      where: {
        organizationId: orgId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        assessment: { select: { id: true, title: true, status: true } },
        agentToken: { select: { id: true, name: true } },
        _count: { select: { findings: true } },
      },
    })
    return NextResponse.json(jobs)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}
