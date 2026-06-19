import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const createClientSchema = z.object({
  name: z.string().min(2, "Nome richiesto"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug: solo lettere minuscole, numeri e trattini"),
  website: z.string().url().optional().nullable().or(z.literal("")),
  vatNumber: z.string().optional().nullable(),
})

export async function GET() {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (org?.orgType !== "RESELLER") {
      return NextResponse.json({ error: "Solo i reseller possono gestire i client" }, { status: 403 })
    }

    const clients = await prisma.organization.findMany({
      where: { parentId: orgId, orgType: "CLIENT" },
      include: { _count: { select: { memberships: true, customers: true, assessments: true } } },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(clients)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!

    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (org?.orgType !== "RESELLER") {
      return NextResponse.json({ error: "Solo i reseller possono creare client" }, { status: 403 })
    }

    if (!["OWNER", "ADMIN"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Permessi insufficienti" }, { status: 403 })
    }

    const body = await req.json()
    const result = createClientSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const existing = await prisma.organization.findUnique({ where: { slug: result.data.slug } })
    if (existing) {
      return NextResponse.json({ error: "Slug già in uso" }, { status: 409 })
    }

    const { website, ...rest } = result.data
    const client = await prisma.organization.create({
      data: {
        ...rest,
        orgType: "CLIENT",
        parentId: orgId,
        website: website || null,
      },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "CLIENT_CREATED",
      resource: "organization",
      resourceId: client.id,
      metadata: { name: client.name, parentId: orgId },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (err) {
    console.error("[RESELLER CLIENTS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
