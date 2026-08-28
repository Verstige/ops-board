-- Add notes and completedAt to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;
