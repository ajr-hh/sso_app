import {
  ALIAS_COPY,
  ALIAS_LEVELS,
  CHALLENGE_COPY,
  clampRestaurantTargets,
  clipRestaurantFields,
  getChallengeInviteHref,
  getChallengeListLabel,
  getPrizePeopleLine,
  getPrizePoolLabel,
  OTHER_TOOLS_EYEBROW,
  OTHER_TOOL_ROUTES,
  RESTAURANT_COPY,
  formatChallengeDuration,
} from "./otherTools";

describe("other tools copy", () => {
  test("keeps the orange eyebrow and the three tool names", () => {
    expect(OTHER_TOOLS_EYEBROW).toBe("Other tools");
    expect(CHALLENGE_COPY.joinLabel).toBe("Join a challenge");
    expect(CHALLENGE_COPY.title).toBe("Create a group challenge");
    expect(CHALLENGE_COPY.subtitle).toBe(
      "Pull together a group, set the rules, and stay accountable together.",
    );
    expect(RESTAURANT_COPY.button).toBe("Restaurant finder");
    expect(RESTAURANT_COPY.title).toBe("Best choices, your favorite spots");
    expect(ALIAS_COPY.button).toBe("Food alias swap");
  });

  test("routes each tool to its own screen", () => {
    expect(OTHER_TOOL_ROUTES.challenge).toBe("/(app)/tools/challenges");
    expect(OTHER_TOOL_ROUTES.restaurant).toBe("/(app)/tools/restaurant");
    expect(OTHER_TOOL_ROUTES.alias).toBe("/(app)/tools/alias");
  });
});

describe("challenge presentation", () => {
  test("formats the default rules and prize pool", () => {
    expect(formatChallengeDuration(30)).toBe("30-day duration");
    expect(CHALLENGE_COPY.logWeight).toBe("Log weight daily");
    expect(CHALLENGE_COPY.missRule).toBe(
      "Miss 3 days in a row → eliminated",
    );
    expect(CHALLENGE_COPY.prizeBody(20)).toBe(
      "Everyone contributes $20 and winner takes the pool.",
    );
    expect(getPrizePoolLabel(140)).toBe("$140");
    expect(getPrizePeopleLine(7)).toBe("7 people in so far");
    expect(getChallengeListLabel({ durationDays: 30, buyIn: 20 })).toBe(
      "30-day challenge, $20 buy-in",
    );
  });

  test("builds a mailto invite without putting the roster in the subject", () => {
    expect(getChallengeInviteHref({ buyIn: 20, durationDays: 30 })).toBe(
      "mailto:?subject=Join%20my%20Humanaut%20challenge&body=I%20started%20a%2030-day%20challenge.%20Buy-in%20is%20%2420%2C%20and%20the%20winner%20takes%20the%20pool.",
    );
  });
});

describe("restaurant and alias copy", () => {
  test("caps the restaurant list and names the scan action", () => {
    expect(RESTAURANT_COPY.max).toBe(10);
    expect(RESTAURANT_COPY.scan).toBe("Scan a menu");
    expect(RESTAURANT_COPY.footnote).toBe(
      "Add your top 10 restaurants and set your macro targets, SOS keeps the list ready for next time.",
    );
    expect(ALIAS_LEVELS).toEqual(["A little better", "Mid", "Very healthy"]);
  });

  test("clips restaurant fields to the table limits before save", () => {
    const longName = "N".repeat(90);
    const longPick = "P".repeat(200);
    const longFilter = "F".repeat(140);
    expect(clipRestaurantFields({
      name: `  ${longName}  `,
      bestPick: longPick,
      filter: longFilter,
    })).toEqual({
      name: "N".repeat(80),
      bestPick: "P".repeat(160),
      filter: "F".repeat(120),
    });
  });

  test("clamps restaurant targets to the table limits", () => {
    expect(
      clampRestaurantTargets({ protein_grams: 999, calorie_max: 9000 }),
    ).toEqual({ protein_grams: 300, calorie_max: 5000 });
    expect(
      clampRestaurantTargets({ protein_grams: 0, calorie_max: -4 }),
    ).toEqual({ protein_grams: 1, calorie_max: 1 });
  });
});
