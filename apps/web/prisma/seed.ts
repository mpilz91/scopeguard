import { PrismaClient, MembershipRole, AssetType, OrgType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  const passwordHash = await bcrypt.hash("Admin1234!", 12)

  // ── PLATFORM org ────────────────────────────────────────────────────────────
  const platformOrg = await prisma.organization.upsert({
    where: { slug: "platform" },
    update: {},
    create: {
      name: "ScopeGuard Platform",
      slug: "platform",
      orgType: OrgType.PLATFORM,
    },
  })

  // ── Platform admin user ──────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin ScopeGuard",
      passwordHash,
    },
  })

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: platformOrg.id } },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: platformOrg.id,
      role: MembershipRole.OWNER,
    },
  })

  // ── RESELLER org (demo) ──────────────────────────────────────────────────────
  const resellerOrg = await prisma.organization.upsert({
    where: { slug: "demo-security" },
    update: { orgType: OrgType.RESELLER, parentId: platformOrg.id },
    create: {
      name: "Demo Security S.r.l.",
      slug: "demo-security",
      orgType: OrgType.RESELLER,
      parentId: platformOrg.id,
    },
  })

  // Utente reseller separato
  const resellerUser = await prisma.user.upsert({
    where: { email: "reseller@example.com" },
    update: {},
    create: {
      email: "reseller@example.com",
      name: "Demo Security Owner",
      passwordHash,
    },
  })

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: resellerUser.id, organizationId: resellerOrg.id } },
    update: {},
    create: {
      userId: resellerUser.id,
      organizationId: resellerOrg.id,
      role: MembershipRole.OWNER,
    },
  })

  // ── SCAN TYPE DEFS ───────────────────────────────────────────────────────────
  const scanTypeDefsData = [
    {
      name: "Nmap Discovery",
      slug: "nmap-discovery",
      description: "Host discovery (ping scan) — individua quali host sono attivi, nessuna porta scansionata.",
      scanJobType: "NMAP_DISCOVERY",
      defaultConfig: { timing: 3 },
    },
    {
      name: "Nmap Port Scan Completo",
      slug: "nmap-full",
      description: "Port scan con rilevamento servizi e versioni (top 1000 porte).",
      scanJobType: "NMAP_FULL",
      defaultConfig: { timing: 3 },
    },
    {
      name: "Nmap Vulnerability Scripts",
      slug: "nmap-vuln",
      description: "Script NSE per vulnerabilità note (lento, invasivo).",
      scanJobType: "NMAP_VULN",
      defaultConfig: { timing: 2 },
    },
    {
      name: "Nuclei CVE",
      slug: "nuclei-cve",
      description: "Template Nuclei per CVE note — severità critical/high/medium.",
      scanJobType: "NUCLEI_CVE",
      defaultConfig: { severity: "critical,high,medium", rateLimit: 50 },
    },
    {
      name: "Nuclei Web Application",
      slug: "nuclei-webapp",
      description: "Misconfiguration, esposizioni e tecnologie web.",
      scanJobType: "NUCLEI_WEBAPP",
      defaultConfig: { rateLimit: 50 },
    },
    {
      name: "Finding Manuale",
      slug: "manual",
      description: "Finding inseriti manualmente dall'analista durante attività manuali.",
      scanJobType: "MANUAL",
      defaultConfig: {},
    },
  ]

  const scanTypeDefMap: Record<string, any> = {}
  for (const std of scanTypeDefsData) {
    const record = await prisma.scanTypeDef.upsert({
      where: { slug: std.slug },
      update: { name: std.name, description: std.description, defaultConfig: std.defaultConfig },
      create: std,
    })
    scanTypeDefMap[std.slug] = record
  }

  // ── SERVICE TYPES ────────────────────────────────────────────────────────────
  const serviceTypesData = [
    {
      slug: "va-ext",
      name: "Vulnerability Assessment Esterno",
      description: "Scansione di vulnerabilità su asset esposti su internet.",
      scanTypeSlugs: ["nmap-full", "nuclei-cve"],
    },
    {
      slug: "pentest-web",
      name: "Pentest Web Application",
      description: "Test di penetrazione su applicazioni web.",
      scanTypeSlugs: ["nmap-discovery", "nuclei-webapp", "nuclei-cve"],
    },
    {
      slug: "net-discovery",
      name: "Network Discovery",
      description: "Mappatura della rete e identificazione degli asset attivi.",
      scanTypeSlugs: ["nmap-discovery", "nmap-full"],
    },
  ]

  for (const st of serviceTypesData) {
    const { scanTypeSlugs, ...data } = st
    const scanDefs = scanTypeSlugs.map((s) => ({ id: scanTypeDefMap[s].id }))
    await prisma.serviceType.upsert({
      where: { slug: st.slug },
      update: { ...data, scanTypeDefs: { set: scanDefs } },
      create: { ...data, scanTypeDefs: { connect: scanDefs } },
    })
  }

  const vaExt = await prisma.serviceType.findUnique({ where: { slug: "va-ext" } })
  const netDisc = await prisma.serviceType.findUnique({ where: { slug: "net-discovery" } })

  // ── CONTRATTO per la reseller demo ──────────────────────────────────────────
  if (vaExt) {
    await prisma.serviceContract.upsert({
      where: { organizationId_serviceTypeId: { organizationId: resellerOrg.id, serviceTypeId: vaExt.id } },
      update: {},
      create: {
        organizationId: resellerOrg.id,
        serviceTypeId: vaExt.id,
        maxAssessments: 20,
        isActive: true,
      },
    })
  }

  if (netDisc) {
    await prisma.serviceContract.upsert({
      where: { organizationId_serviceTypeId: { organizationId: resellerOrg.id, serviceTypeId: netDisc.id } },
      update: {},
      create: {
        organizationId: resellerOrg.id,
        serviceTypeId: netDisc.id,
        isActive: true,
      },
    })
  }

  // ── CUSTOMER e ASSET sotto la reseller ──────────────────────────────────────
  let customer = await prisma.customer.findFirst({
    where: { organizationId: resellerOrg.id, name: "Acme Corp S.p.A." },
  })
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: "Acme Corp S.p.A.",
        organizationId: resellerOrg.id,
        contactEmail: "ciso@acme.corp",
        contactName: "Mario Rossi",
      },
    })
  }


  await prisma.asset.createMany({
    data: [
      {
        name: "Web Server Principale",
        type: AssetType.IP,
        value: "203.0.113.10",
        customerId: customer.id,
        organizationId: resellerOrg.id,
      },
      {
        name: "Portale Cliente",
        type: AssetType.DOMAIN,
        value: "portal.acme.corp",
        customerId: customer.id,
        organizationId: resellerOrg.id,
      },
      {
        name: "Rete Interna",
        type: AssetType.CIDR,
        value: "192.168.1.0/24",
        customerId: customer.id,
        organizationId: resellerOrg.id,
      },
    ],
    skipDuplicates: true,
  })

  console.log(`\nSeed completato:`)
  console.log(`  Platform: ${platformOrg.name} (${platformOrg.slug})`)
  console.log(`  Reseller: ${resellerOrg.name} (${resellerOrg.slug})`)
  console.log(`  Admin:    ${adminUser.email} / Admin1234!  → PLATFORM (pannello admin)`)
  console.log(`  Reseller: ${resellerUser.email} / Admin1234!  → Demo Security`)
  console.log(`  Scan type defs: ${scanTypeDefsData.map((s) => s.slug).join(", ")}`)
  console.log(`  Service types: ${serviceTypesData.map((s) => s.slug).join(", ")}`)
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
