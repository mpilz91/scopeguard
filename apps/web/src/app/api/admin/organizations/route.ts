import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const createOrgSchema = z.object({
  name: z.string().min(2, "Nome richiesto"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug: solo lettere minuscole, numeri e trattini"),
  orgType: z.enum(["RESELLER", "CLIENT"]),
  parentId: z.string().cuid().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  vatNumber: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")

    const orgs = await prisma.organization.findMany({
      where: type ? { orgType: type as any } : { orgType: { in: ["RESELLER", "CLIENT"] } },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { memberships: true, contracts: true, children: true } },
      },
      orderBy: [{ orgType: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(orgs)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin()
    const body = await req.json()
    const result = createOrgSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const existing = await prisma.organization.findUnique({ where: { slug: result.data.slug } })
    if (existing) {
      return NextResponse.json({ error: "Slug già in uso" }, { status: 409 })
    }

    const { orgType, parentId, website, ...rest } = result.data
    const org = await prisma.organization.create({
      data: {
        ...rest,
        orgType,
        parentId: parentId ?? null,
        website: website || null,
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ORGANIZATION_CREATED",
      resource: "organization",
      resourceId: org.id,
      metadata: { name: org.name, orgType },
    })

    return NextResponse.json(org, { status: 201 })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    console.error("[ADMIN ORGS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
