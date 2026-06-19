import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  orgType: z.enum(["RESELLER", "CLIENT"]).optional(),
  parentId: z.string().cuid().nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal("")),
  vatNumber: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin()
    const org = await prisma.organization.findFirst({
      where: { id: params.id, orgType: { in: ["RESELLER", "CLIENT"] } },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: { select: { id: true, name: true, slug: true, orgType: true } },
        contracts: { include: { serviceType: true } },
        _count: { select: { memberships: true, customers: true, assessments: true } },
      },
    })
    if (!org) return NextResponse.json({ error: "Non trovata" }, { status: 404 })
    return NextResponse.json(org)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformAdmin()
    const existing = await prisma.organization.findFirst({
      where: { id: params.id, orgType: { in: ["RESELLER", "CLIENT"] } },
    })
    if (!existing) return NextResponse.json({ error: "Non trovata" }, { status: 404 })

    const body = await req.json()
    const result = updateOrgSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const { website, ...rest } = result.data
    const org = await prisma.organization.update({
      where: { id: params.id },
      data: { ...rest, website: website || null },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ORGANIZATION_UPDATED",
      resource: "organization",
      resourceId: org.id,
    })

    return NextResponse.json(org)
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformAdmin()
    const existing = await prisma.organization.findFirst({
      where: { id: params.id, orgType: { in: ["RESELLER", "CLIENT"] } },
    })
    if (!existing) return NextResponse.json({ error: "Non trovata" }, { status: 404 })

    await prisma.organization.delete({ where: { id: params.id } })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ORGANIZATION_DELETED",
      resource: "organization",
      resourceId: params.id,
      metadata: { name: existing.name },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
