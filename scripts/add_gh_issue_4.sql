-- Add GH issue #4 as a task in ops-board
-- Run this in Railway PostgreSQL → SQL Editor

INSERT INTO "tasks" (
  "id",
  "title",
  "description",
  "status",
  "priority",
  "githubIssueNumber",
  "githubIssueUrl",
  "assigneeId",
  "projectId",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  '[infra] Migrate Chrissy domain from Wix to Vercel',
  E'Migrate Chrissy''s personal domain from Wix to Vercel so she has full control over the DNS and can manage it independently.\n\n**Context**\n- Current registrar/host: Wix\n- Target: Vercel (vercel.com) — already used for hosting\n- This enables better CI/CD integration with the open-local deployment workflow\n\n**Steps**\n- Export DNS records from Wix\n- Transfer domain to Vercel (or update nameservers if keeping registrar)\n- Configure domain in Vercel dashboard\n- Update any env vars referencing the old domain\n- Verify site loads correctly on new domain',
  'TODO',
  'HIGH',
  4,
  'https://github.com/mscartiles-lab/open-local/issues/4',
  u.id,
  'open-local-issues',
  NOW(),
  NOW()
FROM "users" u
WHERE u.email = 'julylan@openlocal.com'
LIMIT 1;
