import {
  getCoachNoFilterLabel,
  getHardTruthTagPhrase,
  HARD_TRUTHS_COPY,
  quoteHardTruthCaption,
} from "./hardTruths";

describe("hard truths presentation", () => {
  test("uses the member-owned Hard Truths copy", () => {
    expect(HARD_TRUTHS_COPY.title).toBe("You said this mattered. So look at it.");
    expect(HARD_TRUTHS_COPY.subtitle).toBe(
      "Your photos. Your words. No system-generated captions, just what you told us was the point.",
    );
    expect(HARD_TRUTHS_COPY.yourCallEyebrow).toBe("Your call, not ours");
    expect(HARD_TRUTHS_COPY.yourCallBody).toBe(
      "Pick whatever photos actually move you, a moment you're proud of, or one you never want to see again. Either works. You choose the photo, you choose the tag, you write the caption. We don't generate any of it.",
    );
    expect(HARD_TRUTHS_COPY.photosTitle).toBe("Your photos, your captions");
    expect(HARD_TRUTHS_COPY.addBody).toBe(
      "Add a photo: proud of it, or never want to repeat it, your call. Tag it, then write your own caption.",
    );
    expect(HARD_TRUTHS_COPY.proud).toBe("Proud of this");
    expect(HARD_TRUTHS_COPY.never).toBe("Never again");
    expect(HARD_TRUTHS_COPY.upload).toBe("Upload photo");
    expect(HARD_TRUTHS_COPY.footnote).toBe(
      "Every photo, every tag, and every caption here is chosen and written by you. Nothing is generated for you, and nothing here judges how you look, only what you told us it means to you.",
    );
    expect(HARD_TRUTHS_COPY.backOnTrack).toBe("Okay. Back on track");
    expect(HARD_TRUTHS_COPY.coachDefault).toBe(
      "You picked these photos. You wrote those words. Nobody's making you look, you already decided this was worth looking at. So look. Then put the fork down and prove yourself right.",
    );
    expect(HARD_TRUTHS_COPY.subtitle).not.toContain("—");
    expect(HARD_TRUTHS_COPY.yourCallBody).not.toContain("—");
    expect(HARD_TRUTHS_COPY.footnote).not.toContain("—");
    expect(HARD_TRUTHS_COPY.coachDefault).not.toContain("—");
  });

  test("names the picked coach with no filter", () => {
    expect(getCoachNoFilterLabel("Marcus")).toBe("Coach Marcus, no filter");
    expect(getCoachNoFilterLabel("Sam")).toBe("Coach Sam, no filter");
  });

  test("labels tags and quotes the member caption", () => {
    expect(getHardTruthTagPhrase("proud_of_this")).toBe("proud of this");
    expect(getHardTruthTagPhrase("never_again")).toBe("never again");
    expect(
      quoteHardTruthCaption(
        "Walking my daughter down the aisle without stopping to catch my breath.",
      ),
    ).toBe(
      '"Walking my daughter down the aisle without stopping to catch my breath."',
    );
  });
});
