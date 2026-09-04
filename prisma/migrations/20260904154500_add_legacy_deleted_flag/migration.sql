ALTER TABLE "Goal"
ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DailyTask"
ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PastAttempt"
ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Goal" SET "deleted" = true WHERE "deletedAt" IS NOT NULL;
UPDATE "DailyTask" SET "deleted" = true WHERE "deletedAt" IS NOT NULL;
UPDATE "PastAttempt" SET "deleted" = true WHERE "deletedAt" IS NOT NULL;

DROP INDEX IF EXISTS "Goal_active_user_order_idx";
DROP INDEX IF EXISTS "DailyTask_active_user_date_idx";
DROP INDEX IF EXISTS "PastAttempt_active_user_idx";

CREATE INDEX IF NOT EXISTS "Goal_active_user_order_idx"
ON "Goal" ("userId", "deleted", "order");

CREATE INDEX IF NOT EXISTS "DailyTask_active_user_date_idx"
ON "DailyTask" ("userId", "deleted", "date");

CREATE INDEX IF NOT EXISTS "PastAttempt_active_user_idx"
ON "PastAttempt" ("userId", "deleted");
