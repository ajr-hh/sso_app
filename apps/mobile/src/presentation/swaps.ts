import { filterSwapsByRules, swapViolatesRules, type FoodRules } from "./foodRules";

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
