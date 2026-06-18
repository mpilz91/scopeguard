import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { customerSchema } from "@/lib/validations"
import { audit } from "@/lib/audit"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const customer = await prisma.customer.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
      include: {
        assets: { orderBy: { createdAt: "desc" } },
        assessments: { orderBy: { createdAt: "desc" } },
      },
    })
    if (!customer) return NextResponse.json({ error: "Non trovato" }, { status: 404 })
    return NextResponse.json(customer)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const existing = await prisma.customer.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
    })
    if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    const body = await req.json()
    const result = customerSchema.partial().safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: result.data,
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "CUSTOMER_UPDATED",
      resource: "customer",
      resourceId: customer.id,
    })

    return NextResponse.json(customer)
  } catch (err) {
    console.error("[CUSTOMERS PATCH]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrg()
    const existing = await prisma.customer.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId! },
    })
    if (!existing) return NextResponse.json({ error: "Non trovato" }, { status: 404 })

    await prisma.customer.delete({ where: { id: params.id } })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "CUSTOMER_DELETED",
      resource: "customer",
      resourceId: params.id,
      metadata: { name: existing.name },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[CUSTOMERS DELETE]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
