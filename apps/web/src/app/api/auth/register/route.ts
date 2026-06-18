import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { registerSchema } from "@/lib/validations"
import { slugify } from "@/lib/utils"
import { audit } from "@/lib/audit"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message ?? "Dati non validi" },
        { status: 400 }
      )
    }

    const { email, password, name, organizationName } = result.data

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 409 })
    }

    const slug = await generateUniqueSlug(organizationName)
    const passwordHash = await bcrypt.hash(password, 12)

    const { user, org } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: email.toLowerCase(), name, passwordHash },
      })
      const org = await tx.organization.create({
        data: { name: organizationName, slug },
      })
      await tx.membership.create({
        data: { userId: user.id, organizationId: org.id, role: "OWNER" },
      })
      return { user, org }
    })

    await audit({
      organizationId: org.id,
      userId: user.id,
      action: "USER_REGISTER",
      resource: "user",
      resourceId: user.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error("[REGISTER]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = base
  let i = 1
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}
