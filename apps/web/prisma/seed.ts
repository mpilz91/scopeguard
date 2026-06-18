import { PrismaClient, MembershipRole, AssetType, AssessmentType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const passwordHash = await bcrypt.hash("Admin1234!", 12)

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin ScopeGuard",
      passwordHash,
    },
  })

  const org = await prisma.organization.upsert({
    where: { slug: "demo-security" },
    update: {},
    create: {
      name: "Demo Security S.r.l.",
      slug: "demo-security",
    },
  })

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: MembershipRole.OWNER,
    },
  })

  const customer = await prisma.customer.create({
    data: {
      name: "Acme Corp S.p.A.",
      organizationId: org.id,
      contactEmail: "ciso@acme.corp",
      contactName: "Mario Rossi",
    },
  })

  await prisma.asset.createMany({
    data: [
      {
        name: "Web Server Principale",
        type: AssetType.IP,
        value: "203.0.113.10",
        customerId: customer.id,
        organizationId: org.id,
      },
      {
        name: "Portale Cliente",
        type: AssetType.DOMAIN,
        value: "portal.acme.corp",
        customerId: customer.id,
        organizationId: org.id,
      },
      {
        name: "Rete Interna",
        type: AssetType.CIDR,
        value: "192.168.1.0/24",
        customerId: customer.id,
        organizationId: org.id,
      },
    ],
    skipDuplicates: true,
  })

  console.log(`Seed completato.`)
  console.log(`  Org: ${org.name} (${org.slug})`)
  console.log(`  User: ${user.email} / Admin1234!`)
  console.log(`  Customer: ${customer.name}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
