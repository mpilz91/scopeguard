import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const contractSchema = z.object({
  organizationId: z.string().cuid("ID organizzazione non valido"),
  serviceTypeId: z.string().cuid("ID servizio non valido"),
  maxAssessments: z.number().int().positive().nullable().optional(),
  maxAssets: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin()
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get("organizationId")

    const contracts = await prisma.serviceContract.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        organization: { select: { id: true, name: true, slug: true, orgType: true } },
        serviceType: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(contracts)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin()
    const body = await req.json()
    const result = contractSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const org = await prisma.organization.findFirst({
      where: { id: result.data.organizationId, orgType: { in: ["RESELLER", "CLIENT"] } },
    })
    if (!org) return NextResponse.json({ error: "Organizzazione non trovata" }, { status: 404 })

    const st = await prisma.serviceType.findUnique({ where: { id: result.data.serviceTypeId } })
    if (!st) return NextResponse.json({ error: "Tipo di servizio non trovato" }, { status: 404 })

    const existing = await prisma.serviceContract.findUnique({
      where: { organizationId_serviceTypeId: { organizationId: result.data.organizationId, serviceTypeId: result.data.serviceTypeId } },
    })
    if (existing) {
      return NextResponse.json({ error: "Contratto già esistente per questa combinazione org/servizio" }, { status: 409 })
    }

    const contract = await prisma.serviceContract.create({
      data: {
        ...result.data,
        expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        serviceType: { select: { id: true, name: true, slug: true } },
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "CONTRACT_CREATED",
      resource: "service_contract",
      resourceId: contract.id,
      metadata: { orgName: org.name, serviceName: st.name },
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    }
    console.error("[CONTRACTS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
