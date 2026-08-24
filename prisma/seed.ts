/**
 * Ops Board — Full Seed
 * Seeds: Users, Open Local project, artifacts, milestones, sprints, tasks, commits, investor updates
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Ops Board with Open Local context...\n");

  // ─── Users ─────────────────────────────────────────────────────────────────
  const julylan = await prisma.user.upsert({
    where: { email: "julylan@openlocal.com" },
    update: { role: "CTO" },
    create: {
      name: "Julylan Johnson",
      email: "julylan@openlocal.com",
      passwordHash: await bcrypt.hash("julylan888", 12),
      role: "CTO",
    },
  });

  const chrissy = await prisma.user.upsert({
    where: { email: "chrissy@openlocal.com" },
    update: { role: "CEO" },
    create: {
      name: "Christian Artiles",
      email: "chrissy@openlocal.com",
      passwordHash: await bcrypt.hash("chrissy888", 12),
      role: "CEO",
    },
  });

  console.log("✅ Users created");

  // ─── Open Local Platform Project ─────────────────────────────────────────────
  const openLocal = await prisma.project.upsert({
    where: { id: "open-local-platform" },
    update: {},
    create: {
      id: "open-local-platform",
      name: "Open Local Platform",
      description:
        "Core marketplace — vendors (farmers/makers), consumers, payments, admin dashboard. Monorepo: api-server, mobile, web, db, lib.",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      repoOwner: "mscartiles-lab",
      repoName: "open-local",
      color: "#22c55e",
    },
  });

  const opsBoardProj = await prisma.project.upsert({
    where: { id: "ops-board" },
    update: {},
    create: {
      id: "ops-board",
      name: "Ops Board",
      description: "Internal CTO command center — tasks, calendar, notes, GitHub, milestones",
      repoUrl: "https://github.com/Verstige/ops-board",
      repoOwner: "Verstige",
      repoName: "ops-board",
      color: "#5c7cfa",
    },
  });

  // Special "Issues" project — selecting this on task creation auto-creates
  // a GitHub issue on mscartiles-lab/open-local via GITHUB_TOKEN.
  const openLocalIssues = await prisma.project.upsert({
    where: { id: "open-local-issues" },
    update: {},
    create: {
      id: "open-local-issues",
      name: "Issues (GitHub)",
      description:
        "Selecting this project when creating a task auto-opens a GitHub issue on mscartiles-lab/open-local. Status syncs back via the Issues tab.",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      repoOwner: "mscartiles-lab",
      repoName: "open-local",
      color: "#f97316",
    },
  });

  console.log("✅ Projects created");

  // ─── Artifacts (monorepo packages) ─────────────────────────────────────────
  const artifacts = await Promise.all([
    prisma.artifact.upsert({
      where: { id: "artifact-api-server" },
      update: {},
      create: {
        id: "artifact-api-server",
        name: "api-server",
        description: "Node.js/Express REST API — vendors, products, orders, users, auth, Stripe payments",
        type: "API",
        repoPath: "artifacts/api-server",
        projectId: openLocal.id,
      },
    }),
    prisma.artifact.upsert({
      where: { id: "artifact-open-local" },
      update: {},
      create: {
        id: "artifact-open-local",
        name: "open-local",
        description: "React + Vite web app — consumer marketplace, vendor dashboard, admin panel",
        type: "WEB",
        repoPath: "artifacts/open-local",
        projectId: openLocal.id,
      },
    }),
    prisma.artifact.upsert({
      where: { id: "artifact-mobile" },
      update: {},
      create: {
        id: "artifact-mobile",
        name: "open-local-mobile",
        description: "React Native iOS/Android app — vendor-facing mobile app for managing inventory and orders",
        type: "MOBILE",
        repoPath: "artifacts/open-local-mobile",
        projectId: openLocal.id,
      },
    }),
    prisma.artifact.upsert({
      where: { id: "artifact-db" },
      update: {},
      create: {
        id: "artifact-db",
        name: "db",
        description: "Drizzle ORM schema — PostgreSQL schema, migrations, seed data",
        type: "DB",
        repoPath: "lib/db",
        projectId: openLocal.id,
      },
    }),
    prisma.artifact.upsert({
      where: { id: "artifact-libs" },
      update: {},
      create: {
        id: "artifact-libs",
        name: "lib/*",
        description: "Shared libraries: api-client-react, api-spec, api-zod, integrations",
        type: "LIB",
        repoPath: "lib",
        projectId: openLocal.id,
      },
    }),
  ]);

  console.log("✅ Artifacts created");

  // ─── Milestones (90-day evaluation equity gates) ───────────────────────────
  const today = new Date();
  const evalEnd = new Date(today);
  evalEnd.setDate(today.getDate() + 90);

  const milestones = await Promise.all([
    // Technical Leadership
    prisma.milestone.upsert({
      where: { id: "milestone-technical" },
      update: {},
      create: {
        id: "milestone-technical",
        title: "Technical Leadership",
        description:
          "Production system architecture completed. Security framework designed and implemented. Production-ready backend deployed.",
        category: "TECHNICAL",
        status: "IN_PROGRESS",
        targetDate: evalEnd,
        projectId: openLocal.id,
      },
    }),
    // Operational Leadership
    prisma.milestone.upsert({
      where: { id: "milestone-operational" },
      update: {},
      create: {
        id: "milestone-operational",
        title: "Operational Leadership",
        description:
          "Engineering documentation standards established. CI/CD pipeline implemented. Testing and QA standards established.",
        category: "OPERATIONAL",
        status: "NOT_STARTED",
        targetDate: evalEnd,
        projectId: openLocal.id,
      },
    }),
    // Executive Leadership
    prisma.milestone.upsert({
      where: { id: "milestone-executive" },
      update: {},
      create: {
        id: "milestone-executive",
        title: "Executive Leadership",
        description:
          "Active in investor meetings. Technical hiring plan developed + first engineering hire(s). Engineering roadmap maintained.",
        category: "EXECUTIVE",
        status: "NOT_STARTED",
        targetDate: evalEnd,
        projectId: openLocal.id,
      },
    }),
    // Growth
    prisma.milestone.upsert({
      where: { id: "milestone-growth" },
      update: {},
      create: {
        id: "milestone-growth",
        title: "Growth",
        description:
          "Platform scales to vendor/user targets. Vendor onboarding milestones achieved. Consumer/user growth milestones achieved.",
        category: "GROWTH",
        status: "NOT_STARTED",
        targetDate: evalEnd,
        projectId: openLocal.id,
      },
    }),
  ]);

  console.log("✅ Milestones (90-day evaluation) created");

  // ─── Sprints ────────────────────────────────────────────────────────────────
  // Sprint 1: Aug 25 – Sep 5
  const sprint1 = await prisma.sprint.upsert({
    where: { id: "sprint-1" },
    update: {},
    create: {
      id: "sprint-1",
      name: "Sprint 1 — Aug 25 – Sep 5",
      goal: "Establish CI/CD, audit codebase, ship first PR to main repo",
      startDate: new Date("2026-08-25"),
      endDate: new Date("2026-09-05"),
      status: "PLANNING",
      projectId: openLocal.id,
    },
  });

  await prisma.sprintMember.upsert({
    where: { userId_sprintId: { userId: julylan.id, sprintId: sprint1.id } },
    update: {},
    create: { userId: julylan.id, sprintId: sprint1.id },
  });
  await prisma.sprintMember.upsert({
    where: { userId_sprintId: { userId: chrissy.id, sprintId: sprint1.id } },
    update: {},
    create: { userId: chrissy.id, sprintId: sprint1.id },
  });

  console.log("✅ Sprints created");

  // ─── Tasks ─────────────────────────────────────────────────────────────────
  const taskData = [
    // Sprint 1 tasks — Technical Leadership milestone
    {
      id: "task-audit-architecture",
      title: "Audit existing codebase architecture",
      description: "Review api-server, open-local web app, db schema. Document tech stack, dependencies, architectural patterns, technical debt.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[0].id,
      sprintId: sprint1.id,
      artifactId: artifacts[1].id, // open-local web
    },
    {
      id: "task-setup-cicd",
      title: "Set up CI/CD pipeline",
      description: "GitHub Actions: lint → typecheck → test → deploy. Target: Railway for API + Vercel for web preview deployments.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[1].id,
      sprintId: sprint1.id,
      artifactId: artifacts[0].id,
    },
    {
      id: "task-security-review",
      title: "Security review — auth, payments, data",
      description: "Audit current auth (NextAuth), Stripe integration, DB access patterns. Document vulnerabilities and remediation plan.",
      status: "TODO",
      priority: "URGENT",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[0].id,
      sprintId: sprint1.id,
      artifactId: artifacts[0].id,
    },
    {
      id: "task-deploy-production",
      title: "Deploy production-ready backend",
      description: "Production backend on Railway with proper env vars, domain, SSL, monitoring. Criteria: zero-downtime deploy, health check, error tracking.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[0].id,
      sprintId: sprint1.id,
      artifactId: artifacts[0].id,
    },
    {
      id: "task-db-migrations",
      title: "DB schema review + migration strategy",
      description: "Review Drizzle migrations, identify missing indexes, foreign keys, audit timestamps. Document migration runbook.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[0].id,
      sprintId: sprint1.id,
      artifactId: artifacts[3].id,
    },
    {
      id: "task-vendor-api-review",
      title: "Review vendor API endpoints",
      description: "Audit all vendor endpoints: onboarding, product CRUD, inventory, orders. Identify gaps, document for mobile app integration.",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[0].id,
      sprintId: sprint1.id,
      artifactId: artifacts[0].id,
    },
    // Admin/Ops tasks for Chrissy
    {
      id: "task-hiring-plan",
      title: "Draft engineering hiring plan",
      description: "Define roles (frontend, backend, mobile), interview process, compensation framework. Present to Chrissy for board review.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: chrissy.id,
      projectId: openLocal.id,
      milestoneId: milestones[2].id,
      sprintId: sprint1.id,
    },
    {
      id: "task-investor-deck-v1",
      title: "Technical investor deck — first draft",
      description: "Create technical section of investor deck: tech stack, architecture diagram, scalability narrative, competitive moat.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: chrissy.id,
      projectId: openLocal.id,
      milestoneId: milestones[2].id,
      sprintId: sprint1.id,
    },
    {
      id: "task-milestone-plan",
      title: "Document 90-day milestone plan",
      description: "Formalize Section IX milestones with specific acceptance criteria, dates, owners. Share with Chrissy for alignment.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      assigneeId: chrissy.id,
      projectId: openLocal.id,
      milestoneId: milestones[2].id,
      sprintId: sprint1.id,
    },
    // Mobile app tasks
    {
      id: "task-mobile-arch",
      title: "Mobile app architecture review",
      description: "Review open-local-mobile React Native codebase. Document current state, required APIs, offline-first strategy.",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: julylan.id,
      projectId: openLocal.id,
      milestoneId: milestones[0].id,
      sprintId: sprint1.id,
      artifactId: artifacts[2].id,
    },
  ];

  for (const t of taskData) {
    await prisma.task.upsert({ where: { id: t.id }, update: {}, create: t as any });
  }

  console.log("✅ Tasks created");

  // ─── GitHub Commits (simulated recent history) ───────────────────────────────
  const commitData = [
    {
      sha: "a3f1c9d",
      message: "fix: vendor onboarding flow — missing email validation\nCloses #42",
      authorName: "Christian Artiles",
      authorLogin: "mscartiles-lab",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      htmlUrl: "https://github.com/mscartiles-lab/open-local/commit/a3f1c9d",
      committedAt: new Date("2026-06-10T15:15:42Z"),
      artifactId: artifacts[0].id,
      linkedTasks: ["task-vendor-api-review"],
    },
    {
      sha: "b7e2d4a",
      message: "feat: add Stripe webhook handler for order completion\nRefs #38",
      authorName: "Christian Artiles",
      authorLogin: "mscartiles-lab",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      htmlUrl: "https://github.com/mscartiles-lab/open-local/commit/b7e2d4a",
      committedAt: new Date("2026-06-08T11:30:00Z"),
      artifactId: artifacts[0].id,
      linkedTasks: [],
    },
    {
      sha: "c9a1f8e",
      message: "chore: update Drizzle schema — add vendor_ratings table",
      authorName: "Christian Artiles",
      authorLogin: "mscartiles-lab",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      htmlUrl: "https://github.com/mscartiles-lab/open-local/commit/c9a1f8e",
      committedAt: new Date("2026-06-05T09:00:00Z"),
      artifactId: artifacts[3].id,
      linkedTasks: [],
    },
    {
      sha: "d4b7c2f",
      message: "feat: consumer product search with filters\nCloses #35",
      authorName: "Christian Artiles",
      authorLogin: "mscartiles-lab",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      htmlUrl: "https://github.com/mscartiles-lab/open-local/commit/d4b7c2f",
      committedAt: new Date("2026-06-01T14:20:00Z"),
      artifactId: artifacts[1].id,
      linkedTasks: [],
    },
    {
      sha: "e8f3a1b",
      message: "feat: admin dashboard — vendor management panel",
      authorName: "Christian Artiles",
      authorLogin: "mscartiles-lab",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      htmlUrl: "https://github.com/mscartiles-lab/open-local/commit/e8f3a1b",
      committedAt: new Date("2026-05-28T16:45:00Z"),
      artifactId: artifacts[1].id,
      linkedTasks: [],
    },
    {
      sha: "f1c9d3a",
      message: "initial commit — Open Local monorepo setup",
      authorName: "Christian Artiles",
      authorLogin: "mscartiles-lab",
      repoUrl: "https://github.com/mscartiles-lab/open-local",
      htmlUrl: "https://github.com/mscartiles-lab/open-local/commit/f1c9d3a",
      committedAt: new Date("2026-05-20T10:00:00Z"),
      artifactId: artifacts[0].id,
      linkedTasks: [],
    },
  ];

  for (const c of commitData) {
    await prisma.gitHubCommit.upsert({
      where: { sha: c.sha },
      update: {},
      create: c as any,
    });
  }

  console.log("✅ GitHub commits seeded");

  // ─── Investor Updates ────────────────────────────────────────────────────────
  await prisma.investorUpdate.createMany({
    data: [
      {
        title: "CTO Evaluation Kicked Off — 90-Day Plan Active",
        content:
          "Julylan Johnson joining as Founding CTO candidate for a 90-day unpaid evaluation period. Equity milestone targets defined across 4 categories: Technical, Operational, Executive, and Growth leadership.",
        type: "MILESTONE",
        isPublished: true,
        sentAt: new Date(),
        authorId: chrissy.id,
        projectId: openLocal.id,
        metrics: { evaluationDays: 90, milestoneCategories: 4 },
      },
      {
        title: "Investor Update — June 2026",
        content:
          "Platform beta live with 3 active vendor categories. Stripe payments integrated. Admin dashboard shipped. Next milestone: mobile app vendor portal for on-the-ground sales team.",
        type: "PROGRESS",
        isPublished: true,
        sentAt: new Date("2026-06-15"),
        authorId: chrissy.id,
        projectId: openLocal.id,
        metrics: { vendorsOnboarded: 12, categories: 3, mrr: 2400, consumerSignups: 340 },
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Investor updates seeded");

  // ─── Calendar Events ─────────────────────────────────────────────────────────
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 3);
  const twoWeeks = new Date();
  twoWeeks.setDate(nextWeek.getDate() + 7);

  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "CTO 90-Day Kickoff Call",
        description: "Align on evaluation milestones, communication cadence, first sprint priorities",
        start: nextWeek,
        end: new Date(nextWeek.getTime() + 60 * 60 * 1000),
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        eventType: "MEETING",
        organizerId: chrissy.id,
        projectId: openLocal.id,
      },
      {
        title: "Sprint 1 End — Milestone Review",
        description: "Review all Sprint 1 tasks. Assess Technical Leadership milestone progress. Decide on Sprint 2 focus.",
        start: twoWeeks,
        end: new Date(twoWeeks.getTime() + 90 * 60 * 1000),
        eventType: "REVIEW",
        organizerId: julylan.id,
        projectId: openLocal.id,
      },
      {
        title: "Investor Pitch — Angel Deck Review",
        description: "Julylan reviews technical section of investor deck with Chrissy",
        start: new Date(twoWeeks.getTime() + 2 * 24 * 60 * 60 * 1000),
        eventType: "PITCH",
        organizerId: chrissy.id,
        projectId: openLocal.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Calendar events seeded");

  // ─── Ops Board ITSELF ───────────────────────────────────────────────────────
  await prisma.project.upsert({
    where: { id: "ops-board" },
    update: {},
    create: {
      id: "ops-board",
      name: "Ops Board",
      description: "Internal project management — tasks, GitHub, milestones, investor updates",
      repoUrl: "https://github.com/Verstige/ops-board",
      repoOwner: "Verstige",
      repoName: "ops-board",
      color: "#5c7cfa",
    },
  });

  console.log("\n🎉 Full seed complete!\n");
  console.log("📋 Login credentials:");
  console.log("  Julylan: julylan@openlocal.com / julylan888");
  console.log("  Chrissy:  chrissy@openlocal.com / chrissy888");
  console.log("\n🔗 Repos tracked:");
  console.log("  mscartiles-lab/open-local (main)");
  console.log("  Verstige/open-local (fork)");
  console.log("\n📊 Open Local project: 4 artifacts, 4 milestones, 1 active sprint, 10 tasks");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
