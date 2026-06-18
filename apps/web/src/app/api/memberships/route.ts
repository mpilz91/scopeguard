import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { requireOrg } from "@/lib/auth"
import { membershipInviteSchema } from "@/lib/validations"
import { audit } from "@/lib/audit"
import { nanoid } from "nanoid"

export async function GET() {
  try {
    const session = await requireOrg()
    const memberships = await prisma.membership.findMany({
      where: { organizationId: session.user.organizationId! },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(memberships)
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireOrg()

    // Solo OWNER e ADMIN possono invitare
    if (!["OWNER", "ADMIN"].includes(session.user.role ?? "")) {
      return NextResponse.json({ error: "Permesso negato" }, { status: 403 })
    }

    const body = await req.json()
    const result = membershipInviteSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0]?.message }, { status: 400 })
    }

    const { email, role } = result.data

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Crea utente con password temporanea (dovrà essere resettata)
      const tempPassword = nanoid(16)
      const passwordHash = await bcrypt.hash(tempPassword, 12)
      user = await prisma.user.create({
        data: { email, passwordHash },
      })
    }

    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: session.user.organizationId! } },
    })
    if (existing) {
      return NextResponse.json({ error: "Utente già membro" }, { status: 409 })
    }

    const membership = await prisma.membership.create({
      data: { userId: user.id, organizationId: session.user.organizationId!, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    await audit({
      organizationId: session.user.organizationId!,
      userId: session.user.id,
      action: "MEMBER_INVITED",
      resource: "membership",
      resourceId: membership.id,
      metadata: { email, role },
    })

    return NextResponse.json(membership, { status: 201 })
  } catch (err) {
    console.error("[MEMBERSHIPS POST]", err)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
