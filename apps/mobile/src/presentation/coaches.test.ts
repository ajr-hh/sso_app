import {
  COACH_COPY,
  COACH_IDS,
  coachPickerAccessibilityLabel,
  getCoachMessageValidationError,
  getCoachName,
  humanizeCoachText,
  isCoachId,
  parseCoachId,
  parseCoachReply,
  shouldPickCoach,
} from "./coaches";

describe("coach presentation", () => {
  test("offers four named coaches", () => {
    expect(COACH_IDS).toEqual(["marcus", "elena", "sam", "jordan"]);
    expect(getCoachName("sam")).toBe("Sam");
    expect(isCoachId("jordan")).toBe(true);
    expect(isCoachId("elena")).toBe(true);
    expect(isCoachId("alex")).toBe(false);
    expect(parseCoachId("unknown")).toBe("marcus");
  });

  test("asks for a coach only the first time messages are used", () => {
    expect(shouldPickCoach(false)).toBe(true);
    expect(shouldPickCoach(true)).toBe(false);
  });

  test("announces each coach name with the blurb", () => {
    expect(
      coachPickerAccessibilityLabel("Marcus", "Direct. Short. No pep talk."),
    ).toBe("Marcus. Direct. Short. No pep talk.");
  });

  test("names the wait while the coach texts first", () => {
    expect(COACH_COPY.opening).toBe("Your coach is writing first.");
  });

  test("lets them hide a thread without deleting the rows", () => {
    expect(COACH_COPY.delete).toBe("Delete");
    expect(COACH_COPY.clear).toBe("Clear messages");
  });

  test("strips em dashes and AI self-talk from coach copy", () => {
    expect(
      humanizeCoachText(
        "You already know the next move — do it. I'm an AI, so keep going.",
      ),
    ).toBe("You already know the next move, do it, so keep going.");
    expect(humanizeCoachText("Ride it – then decide.")).toBe(
      "Ride it, then decide.",
    );
  });

  test("accepts a short coach reply and rejects empty or oversized text", () => {
    expect(parseCoachReply({ body: "Ride the wave. Then decide." })).toBe(
      "Ride the wave. Then decide.",
    );
    expect(parseCoachReply("Stay with this for ten minutes.")).toBe(
      "Stay with this for ten minutes.",
    );
    expect(parseCoachReply({ body: "   " })).toBeNull();
    expect(parseCoachReply({ body: "x".repeat(401) })).toBeNull();
  });

  test("requires a member message under 280 characters", () => {
    expect(getCoachMessageValidationError("   ")).toBe("Write a message first.");
    expect(getCoachMessageValidationError("Need a minute.")).toBeNull();
    expect(getCoachMessageValidationError("x".repeat(281))).toBe(
      "Keep it under 280 characters.",
    );
  });
});
