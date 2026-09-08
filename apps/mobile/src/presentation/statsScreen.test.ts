import { STATS } from "../content/stats";
import {
  getResearchFactValidationError,
  mergeResearchFacts,
  nextResearchFactIndex,
  parseResearchFact,
  STATS_COPY,
} from "./statsScreen";

describe("stats screen presentation", () => {
  test("uses the research-library copy", () => {
    expect(STATS_COPY.title).toBe("What the research says");
    expect(STATS_COPY.subtitle).toBe(
      "Plain facts about metabolic health, no spin, just what's true. Use the facts as a pause, not as judgement.",
    );
    expect(STATS_COPY.subtitle).not.toContain("—");
    expect(STATS_COPY.title).not.toBe("Your next choice matters");
    expect(STATS_COPY.footnote).toBe(
      "You can curate your own stat list, or let SOS rotate from the research library, up to 20 at a time.",
    );
    expect(STATS_COPY.footnote).not.toContain("—");
    expect(STATS_COPY.backOnTrack).toBe("Facts work. Back on track.");
  });

  test("starts from the editorial library and appends saved facts", () => {
    const merged = mergeResearchFacts([
      {
        id: "f1",
        num: "10%",
        title: "A member fact",
        body: "Something they added.",
        source: "member",
      },
    ]);
    expect(merged[0]?.title).toBe(STATS[0].title);
    expect(merged.at(-1)?.title).toBe("A member fact");
    expect(merged).toHaveLength(STATS.length + 1);
  });

  test("rotates through the list and wraps", () => {
    expect(nextResearchFactIndex(0, 3)).toBe(1);
    expect(nextResearchFactIndex(2, 3)).toBe(0);
    expect(nextResearchFactIndex(0, 0)).toBe(0);
  });

  test("parses a generated fact and rejects empty or dashed copy", () => {
    expect(
      parseResearchFact({
        num: "27%",
        title: "Higher heart attack risk",
        body: "Carrying extra weight can raise cardiovascular risk.",
      }),
    ).toEqual({
      num: "27%",
      title: "Higher heart attack risk",
      body: "Carrying extra weight can raise cardiovascular risk.",
    });
    expect(
      parseResearchFact({
        num: "2x",
        title: "Heart workload",
        body: "Extra tissue means more work — for the heart.",
      })?.body,
    ).toBe("Extra tissue means more work, for the heart.");
    expect(parseResearchFact({ title: "", body: "Nope" })).toBeNull();
  });

  test("requires a title and body when the member adds a fact", () => {
    expect(
      getResearchFactValidationError({ title: "  ", body: "A body" }),
    ).toBe("Add a short title.");
    expect(
      getResearchFactValidationError({ title: "A title", body: "   " }),
    ).toBe("Add the fact itself.");
    expect(
      getResearchFactValidationError({
        title: "A title",
        body: "A researched fact.",
        num: "12%",
      }),
    ).toBeNull();
  });
});
