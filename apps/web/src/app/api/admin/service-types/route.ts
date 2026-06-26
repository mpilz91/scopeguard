import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const serviceTypeSchema = z.object({
  name: z.string().min(2, "Nome richiesto"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug: solo lettere minuscole, numeri e trattini"),
  description: z.string().optional().nullable(),
  scanTypeDefIds: z.array(z.string()).min(1, "Seleziona almeno uno scan type"),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    await requirePlatformAdmin()
    const types = await prisma.serviceType.findMany({
      orderBy: { name: "asc" },
      include: {
        scanTypeDefs: { select: { id: true, name: true, slug: true, engine: true } },
        _count: { select: { contracts: true, assessments: true } },
      },
    })
    return NextResponse.json(types)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin()
    const body = await req.json()
    const result = serviceTypeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const existing = await prisma.serviceType.findUnique({ where: { slug: result.data.slug } })
    if (existing) {
      return NextResponse.json({ error: "Slug già in uso" }, { status: 409 })
    }

    const { scanTypeDefIds, ...rest } = result.data
    const st = await prisma.serviceType.create({
      data: {
        ...rest,
        scanTypeDefs: { connect: scanTypeDefIds.map((id) => ({ id })) },
      },
      include: { scanTypeDefs: { select: { id: true, name: true, slug: true, engine: true } } },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "SERVICE_TYPE_CREATED",
      resource: "service_type",
      resourceId: st.id,
      metadata: { name: st.name },
    })

    return NextResponse.json(st, { status: 201 })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    console.error("[SERVICE TYPES POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
