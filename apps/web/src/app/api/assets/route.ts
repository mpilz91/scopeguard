import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { assetSchema } from "@/lib/validations"
import { audit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrg()
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get("customerId")

    const assets = await prisma.asset.findMany({
      where: {
        organizationId: session.user.organizationId!,
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { name: "asc" },
      include: { customer: { select: { id: true, name: true } } },
    })
    return NextResponse.json(assets)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrg()
    const body = await req.json()
    const result = assetSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    // Verifica che il customer appartenga al tenant
    const customer = await prisma.customer.findFirst({
      where: { id: result.data.customerId, organizationId: session.user.organizationId! },
    })
    if (!customer) {
      return NextResponse.json({ error: "Cliente non trovato o non autorizzato" }, { status: 404 })
    }

    const asset = await prisma.asset.create({
      data: {
        ...result.data,
        organizationId: session.user.organizationId!,
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "ASSET_CREATED",
      resource: "asset",
      resourceId: asset.id,
      metadata: { name: asset.name, type: asset.type, value: asset.value },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    console.error("[ASSETS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
