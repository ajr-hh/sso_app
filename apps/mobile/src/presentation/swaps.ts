import { filterSwapsByRules, swapViolatesRules, type FoodRules } from "./foodRules";

/**
 * Persisted/generated swap row. `ruleTags` holds normalized allergen/diet tags
 * captured at save time so rows can be re-filtered when food rules change.
 * Downstream persistence must populate tags for generated swaps; catalog rows
 * inherit tags from `FOOD_SWAP_TAGS`. An empty array means no known rule
 * conflicts — untagged safe or custom rows are permitted and are not filtered
 * out solely for lacking tags.
 */
export type SwapRow = {
  id: string;
  label: string;
  source: string;
  favorited: boolean;
  ruleTags: string[];
};

export type ResolveSwapInput = {
  cravingLabel: string;
  catalog: Record<string, string[]>;
  tags: Record<string, string[]>;
  rules: FoodRules;
  saved: SwapRow[];
};

export type ResolveSwapView = {
  rows: SwapRow[];
  showGenerate: boolean;
  allFilteredOut: boolean;
};

function findCatalogKey(
  catalog: Record<string, string[]>,
  cravingLabel: string,
): string | null {
  const lower = cravingLabel.toLowerCase();
  for (const key of Object.keys(catalog)) {
    if (key.toLowerCase() === lower) {
      return key;
    }
  }
  return null;
}

function rowViolatesRules(row: SwapRow, rules: FoodRules): boolean {
  return swapViolatesRules(row.label, { [row.label]: row.ruleTags }, rules);
}

function mergeCatalogRow(
  label: string,
  tags: Record<string, string[]>,
  savedRow?: SwapRow,
): SwapRow {
  if (savedRow) {
    return savedRow;
  }
  return {
    id: label,
    label,
    source: "catalog",
    favorited: false,
    ruleTags: tags[label] ?? [],
  };
}

function sortFavoritedFirst(rows: SwapRow[]): SwapRow[] {
  const favorited = rows.filter((row) => row.favorited);
  const rest = rows.filter((row) => !row.favorited);
  return [...favorited, ...rest];
}

export function resolveSwapView(input: ResolveSwapInput): ResolveSwapView {
  const { cravingLabel, catalog, tags, rules, saved } = input;

  if (!rules.foodRulesSet) {
    return { rows: [], showGenerate: false, allFilteredOut: false };
  }

  const catalogKey = findCatalogKey(catalog, cravingLabel);
  const hasCatalogMatch = catalogKey !== null;
  const filteredSaved = saved.filter((row) => !rowViolatesRules(row, rules));

  let rows: SwapRow[] = [];

  if (catalogKey) {
    const catalogLabels = catalog[catalogKey];
    const filteredLabels = filterSwapsByRules(catalogLabels, tags, rules);
    const savedByLabel = new Map<string, SwapRow>();

    for (const row of filteredSaved) {
      savedByLabel.set(row.label.toLowerCase(), row);
    }

    rows = filteredLabels.map((label) =>
      mergeCatalogRow(label, tags, savedByLabel.get(label.toLowerCase())),
    );

    const catalogLabelSet = new Set(catalogLabels.map((label) => label.toLowerCase()));
    for (const row of filteredSaved) {
      if (!catalogLabelSet.has(row.label.toLowerCase())) {
        rows.push(row);
      }
    }
  } else {
    rows = [...filteredSaved];
  }

  rows = sortFavoritedFirst(rows);

  return {
    rows,
    showGenerate: !hasCatalogMatch && filteredSaved.length === 0,
    allFilteredOut: hasCatalogMatch && rows.length === 0,
  };
}
