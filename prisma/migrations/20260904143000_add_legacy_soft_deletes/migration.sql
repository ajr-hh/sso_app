ALTER TABLE "Goal"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "DailyTask"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "PastAttempt"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Goal_active_user_order_idx"
ON "Goal" ("userId", "deletedAt", "order")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "DailyTask_active_user_date_idx"
ON "DailyTask" ("userId", "deletedAt", "date")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "PastAttempt_active_user_idx"
ON "PastAttempt" ("userId", "deletedAt")
WHERE "deletedAt" IS NULL;
