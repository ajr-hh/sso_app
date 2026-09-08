-- These are Prisma wireframe tables, unused by the Expo app, locked rather
-- than dropped pending a decision on the root Next.js scaffolding.
-- No FORCE ROW LEVEL SECURITY: the table owner still bypasses RLS so the
-- Next.js Prisma path over DATABASE_URL keeps working.

alter table public."AccountabilityContact" enable row level security;
revoke all on table public."AccountabilityContact" from anon, authenticated;

alter table public."Challenge" enable row level security;
revoke all on table public."Challenge" from anon, authenticated;

alter table public."CommunityPost" enable row level security;
revoke all on table public."CommunityPost" from anon, authenticated;

alter table public."DailyTask" enable row level security;
revoke all on table public."DailyTask" from anon, authenticated;

alter table public."FavoriteRestaurant" enable row level security;
revoke all on table public."FavoriteRestaurant" from anon, authenticated;

alter table public."FoodAlias" enable row level security;
revoke all on table public."FoodAlias" from anon, authenticated;

alter table public."Goal" enable row level security;
revoke all on table public."Goal" from anon, authenticated;

alter table public."JournalEntry" enable row level security;
revoke all on table public."JournalEntry" from anon, authenticated;

alter table public."KryptoniteFood" enable row level security;
revoke all on table public."KryptoniteFood" from anon, authenticated;

alter table public."KryptoniteSwap" enable row level security;
revoke all on table public."KryptoniteSwap" from anon, authenticated;

alter table public."PastAttempt" enable row level security;
revoke all on table public."PastAttempt" from anon, authenticated;

alter table public."ReinforcementPhoto" enable row level security;
revoke all on table public."ReinforcementPhoto" from anon, authenticated;

alter table public."RestaurantDish" enable row level security;
revoke all on table public."RestaurantDish" from anon, authenticated;

alter table public."Reward" enable row level security;
revoke all on table public."Reward" from anon, authenticated;

alter table public."SosEvent" enable row level security;
revoke all on table public."SosEvent" from anon, authenticated;

alter table public."User" enable row level security;
revoke all on table public."User" from anon, authenticated;
