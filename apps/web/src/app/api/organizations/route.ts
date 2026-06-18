import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireOrg()
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId! },
      include: {
        _count: {
          select: { customers: true, assets: true, assessments: true, memberships: true },
        },
      },
    })
    return NextResponse.json(org)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}
