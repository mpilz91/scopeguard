import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOperator } from "@/lib/auth"
import { audit } from "@/lib/audit"

export async function POST(
  _: NextRequest,
  { params }: { params: { id: string; hostId: string } }
) {
  try {
    const session = await requireOperator()
    const orgId = session.user.organizationId!

    const assessment = await prisma.assessment.findFirst({
      where: { id: params.id, organizationId: orgId },
    })
    if (!assessment) return NextResponse.json({ error: "Assessment non trovato" }, { status: 404 })

    const host = await prisma.discoveredHost.findFirst({
      where: { id: params.hostId, assessmentId: params.id, organizationId: orgId },
    })
    if (!host) return NextResponse.json({ error: "Host non trovato" }, { status: 404 })

    const existing = await prisma.asset.findFirst({
      where: { value: host.ipAddress, organizationId: orgId, customerId: assessment.customerId },
    })
    if (existing) {
      return NextResponse.json({ error: "Asset già esistente per questo IP", asset: existing }, { status: 409 })
    }

    const asset = await prisma.asset.create({
      data: {
        name: host.hostname ?? host.ipAddress,
        type: "IP",
        value: host.ipAddress,
        organizationId: orgId,
        customerId: assessment.customerId,
        description: `Scoperto da discovery scan del ${new Date(host.createdAt).toLocaleDateString("it-IT")}`,
        metadata: {
          openPorts: host.openPorts,
          osInfo: host.osInfo,
          discoveredHostId: host.id,
        },
      },
    })

    await audit({
      organizationId: orgId,
      userId: session.user.id,
      action: "HOST_PROMOTED_TO_ASSET",
      resource: "asset",
      resourceId: asset.id,
      metadata: { ipAddress: host.ipAddress, discoveredHostId: host.id },
    })

    return NextResponse.json(asset, { status: 201 })
  } catch (err) {
    console.error("[PROMOTE HOST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
