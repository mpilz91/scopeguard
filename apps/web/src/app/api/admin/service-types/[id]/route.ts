import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  scanTypeDefIds: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePlatformAdmin()
    const st = await prisma.serviceType.findUnique({
      where: { id: params.id },
      include: {
        scanTypeDefs: { select: { id: true, name: true, slug: true, engine: true } },
        contracts: { include: { organization: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { assessments: true } },
      },
    })
    if (!st) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    return NextResponse.json(st)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformAdmin()
    const st = await prisma.serviceType.findUnique({ where: { id: params.id } })
    if (!st) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    const body = await req.json()
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const { scanTypeDefIds, ...rest } = result.data
    const updateData: any = { ...rest }
    if (scanTypeDefIds !== undefined) {
      updateData.scanTypeDefs = { set: scanTypeDefIds.map((id) => ({ id })) }
    }

    const updated = await prisma.serviceType.update({
      where: { id: params.id },
      data: updateData,
      include: { scanTypeDefs: { select: { id: true, name: true, slug: true, engine: true } } },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "SERVICE_TYPE_UPDATED",
      resource: "service_type",
      resourceId: params.id,
    })

    return NextResponse.json(updated)
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
    const st = await prisma.serviceType.findUnique({
      where: { id: params.id },
      include: { _count: { select: { assessments: true, contracts: true } } },
    })
    if (!st) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    if ((st as any)._count.assessments > 0 || (st as any)._count.contracts > 0) {
      return NextResponse.json(
        { error: `Impossibile eliminare: usato in ${(st as any)._count.assessments} assessment e ${(st as any)._count.contracts} contratti` },
        { status: 409 }
      )
    }

    await prisma.serviceType.delete({ where: { id: params.id } })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "SERVICE_TYPE_DELETED",
      resource: "service_type",
      resourceId: params.id,
      metadata: { name: st.name },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
