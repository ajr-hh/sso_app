import { railsOptions } from "@/lib/demo-data";

const MOTIVATOR_HREF: Record<string, (typeof railsOptions)[number]["href"]> = {
  "Remember why": "/sos/why",
  "The numbers": "/sos/stats",
  Rewards: "/sos/rewards",
  "A live call": "/sos/call",
};

export function rankRailsOptions(motivators: string[]) {
  const preferred = new Set(
    motivators.map((item) => MOTIVATOR_HREF[item]).filter(Boolean),
  );

  return [...railsOptions].sort((a, b) => {
    const aPreferred = preferred.has(a.href) ? 0 : 1;
    const bPreferred = preferred.has(b.href) ? 0 : 1;
    return aPreferred - bPreferred;
  });
}

export function isPreferredRail(href: string, motivators: string[]) {
  return motivators.some((item) => MOTIVATOR_HREF[item] === href);
}
