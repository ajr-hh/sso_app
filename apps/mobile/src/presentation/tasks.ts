export type TaskStatusKind = "added" | "updated" | "deleted";

export function getTaskStatusMessage(
  kind: TaskStatusKind,
  label: string,
): string {
  switch (kind) {
    case "added":
      return `Task added: ${label}.`;
    case "updated":
      return `Task updated: ${label}.`;
    case "deleted":
      return `Task deleted: ${label}.`;
  }
}

type TaskDoneIntention = {
  confirmed: boolean;
  intended: boolean;
  revision: number;
};

export type TaskDoneIntentions = ReadonlyMap<string, TaskDoneIntention>;

export type TaskDoneChange = {
  id: string;
  previous: boolean;
  revision: number;
  target: boolean;
};

export function beginTaskDoneChange(
  intentions: TaskDoneIntentions,
  id: string,
  renderedDone: boolean,
): {
  change: TaskDoneChange;
  intentions: TaskDoneIntentions;
} {
  const current = intentions.get(id);
  const previous = current?.intended ?? renderedDone;
  const revision = (current?.revision ?? 0) + 1;
  const target = !previous;
  const next = new Map(intentions);

  next.set(id, {
    confirmed: current?.confirmed ?? renderedDone,
    intended: target,
    revision,
  });

  return {
    change: { id, previous, revision, target },
    intentions: next,
  };
}

export function settleTaskDoneChange(
  intentions: TaskDoneIntentions,
  change: TaskDoneChange,
  succeeded: boolean,
): {
  intentions: TaskDoneIntentions;
  rollbackDone?: boolean;
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
    : { intentions: next, rollbackDone: confirmed };
}
