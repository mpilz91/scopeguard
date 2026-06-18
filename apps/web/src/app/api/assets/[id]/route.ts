import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { assetSchema } from "@/lib/validations"
import { audit } from "@/lib/audit"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const asset = await prisma.asset.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
      include: { customer: true },
    })
    if (!asset) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    return NextResponse.json(asset)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const existing = await prisma.asset.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
    })
    if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    const body = await req.json()
    const result = assetSchema.partial().safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: result.data,
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ASSET_UPDATED",
      resource: "asset",
      resourceId: asset.id,
    })

    return NextResponse.json(asset)
  } catch (err) {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const existing = await prisma.asset.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
    })
    if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    await prisma.asset.delete({ where: { id: params.id } })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ASSET_DELETED",
      resource: "asset",
      resourceId: params.id,
      metadata: { name: existing.name, value: existing.value },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
