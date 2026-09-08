import { getSupabase } from "../lib/supabase";
import { HOLIDAY_MEAL_SUGGESTIONS } from "../presentation/planned";
import {
  fetchPlannedEventPlan,
  fetchPlannedEventPlans,
  generatePlannedSuggestions,
  removePlannedEventPlan,
  savePlannedEventPlan,
  updatePlannedEventSuggestions,
} from "./plannedSuggestions";

jest.mock("../lib/supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockedGetSupabase = jest.mocked(getSupabase);

const signedInAuth = {
  getUser: jest.fn().mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  }),
};

const row = {
  id: "plan-1",
  event_kind: "holiday_meal",
  custom_label: null,
  suggestions: HOLIDAY_MEAL_SUGGESTIONS,
};

describe("planned suggestions data", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("loads this member's latest active plan", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const limit = jest.fn().mockReturnValue({ maybeSingle });
    const idOrder = jest.fn().mockReturnValue({ limit });
    const createdOrder = jest.fn().mockReturnValue({ order: idOrder });
    const deletedFilter = jest.fn().mockReturnValue({ order: createdOrder });
    const userFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchPlannedEventPlan()).resolves.toEqual(row);
    expect(select).toHaveBeenCalledWith(
      "id, event_kind, custom_label, suggestions",
    );
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("loads this member's active plans oldest first", async () => {
    const other = {
      id: "plan-2",
      event_kind: "other",
      custom_label: "Office dinner",
      suggestions: HOLIDAY_MEAL_SUGGESTIONS,
    };
    const deletedFilter = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: [row, other], error: null }),
    });
    const userFilter = jest.fn().mockReturnValue({ eq: deletedFilter });
    const select = jest.fn().mockReturnValue({ eq: userFilter });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ select }),
    } as never);

    await expect(fetchPlannedEventPlans()).resolves.toEqual([row, other]);
    expect(select).toHaveBeenCalledWith(
      "id, event_kind, custom_label, suggestions",
    );
    expect(userFilter).toHaveBeenCalledWith("user_id", "user-1");
    expect(deletedFilter).toHaveBeenCalledWith("deleted", false);
  });

  test("asks sos-generate with event kind only for a preset", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { status: "succeeded", output: { suggestions: HOLIDAY_MEAL_SUGGESTIONS } },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      functions: { invoke },
    } as never);

    await expect(
      generatePlannedSuggestions({ eventKind: "holiday_meal" }),
    ).resolves.toEqual(HOLIDAY_MEAL_SUGGESTIONS);
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "planned_suggestions",
        input: { event_kind: "holiday_meal" },
      },
    });
    expect(JSON.stringify(invoke.mock.calls[0])).not.toContain("event_label");
  });

  test("sends Other's typed label in the invoke body only", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { status: "succeeded", output: { suggestions: HOLIDAY_MEAL_SUGGESTIONS } },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      functions: { invoke },
    } as never);

    await expect(
      generatePlannedSuggestions({
        eventKind: "other",
        eventLabel: "Office dinner",
      }),
    ).resolves.toEqual(HOLIDAY_MEAL_SUGGESTIONS);
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "planned_suggestions",
        input: { event_kind: "other", event_label: "Office dinner" },
      },
    });
  });

  test("saves a generated plan for the signed-in member", async () => {
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      savePlannedEventPlan({
        eventKind: "holiday_meal",
        suggestions: HOLIDAY_MEAL_SUGGESTIONS,
      }),
    ).resolves.toEqual(row);
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      event_kind: "holiday_meal",
      custom_label: null,
      suggestions: HOLIDAY_MEAL_SUGGESTIONS,
    });
  });

  test("sends already-shown suggestion text only in the invoke body", async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { status: "succeeded", output: { suggestions: HOLIDAY_MEAL_SUGGESTIONS } },
      error: null,
    });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      functions: { invoke },
    } as never);

    await generatePlannedSuggestions({
      eventKind: "holiday_meal",
      avoidTexts: [HOLIDAY_MEAL_SUGGESTIONS[0].text],
    });
    expect(invoke).toHaveBeenCalledWith("sos-generate", {
      body: {
        kind: "planned_suggestions",
        input: {
          event_kind: "holiday_meal",
          avoid_texts: [HOLIDAY_MEAL_SUGGESTIONS[0].text],
        },
      },
    });
  });

  test("soft-deletes this member's saved event", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: "plan-2" }, error: null });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const deletedEq = jest.fn().mockReturnValue({ select });
    const userEq = jest.fn().mockReturnValue({ eq: deletedEq });
    const idEq = jest.fn().mockReturnValue({ eq: userEq });
    const update = jest.fn().mockReturnValue({ eq: idEq });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await removePlannedEventPlan("plan-2");
    expect(update).toHaveBeenCalledWith({
      deleted: true,
      deleted_at: expect.any(String),
    });
  });

  test("replaces suggestions on this member's saved event", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { ...row, suggestions: HOLIDAY_MEAL_SUGGESTIONS },
      error: null,
    });
    const select = jest.fn().mockReturnValue({ maybeSingle });
    const deletedEq = jest.fn().mockReturnValue({ select });
    const userEq = jest.fn().mockReturnValue({ eq: deletedEq });
    const idEq = jest.fn().mockReturnValue({ eq: userEq });
    const update = jest.fn().mockReturnValue({ eq: idEq });
    mockedGetSupabase.mockReturnValue({
      auth: signedInAuth,
      from: jest.fn().mockReturnValue({ update }),
    } as never);

    await expect(
      updatePlannedEventSuggestions("plan-1", HOLIDAY_MEAL_SUGGESTIONS),
    ).resolves.toEqual(row);
    expect(update).toHaveBeenCalledWith({ suggestions: HOLIDAY_MEAL_SUGGESTIONS });
  });
});
