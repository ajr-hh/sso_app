import {
  getPhotoCaptionValidationError,
  getTopWhyReason,
  getUnusedWhyReasonSuggestions,
  getWhyReasonValidationError,
  getWhyScreenMode,
  MIN_WHY_REASONS,
  pickNextWhyPhoto,
  quoteWhyReason,
  WHY_COPY,
} from "./why";

describe("why presentation", () => {
  test("uses the Remember Your Why copy", () => {
    expect(WHY_COPY.title).toBe("You know what it takes");
    expect(WHY_COPY.subtitle).toBe(
      "You've done hard things before. Here's what you're working toward, and why.",
    );
    expect(WHY_COPY.photosTitle).toBe("Photos that motivate you");
    expect(WHY_COPY.photosBody).toBe(
      "Upload photos that remind you of your why, the goal weight you hit before, a hard thing you finished, a major accomplishment, someone you admire. These photos rotate so it never feels stale.",
    );
    expect(WHY_COPY.subtitle).not.toContain("—");
    expect(WHY_COPY.photosBody).not.toContain("—");
  });

  test("asks for three reasons before the rail is ready", () => {
    expect(MIN_WHY_REASONS).toBe(3);
    expect(getWhyScreenMode(0)).toBe("needs_reasons");
    expect(getWhyScreenMode(2)).toBe("needs_reasons");
    expect(getWhyScreenMode(3)).toBe("ready");
    expect(getTopWhyReason([{ label: "My kids", sort_order: 0 }])).toBe(
      "My kids",
    );
    expect(quoteWhyReason("My kids")).toBe('"My kids"');
    expect(getUnusedWhyReasonSuggestions(["my kids"])).not.toContain("My kids");
    expect(getWhyReasonValidationError("  ", [])).toBe("Write a reason first.");
  });

  test("requires a caption on why photos and rotates to a different photo", () => {
    expect(getPhotoCaptionValidationError("   ")).toBe(
      "Write a caption for this photo.",
    );
    expect(getPhotoCaptionValidationError("The day I finished.")).toBeNull();
    const photos = [
      { id: "a", caption: "One" },
      { id: "b", caption: "Two" },
    ];
    expect(pickNextWhyPhoto(photos, "a")?.id).toBe("b");
    expect(pickNextWhyPhoto(photos, "b")?.id).toBe("a");
    expect(pickNextWhyPhoto([{ id: "a", caption: "One" }], "a")?.id).toBe("a");
  });
});
