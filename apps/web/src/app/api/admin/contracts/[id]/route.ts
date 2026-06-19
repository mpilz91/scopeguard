import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const updateSchema = z.object({
  maxAssessments: z.number().int().positive().nullable().optional(),
  maxAssets: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requirePlatformAdmin()
    const contract = await prisma.serviceContract.findUnique({ where: { id: params.id } })
    if (!contract) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    const body = await req.json()
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const { expiresAt, ...rest } = result.data
    const updated = await prisma.serviceContract.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      },
      include: {
        organization: { select: { id: true, name: true } },
        serviceType: { select: { id: true, name: true } },
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "CONTRACT_UPDATED",
      resource: "service_contract",
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
    const contract = await prisma.serviceContract.findUnique({ where: { id: params.id } })
    if (!contract) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    await prisma.serviceContract.delete({ where: { id: params.id } })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "CONTRACT_DELETED",
      resource: "service_contract",
      resourceId: params.id,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
