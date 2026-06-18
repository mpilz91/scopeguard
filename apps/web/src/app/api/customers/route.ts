import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { customerSchema } from "@/lib/validations"
import { audit } from "@/lib/audit"

export async function GET(req: NextRequest) {
  try {
    const session = await requireOrg()
    const customers = await prisma.customer.findMany({
      where: { organizationId: session.user.organizationId! },
      orderBy: { name: "asc" },
      select: { id: true, name: true, contactEmail: true, contactName: true },
    })
    return NextResponse.json(customers)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrg()
    const body = await req.json()
    const result = customerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        ...result.data,
        contactEmail: result.data.contactEmail || null,
        organizationId: session.user.organizationId!,
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "CUSTOMER_CREATED",
      resource: "customer",
      resourceId: customer.id,
      metadata: { name: customer.name },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (err) {
    console.error("[CUSTOMERS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
