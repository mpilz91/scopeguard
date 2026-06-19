import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/auth"
import { z } from "zod"
import { audit } from "@/lib/audit"

const VALID_JOB_TYPES = ["NMAP_DISCOVERY", "NMAP_FULL", "NMAP_VULN", "NUCLEI_CVE", "NUCLEI_WEBAPP", "MANUAL"]

const createSchema = z.object({
  name: z.string().min(2, "Nome richiesto"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug: solo lettere minuscole, numeri e trattini"),
  description: z.string().optional().nullable(),
  scanJobType: z.enum(VALID_JOB_TYPES as [string, ...string[]]),
  defaultConfig: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    await requirePlatformAdmin()
    const defs = await prisma.scanTypeDef.findMany({
      orderBy: [{ scanJobType: "asc" }, { name: "asc" }],
      include: { _count: { select: { serviceTypes: true } } },
    })
    return NextResponse.json(defs)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin()
    const body = await req.json()
    const result = createSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const existing = await prisma.scanTypeDef.findUnique({ where: { slug: result.data.slug } })
    if (existing) return NextResponse.json({ error: "Slug già in uso" }, { status: 409 })

    const def = await prisma.scanTypeDef.create({
      data: {
        ...result.data,
        defaultConfig: result.data.defaultConfig as any,
      },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "SCAN_TYPE_DEF_CREATED",
      resource: "scan_type_def",
      resourceId: def.id,
      metadata: { name: def.name, scanJobType: def.scanJobType },
    })

    return NextResponse.json(def, { status: 201 })
  } catch (err: any) {
    if (err.message === "PLATFORM_ADMIN_REQUIRED") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 })
    console.error("[SCAN TYPE DEFS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
