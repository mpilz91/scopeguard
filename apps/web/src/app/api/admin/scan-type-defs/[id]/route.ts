import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const VALID_ENGINES = ["NMAP", "NUCLEI", "MANUAL"] as const

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  engine: z.enum(VALID_ENGINES).optional(),
  defaultConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin()
    const def = await prisma.scanTypeDef.findUnique({
      where: { id: params.id },
      include: {
        serviceTypes: { select: { id: true, name: true, slug: true } },
        _count: { select: { serviceTypes: true } },
      },
    })
    if (!def) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    return NextResponse.json(def)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformAdmin()
    const def = await prisma.scanTypeDef.findUnique({ where: { id: params.id } })
    if (!def) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    const body = await req.json()
    const result = updateSchema.safeParse(body)
    if (!result.success) return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })

    const { defaultConfig, ...rest } = result.data
    const updated = await prisma.scanTypeDef.update({
      where: { id: params.id },
      data: { ...rest, ...(defaultConfig !== undefined ? { defaultConfig: defaultConfig as any } : {}) },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "SCAN_TYPE_DEF_UPDATED",
      resource: "scan_type_def",
      resourceId: params.id,
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformAdmin()
    const def = await prisma.scanTypeDef.findUnique({
      where: { id: params.id },
      include: { _count: { select: { serviceTypes: true } } },
    })
    if (!def) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    if ((def as any)._count.serviceTypes > 0) {
      return NextResponse.json(
        { error: `Impossibile eliminare: usato in ${(def as any)._count.serviceTypes} tipo/i di servizio` },
        { status: 409 }
      )
    }

    await prisma.scanTypeDef.delete({ where: { id: params.id } })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "SCAN_TYPE_DEF_DELETED",
      resource: "scan_type_def",
      resourceId: params.id,
      metadata: { name: def.name },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
