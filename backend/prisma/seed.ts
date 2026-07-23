import { PrismaClient, RoleType, SubscriptionStatus, AuditStatus, TaskStatus, TriggerType, ActionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Roles
  const rolesData = [
    { name: RoleType.OWNER, description: 'Super Administrator and Agency Owner' },
    { name: RoleType.ADMIN, description: 'Agency Administrator' },
    { name: RoleType.MANAGER, description: 'Campaign and SEO Manager' },
    { name: RoleType.ANALYST, description: 'SEO Executive Analyst' },
    { name: RoleType.VIEWER, description: 'Read-only Client User' }
  ];

  const dbRoles: Record<string, any> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description }
    });
    dbRoles[r.name] = role;
    console.log(`Role ${r.name} created/verified`);
  }

  // 2. Create Permissions
  const permissionsData = [
    { action: 'website:read', description: 'Read tracked domains' },
    { action: 'website:create', description: 'Add new tracked domains' },
    { action: 'website:delete', description: 'Remove tracked domains' },
    { action: 'project:read', description: 'Read project details' },
    { action: 'project:create', description: 'Create projects' },
    { action: 'project:delete', description: 'Delete projects' },
    { action: 'audit:read', description: 'Read technical audit status and logs' },
    { action: 'audit:create', description: 'Run Playwright crawler audits' },
    { action: 'keyword:read', description: 'View keyword ranks and clusters' },
    { action: 'keyword:create', description: 'Add and cluster keywords' },
    { action: 'competitor:read', description: 'View competitor gaps' },
    { action: 'competitor:create', description: 'Add competitor domains' },
    { action: 'geo:read', description: 'Read SGE & GEO scoring metrics' },
    { action: 'llm:read', description: 'Read LLM citations Share of Voice' },
    { action: 'content:read', description: 'Read optimized content briefs' },
    { action: 'content:create', description: 'Write or generate AI articles' },
    { action: 'reporting:read', description: 'View reports logs' },
    { action: 'reporting:create', description: 'Compile custom PDF deliverables' },
    { action: 'billing:read', description: 'Read billing portal data' },
    { action: 'billing:write', description: 'Modify SaaS pricing tiers' },
    { action: 'org:read', description: 'Read organization details' },
    { action: 'org:write', description: 'Update organization details' }
  ];

  const dbPermissions: Record<string, any> = {};
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: { action: p.action, description: p.description }
    });
    dbPermissions[p.action] = perm;
  }
  console.log('Permissions catalog populated');

  // 3. Map Permissions to Roles (RBAC)
  // OWNER gets all permissions
  for (const p of permissionsData) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: dbRoles[RoleType.OWNER].id,
          permissionId: dbPermissions[p.action].id
        }
      },
      update: {},
      create: {
        roleId: dbRoles[RoleType.OWNER].id,
        permissionId: dbPermissions[p.action].id
      }
    });
  }
  console.log('Owner permissions assigned');

  // 4. Create Tenant Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme SEO Agency'
    }
  });
  console.log(`Organization tenant created: ${org.name}`);

  // 5. Create Default User (OWNER role)
  const salt = await bcrypt.genSalt();
  const passwordHash = await bcrypt.hash('password123', salt);
  
  const user = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'agency@seoaios.com',
      passwordHash,
      firstName: 'Anshul',
      lastName: 'Dev',
      roleId: dbRoles[RoleType.OWNER].id
    }
  });
  console.log(`Default owner user created: ${user.email}`);

  // 6. Create SaaS Subscription
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      status: SubscriptionStatus.ACTIVE,
      stripePriceId: 'price_agency_pro_monthly',
      stripeSubscriptionId: 'sub_mock_123xyz',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  // 7. Create Mock Invoices
  await prisma.invoice.create({
    data: {
      organizationId: org.id,
      stripeInvoiceId: 'in_mock_001',
      amountDue: 14900,
      amountPaid: 14900,
      paidAt: new Date(),
      pdfUrl: 'https://seoaios.com/receipts/inv-mock-001.pdf'
    }
  });

  // 8. Create Campaign Project
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: 'Global Retail Campaign',
      description: 'E-commerce SEO and generative engine visibility campaign.'
    }
  });
  console.log(`Project campaign created: ${project.name}`);

  // 9. Link User to Project
  await prisma.userProject.create({
    data: {
      userId: user.id,
      projectId: project.id
    }
  });

  // 10. Tracked Websites
  const website1 = await prisma.website.create({
    data: {
      projectId: project.id,
      domain: 'acmestore.com'
    }
  });
  const website2 = await prisma.website.create({
    data: {
      projectId: project.id,
      domain: 'outdoorgearguide.com'
    }
  });
  console.log(`Monitored domains added: ${website1.domain}, ${website2.domain}`);

  // 11. Create Keywords & Metric Traces
  const keywordData = [
    { text: 'organic winter boots', volume: 1200, difficulty: 45 },
    { text: 'best hiking boots for winter', volume: 850, difficulty: 60 },
    { text: 'lightweight running sneakers', volume: 3200, difficulty: 30 }
  ];

  for (const kw of keywordData) {
    const k = await prisma.keyword.create({
      data: {
        websiteId: website1.id,
        text: kw.text,
        volume: kw.volume,
        difficulty: kw.difficulty
      }
    });

    // Populate LLM citation and visibility traces for each keyword
    await prisma.geoScore.create({
      data: {
        keywordId: k.id,
        engine: 'Google AI Overview',
        overallScore: Math.floor(Math.random() * 20) + 75,
        semanticDensity: 85,
        citationStrength: 60,
        factualPrecision: 95,
        informationGain: 80
      }
    });

    await prisma.llmVisibilityScore.create({
      data: {
        keywordId: k.id,
        engine: 'Perplexity',
        visibilityPercent: Math.floor(Math.random() * 25) + 35
      }
    });

    await prisma.aiMention.create({
      data: {
        keywordId: k.id,
        engine: 'ChatGPT Search',
        mentioned: true,
        snippet: `Recommendations on acmestore.com highlight custom fits and technical specifications for ${kw.text}.`
      }
    });
  }

  // 12. Create Backlinks
  await prisma.backlink.createMany({
    data: [
      {
        websiteId: website1.id,
        sourceUrl: 'https://techcrunch.com/2026/02/10/next-gen-startups-geo-seo-systems',
        targetUrl: 'https://acmestore.com',
        anchorText: 'acmestore.com optimization engines',
        domainAuthority: 91,
        isNofollow: false
      },
      {
        websiteId: website1.id,
        sourceUrl: 'https://medium.com/@seotips/how-to-climb-google-ai-overview-ranks',
        targetUrl: 'https://acmestore.com/blog/seo-tools-startup',
        anchorText: 'SGE citation strategy',
        domainAuthority: 88,
        isNofollow: false
      }
    ]
  });

  // 13. Create SEO Audits
  const audit = await prisma.seoAudit.create({
    data: {
      websiteId: website1.id,
      status: AuditStatus.COMPLETED,
      score: 92,
      pagesCrawled: 382
    }
  });

  await prisma.seoAuditPage.create({
    data: {
      auditId: audit.id,
      url: 'https://acmestore.com/',
      statusCode: 200,
      title: 'Acme Store | Home of Luxury Leather Shoes',
      metaDescription: 'Shop luxury leather boots, dress shoes, and lightweight sneakers.',
      h1: 'Welcome to Acme Store',
      wordCount: 1420,
      issues: []
    }
  });

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
