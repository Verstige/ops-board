-- Performance logging tables
CREATE TABLE IF NOT EXISTS "performance_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" TEXT NOT NULL,
  "summary" TEXT,
  "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
  "totalMinutes" INTEGER NOT NULL DEFAULT 0,
  "highlights" TEXT,
  "blockers" TEXT,
  "nextDayPlan" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "authorId" TEXT NOT NULL,
  CONSTRAINT "performance_logs_authorId_date_unique" UNIQUE("authorId", "date")
);

CREATE TABLE IF NOT EXISTS "performance_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "taskId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "minutes" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "logId" TEXT NOT NULL,
  CONSTRAINT "performance_entries_logId_fkey" FOREIGN KEY ("logId") REFERENCES "performance_logs"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "work_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "endedAt" TIMESTAMPTZ,
  "minutes" INTEGER NOT NULL DEFAULT 0,
  "taskId" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "authorId" TEXT NOT NULL
);
