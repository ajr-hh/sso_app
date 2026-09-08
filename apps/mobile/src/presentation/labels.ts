type LabelIntention = {
  confirmed: string;
  intended: string;
  revision: number;
};

export type LabelIntentions = ReadonlyMap<string, LabelIntention>;

export type LabelChange = {
  id: string;
  revision: number;
  target: string;
};

export function restoreLabel(label: string, savedLabel: string): string {
  return label.trim() || savedLabel;
}

export function getIntendedLabel(
  intentions: LabelIntentions,
  id: string,
  savedLabel: string,
): string {
  return intentions.get(id)?.intended ?? savedLabel;
}

export function beginLabelChange(
  intentions: LabelIntentions,
  id: string,
  savedLabel: string,
  target: string,
): {
  change: LabelChange;
  intentions: LabelIntentions;
} {
  const current = intentions.get(id);
  const revision = (current?.revision ?? 0) + 1;
  const next = new Map(intentions);

  // `confirmed` only advances on a database success, so a chain of queued edits
  // keeps pointing at the same rollback target instead of an earlier failed one.
  next.set(id, {
    confirmed: current?.confirmed ?? savedLabel,
    intended: target,
    revision,
  });

  return {
    change: { id, revision, target },
    intentions: next,
  };
}

export function settleLabelChange(
  intentions: LabelIntentions,
  change: LabelChange,
  succeeded: boolean,
): {
  intentions: LabelIntentions;
  rollbackLabel?: string;
} {
  const current = intentions.get(change.id);
  if (!current) {
    return { intentions };
  }

  const next = new Map(intentions);
  const confirmed = succeeded ? change.target : current.confirmed;

  if (current.revision !== change.revision) {
    if (succeeded) {
      next.set(change.id, { ...current, confirmed });
    }
    return { intentions: next };
  }

  next.delete(change.id);
  return succeeded
    ? { intentions: next }
    : { intentions: next, rollbackLabel: confirmed };
}

export function forgetLabelIntention(
  intentions: LabelIntentions,
  id: string,
): LabelIntentions {
  if (!intentions.has(id)) {
    return intentions;
  }

  const next = new Map(intentions);
  next.delete(id);
  return next;
}
