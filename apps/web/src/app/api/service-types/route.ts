import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"

export async function GET() {
  try {
    const session = await requireOrg()
    const orgId = session.user.organizationId!
    const orgType = session.user.orgType

    let serviceTypes

    if (orgType === "PLATFORM") {
      // Platform admin: vede tutti i tipi di servizio attivi
      serviceTypes = await prisma.serviceType.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          scanTypeDefs: {
            where: { isActive: true },
            select: { id: true, name: true, description: true, engine: true, defaultConfig: true },
          },
        },
      })
    } else {
      // Reseller / Client: solo i tipi coperti da un contratto attivo
      const contracts = await prisma.serviceContract.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          serviceType: {
            include: {
              scanTypeDefs: {
                where: { isActive: true },
                select: { id: true, name: true, description: true, engine: true, defaultConfig: true },
              },
            },
          },
        },
      })
      serviceTypes = contracts.map((c) => c.serviceType)
    }

    return NextResponse.json(serviceTypes)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}
