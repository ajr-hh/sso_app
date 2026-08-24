import { aliasSwaps } from "@/lib/demo-data";

export type FlexLevel = keyof typeof aliasSwaps;

const LIBRARY: Record<string, Record<FlexLevel, { title: string; sub: string }>> = {
  "apple pie": aliasSwaps,
  pie: aliasSwaps,
  "ice cream": {
    "A little better": { title: "Ice cream in a small cup, not the pint", sub: "Same scoop, a hard stop." },
    Mid: { title: "Frozen banana blended with cocoa", sub: "Cold and sweet, without the dairy crash." },
    "Very healthy": { title: "Greek yogurt with berries and cinnamon", sub: "Protein first. Craving heard." },
  },
};

export function suggestAlias(craving: string, level: FlexLevel) {
  const key = craving.trim().toLowerCase();
  const known = LIBRARY[key];
  if (known) return known[level];

  return {
    "A little better": {
      title: `A smaller serving of ${craving}`,
      sub: "Same food. Half the portion, then pause.",
    },
    Mid: {
      title: `A lighter take on ${craving}`,
      sub: "Keep the flavor, drop the extras.",
    },
    "Very healthy": {
      title: `A protein-forward stand-in for ${craving}`,
      sub: "Craving acknowledged. Body still on your side.",
    },
  }[level];
}
